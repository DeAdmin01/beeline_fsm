import {
  Engineer,
  Order,
  PlanResult,
  EngineerRoute,
  RouteStop,
  UnassignedOrder,
  OptimizerSettings,
  DEFAULT_OPTIMIZER_SETTINGS
} from "../types";
import { getDetailedTransitInfo, haversineDistanceKm } from "../geo/distance";
import { timeToMinutes, minutesToTime } from "../utils/timeUtils";
import { isEngineerWorkingOnDate, getEffectiveWorkPeriods, findEarliestValidStartTime } from "../utils/scheduleUtils";

/**
 * Палитра контрастных корпоративных цветов для визуализации маршрутов инженеров на карте и диаграмме Ганта
 */
const PALETTE = [
  "#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777",
  "#0891b2", "#ea580c", "#0d9488", "#4f46e5", "#65a30d",
  "#e11d48", "#9333ea"
];

/**
 * Вариант вставки заявки в существующий маршрут инженера
 */
interface InsertionOption {
  engineerId: string;
  insertIndex: number;
  score: number;
  marginalDistKm: number;
  marginalTravelMin: number;
  isNew: boolean;
  simResult: SimulationResult;
}

/**
 * Результат предварительной симуляции маршрута
 */
interface SimulationResult {
  valid: boolean;
  stops: RouteStop[];
  totalDistKm: number;
  totalTravelMin: number;
  reason?: string;
}

/**
 * Интеллектуальный мультимодальный оптимизатор маршрутов (эвристика Regret-2 + 2-Opt)
 * Учитывает:
 * - График дежурств инженера на целевую дату
 * - Допустимые интервалы работы (смены и перерывы)
 * - Квалификацию инженеров и требования к типу транспорта
 * - Мультимодальный транзит (метрополитен / авто с учетом коэффициента пробок)
 * - Жесткие 2-часовые окна клиентов (SLA)
 * - Кластеризацию по районам и балансировку нагрузки между бригадами
 */
export function runAdvancedOptimizer(
  orders: Order[],
  engineers: Engineer[],
  areaName: string,
  settings: OptimizerSettings = DEFAULT_OPTIMIZER_SETTINGS,
  targetDate?: string
): PlanResult {
  const startTimeMs = performance.now();
  // Отбираем только инженеров, которые работают в указанный день по графику (5/2, 2/2 или кастомному)
  const activeEngineers = engineers.filter((e) => isEngineerWorkingOnDate(e, targetDate));

  const engMap = new Map<string, Engineer>();
  activeEngineers.forEach((e) => engMap.set(e.id, e));

  // Текущий список назначенных заявок для каждого инженера
  const engineerOrders: Map<string, Order[]> = new Map();
  activeEngineers.forEach((e) => engineerOrders.set(e.id, []));

  // Вспомогательная функция: симуляция маршрута и расчет временных меток с проверкой ограничений
  function simulateRoute(
    engineer: Engineer,
    orderList: Order[]
  ): SimulationResult {
    const stops: RouteStop[] = [];
    let currentLat = engineer.startDepot.lat;
    let currentLon = engineer.startDepot.lon;
    let currentTimeMin = timeToMinutes(engineer.shiftStart);

    // Начальная точка маршрута — склад/офис инженера
    stops.push({
      id: `start_${engineer.id}`,
      isDepot: true,
      stopType: "depot_start",
      lat: currentLat,
      lon: currentLon,
      address: engineer.startDepot.address,
      district: engineer.startDepot.district,
      arrivalTime: engineer.shiftStart,
      startWorkTime: engineer.shiftStart,
      endWorkTime: engineer.shiftStart,
      travelDistanceKm: 0,
      travelDurationMinutes: 0,
      waitMinutes: 0,
      explanation: `Выезд со склада/офиса (${engineer.startDepot.address})`
    });

    let totalDist = 0;
    let totalTravel = 0;

    for (let i = 0; i < orderList.length; i++) {
      const order = orderList[i];

      // Проверка квалификации (навыка)
      if (!engineer.skills.includes(order.requiredSkill)) {
        return {
          valid: false,
          stops: [],
          totalDistKm: 0,
          totalTravelMin: 0,
          reason: `Нет требуемой квалификации "${order.requiredSkill}"`
        };
      }

      // Проверка соответствия транспорта
      if (order.requiredTransport !== "Любой" && engineer.transport !== order.requiredTransport) {
        return {
          valid: false,
          stops: [],
          totalDistKm: 0,
          totalTravelMin: 0,
          reason: `Требуется транспорт "${order.requiredTransport}", у инженера "${engineer.transport}"`
        };
      }

      // Детальный расчет транзита (авто с коэффициентом пробок или метро)
      const leg = getDetailedTransitInfo(
        currentLat,
        currentLon,
        order.lat,
        order.lon,
        engineer.transport,
        settings.useMetroTransit
      );

      const arrivalMin = currentTimeMin + leg.durationMinutes;
      const winStartMin = timeToMinutes(order.windowStart);
      const winEndMin = timeToMinutes(order.windowEnd);

      const workPeriods = getEffectiveWorkPeriods(engineer);
      const startResult = findEarliestValidStartTime(
        arrivalMin,
        winStartMin,
        winEndMin,
        order.durationMinutes,
        workPeriods
      );

      if (!startResult.valid) {
        return {
          valid: false,
          stops: [],
          totalDistKm: 0,
          totalTravelMin: 0,
          reason: startResult.reason || "Работа не укладывается в доступные интервалы смены"
        };
      }

      const startWorkMin = startResult.startWorkMin;
      const endWorkMin = startResult.endWorkMin;
      const waitMin = startResult.waitMin;

      stops.push({
        id: `stop_${order.id}`,
        isDepot: false,
        stopType: "order",
        order: { ...order, status: "assigned" },
        lat: order.lat,
        lon: order.lon,
        address: order.address,
        district: order.district,
        arrivalTime: minutesToTime(arrivalMin),
        startWorkTime: minutesToTime(startWorkMin),
        endWorkTime: minutesToTime(endWorkMin),
        travelDistanceKm: leg.distanceKm,
        travelDurationMinutes: leg.durationMinutes,
        waitMinutes: waitMin,
        transitPath: leg.routeCoords,
        transitDescription: leg.description,
        explanation: `Оптимальное назначение [${engineer.name}]: ${leg.description}, окно ${order.windowStart}–${order.windowEnd} соблюдено.`
      });

      totalDist += leg.distanceKm;
      totalTravel += leg.durationMinutes;
      currentLat = order.lat;
      currentLon = order.lon;
      currentTimeMin = endWorkMin;
    }

    return {
      valid: true,
      stops,
      totalDistKm: Math.round(totalDist * 10) / 10,
      totalTravelMin: totalTravel
    };
  }

  // Предварительная сортировка заявок: сначала аварийные/срочные, затем по узости временного окна
  const remainingOrders = [...orders].sort((a, b) => {
    if (a.priority === "urgent" && b.priority !== "urgent") return -1;
    if (a.priority !== "urgent" && b.priority === "urgent") return 1;

    const startA = timeToMinutes(a.windowStart);
    const startB = timeToMinutes(b.windowStart);
    if (startA !== startB) return startA - startB;

    const spanA = timeToMinutes(a.windowEnd) - startA;
    const spanB = timeToMinutes(b.windowEnd) - startB;
    return spanA - spanB;
  });

  const unassigned: UnassignedOrder[] = [];

  // Фаза 1: Эвристика Regret-2 с учетом кластеризации районов, транспорта и балансировки
  while (remainingOrders.length > 0) {
    let bestOrderIdx = -1;
    let bestOverallOption: InsertionOption | null = null;
    let highestRegret = -Infinity;

    for (let oIdx = 0; oIdx < remainingOrders.length; oIdx++) {
      const order = remainingOrders[oIdx];
      const validOptions: InsertionOption[] = [];

      for (const engineer of activeEngineers) {
        if (!engineer.skills.includes(order.requiredSkill)) continue;
        if (order.requiredTransport !== "Любой" && engineer.transport !== order.requiredTransport) continue;

        const currentList = engineerOrders.get(engineer.id) || [];
        const isNew = currentList.length === 0;
        const currentSim = isNew ? { totalDistKm: 0, totalTravelMin: 0 } : simulateRoute(engineer, currentList);

        for (let pos = 0; pos <= currentList.length; pos++) {
          const testList = [...currentList.slice(0, pos), order, ...currentList.slice(pos)];
          const sim = simulateRoute(engineer, testList);

          if (sim.valid) {
            const marginalDist = Math.max(0, sim.totalDistKm - currentSim.totalDistKm);
            const marginalTravel = Math.max(0, sim.totalTravelMin - currentSim.totalTravelMin);

            // 1. Бонус за кластеризацию заявок в одном районе
            let districtBonus = 0;
            const prevOrder = pos > 0 ? currentList[pos - 1] : null;
            const nextOrder = pos < currentList.length ? currentList[pos] : null;

            if (prevOrder && prevOrder.district === order.district) {
              districtBonus -= 8 * (settings.priorityCluster / 5);
            }
            if (nextOrder && nextOrder.district === order.district) {
              districtBonus -= 8 * (settings.priorityCluster / 5);
            }

            // Близость первого адреса к району склада/офиса инженера
            if (pos === 0 && engineer.startDepot.district === order.district) {
              districtBonus -= 5 * (settings.priorityCluster / 5);
            }

            // 2. Штраф за привлечение нового инженера (минимизация задействованного флота)
            const newEngPenalty = isNew ? (25 + settings.priorityFleet * 8) : 0;

            // 3. Штраф за дисбаланс нагрузки (равномерное распределение заявок)
            const balancePenalty = currentList.length * 1.8 * (settings.priorityBalance / 5);

            // Комплексная функция стоимости (чем меньше, тем оптимальнее)
            const score =
              marginalDist * (settings.priorityMileage * 0.9) +
              marginalTravel * 0.4 +
              newEngPenalty +
              districtBonus +
              balancePenalty;

            validOptions.push({
              engineerId: engineer.id,
              insertIndex: pos,
              score,
              marginalDistKm: marginalDist,
              marginalTravelMin: marginalTravel,
              isNew,
              simResult: sim
            });
          }
        }
      }

      if (validOptions.length === 0) {
        // Заявка не может быть добавлена ни к одному активному инженеру без нарушения ограничений
        continue;
      }

      // Сортировка вариантов вставки по возрастанию штрафа
      validOptions.sort((a, b) => a.score - b.score);
      const bestOpt = validOptions[0];

      // Расчет Regret (сожаления): разница между лучшим и вторым лучшим инженером
      let regret = 0;
      const secondBestEngineerOpt = validOptions.find((opt) => opt.engineerId !== bestOpt.engineerId);

      if (secondBestEngineerOpt) {
        regret = secondBestEngineerOpt.score - bestOpt.score;
      } else {
        // Высокое сожаление, если только ОДИН специалист способен выполнить заявку!
        regret = 150;
      }

      // Приоритет для срочных заявок
      if (order.priority === "urgent") {
        regret += 300;
      }

      if (regret > highestRegret) {
        highestRegret = regret;
        bestOrderIdx = oIdx;
        bestOverallOption = bestOpt;
      }
    }

    if (bestOrderIdx !== -1 && bestOverallOption) {
      const selectedOrder = remainingOrders.splice(bestOrderIdx, 1)[0];
      const list = engineerOrders.get(bestOverallOption.engineerId)!;
      list.splice(bestOverallOption.insertIndex, 0, selectedOrder);
    } else {
      // Заявки, которые не удалось распределить без нарушения временных окон и смен
      const unplacedOrder = remainingOrders.shift()!;
      unassigned.push({
        order: { ...unplacedOrder, status: "unassigned" },
        reason: "Окна клиентов и лимиты рабочих смен дежурных специалистов исчерпаны"
      });
    }
  }

  // Фаза 2: Локальная оптимизация 2-Opt (распутывание самопересечений маршрутов инженеров)
  activeEngineers.forEach((engineer) => {
    const list = engineerOrders.get(engineer.id)!;
    if (list.length < 3) return;

    let improved = true;
    let passes = 0;

    while (improved && passes < 10) {
      improved = false;
      passes++;

      for (let i = 0; i < list.length - 1; i++) {
        for (let j = i + 1; j < list.length; j++) {
          // Инвертируем подсегмент [i..j]
          const testList = [
            ...list.slice(0, i),
            ...list.slice(i, j + 1).reverse(),
            ...list.slice(j + 1)
          ];

          const currentSim = simulateRoute(engineer, list);
          const testSim = simulateRoute(engineer, testList);

          if (testSim.valid && testSim.totalDistKm < currentSim.totalDistKm - 0.2) {
            list.splice(0, list.length, ...testList);
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
  });

  // Фаза 3: Формирование итоговых маршрутов и агрегированной аналитики
  const routes: EngineerRoute[] = [];
  let totalDistAll = 0;
  let totalTravelAll = 0;
  let totalWorkAll = 0;
  let totalWaitAll = 0;
  let colorIdx = 0;

  activeEngineers.forEach((engineer) => {
    const ordersInRoute = engineerOrders.get(engineer.id) || [];
    if (ordersInRoute.length > 0) {
      const finalSim = simulateRoute(engineer, ordersInRoute);
      if (finalSim.valid) {
        const color = PALETTE[colorIdx % PALETTE.length];
        colorIdx++;

        const lastStop = finalSim.stops[finalSim.stops.length - 1];
        const finishTime = lastStop ? lastStop.endWorkTime : engineer.shiftStart;

        let workTime = 0;
        let waitTime = 0;
        finalSim.stops.forEach((s) => {
          if (s.order) workTime += s.order.durationMinutes;
          waitTime += s.waitMinutes;
        });

        routes.push({
          engineerId: engineer.id,
          engineer,
          stops: finalSim.stops,
          orders: ordersInRoute,
          totalDistanceKm: finalSim.totalDistKm,
          totalTravelTimeMin: finalSim.totalTravelMin,
          totalWorkTimeMin: workTime,
          totalWaitTimeMin: waitTime,
          totalOrders: ordersInRoute.length,
          shiftStart: engineer.shiftStart,
          shiftEnd: engineer.shiftEnd,
          finishTime,
          isOvertime: timeToMinutes(finishTime) > timeToMinutes(engineer.shiftEnd),
          color
        });

        totalDistAll += finalSim.totalDistKm;
        totalTravelAll += finalSim.totalTravelMin;
        totalWorkAll += workTime;
        totalWaitAll += waitTime;
      }
    }
  });

  const durationMs = Math.round(performance.now() - startTimeMs);
  const assignedCount = orders.length - unassigned.length;
  const onTimeCount = assignedCount;

  return {
    planId: `opt_${Date.now()}`,
    name: "Интеллектуальный план (Мультимодальный VRP-SLA)",
    algorithmType: "advanced_optimizer",
    area: areaName,
    routes,
    unassignedOrders: unassigned,
    activeEngineersCount: routes.length,
    totalDistanceKm: Math.round(totalDistAll * 10) / 10,
    totalTravelTimeMin: totalTravelAll,
    totalWorkTimeMin: totalWorkAll,
    totalOrders: orders.length,
    assignedOrdersCount: assignedCount,
    onTimeOrdersCount: onTimeCount,
    onTimeRatePercent: orders.length > 0 ? Math.round((onTimeCount / orders.length) * 100) : 100,
    generatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    executionTimeMs: durationMs,
    optimizerSettings: settings
  };
}
