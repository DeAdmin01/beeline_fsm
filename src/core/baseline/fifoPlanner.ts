import { Engineer, Order, PlanResult, EngineerRoute, RouteStop, UnassignedOrder } from "../types";
import { getRoadDistanceKm, estimateTravelTimeMinutes } from "../geo/distance";
import { timeToMinutes, minutesToTime } from "../utils/timeUtils";
import { isEngineerWorkingOnDate, getEffectiveWorkPeriods, findEarliestValidStartTime } from "../utils/scheduleUtils";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", 
  "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16", 
  "#e11d48", "#a855f7"
];

/**
 * Базовый планировщик FIFO в соответствии с требованиями ТЗ:
 * "Заявки обрабатываются по порядку поступления и назначаются первому по порядку
 * во входных данных доступному инженеру, который удовлетворяет обязательным ограничениям;
 * порядок посещения соответствует порядку назначения. Глобальная оптимизация в базовом варианте не выполняется."
 */
export function runBaselineFIFO(
  orders: Order[],
  engineers: Engineer[],
  areaName: string,
  targetDate?: string
): PlanResult {
  const startTimeMs = performance.now();
  // Отбираем только инженеров, дежурящих на целевую дату по графику
  const activeEngineers = engineers.filter((e) => isEngineerWorkingOnDate(e, targetDate));

  // Состояние текущего маршрута инженера в процессе последовательного назначения
  interface EngState {
    engineer: Engineer;
    currentLat: number;
    currentLon: number;
    currentTimeMin: number;
    stops: RouteStop[];
    assignedOrders: Order[];
    totalDistanceKm: number;
    totalTravelTimeMin: number;
    totalWorkTimeMin: number;
    totalWaitTimeMin: number;
  }

  const engStates: Map<string, EngState> = new Map();
  activeEngineers.forEach((eng) => {
    engStates.set(eng.id, {
      engineer: eng,
      currentLat: eng.startDepot.lat,
      currentLon: eng.startDepot.lon,
      currentTimeMin: timeToMinutes(eng.shiftStart),
      stops: [
        {
          id: `start_${eng.id}`,
          isDepot: true,
          stopType: "depot_start",
          lat: eng.startDepot.lat,
          lon: eng.startDepot.lon,
          address: eng.startDepot.address,
          district: eng.startDepot.district,
          arrivalTime: eng.shiftStart,
          startWorkTime: eng.shiftStart,
          endWorkTime: eng.shiftStart,
          travelDistanceKm: 0,
          travelDurationMinutes: 0,
          waitMinutes: 0,
          explanation: `Начало смены инженера в базовом офисе/складе (${eng.startDepot.address})`
        }
      ],
      assignedOrders: [],
      totalDistanceKm: 0,
      totalTravelTimeMin: 0,
      totalWorkTimeMin: 0,
      totalWaitTimeMin: 0
    });
  });

  const unassigned: UnassignedOrder[] = [];

  for (const order of orders) {
    let assigned = false;

    // Проверяем инженеров в строгом исходном порядке входных данных
    for (const eng of activeEngineers) {
      const state = engStates.get(eng.id)!;

      // 1. Проверка квалификации
      if (!eng.skills.includes(order.requiredSkill)) {
        continue;
      }

      // 2. Проверка соответствия транспорта
      if (
        order.requiredTransport !== "Любой" &&
        eng.transport !== order.requiredTransport
      ) {
        continue;
      }

      // 3. Дистанция и время доезда от текущего местоположения инженера
      const distKm = getRoadDistanceKm(
        state.currentLat,
        state.currentLon,
        order.lat,
        order.lon
      );
      const travelMins = estimateTravelTimeMinutes(distKm, eng.transport);
      const arrivalMin = state.currentTimeMin + travelMins;

      // 4. Проверка окна клиента и рабочего интервала инженера
      const winStartMin = timeToMinutes(order.windowStart);
      const winEndMin = timeToMinutes(order.windowEnd);

      const workPeriods = getEffectiveWorkPeriods(eng);
      const startResult = findEarliestValidStartTime(
        arrivalMin,
        winStartMin,
        winEndMin,
        order.durationMinutes,
        workPeriods
      );

      if (!startResult.valid) {
        continue;
      }

      const startWorkMin = startResult.startWorkMin;
      const endWorkMin = startResult.endWorkMin;
      const waitMin = startResult.waitMin;

      // Заявка успешно назначается первому подошедшему инженеру
      const arrivalTimeStr = minutesToTime(arrivalMin);
      const startWorkStr = minutesToTime(startWorkMin);
      const endWorkStr = minutesToTime(endWorkMin);

      state.stops.push({
        id: `stop_${order.id}`,
        isDepot: false,
        stopType: "order",
        order: { ...order, status: "assigned" },
        lat: order.lat,
        lon: order.lon,
        address: order.address,
        district: order.district,
        arrivalTime: arrivalTimeStr,
        startWorkTime: startWorkStr,
        endWorkTime: endWorkStr,
        travelDistanceKm: distKm,
        travelDurationMinutes: travelMins,
        waitMinutes: waitMin,
        explanation: `[Базовый FIFO]: Назначено первому доступному по списку исполнителю (${eng.name}) с навыком "${order.requiredSkill}". Прибытие: ${arrivalTimeStr}, начало: ${startWorkStr}.`
      });

      state.assignedOrders.push({ ...order, status: "assigned" });
      state.currentLat = order.lat;
      state.currentLon = order.lon;
      state.currentTimeMin = endWorkMin;
      state.totalDistanceKm += distKm;
      state.totalTravelTimeMin += travelMins;
      state.totalWorkTimeMin += order.durationMinutes;
      state.totalWaitTimeMin += waitMin;

      assigned = true;
      break;
    }

    if (!assigned) {
      unassigned.push({
        order: { ...order, status: "unassigned" },
        reason: "Нет свободного исполнителя по правилу FIFO, удовлетворяющего квалификации и временному окну"
      });
    }
  }

  // Сборка итоговых маршрутов
  const routes: EngineerRoute[] = [];
  let totalDistAll = 0;
  let totalTravelAll = 0;
  let totalWorkAll = 0;
  let colorIdx = 0;

  engStates.forEach((state) => {
    if (state.assignedOrders.length > 0) {
      const color = PALETTE[colorIdx % PALETTE.length];
      colorIdx++;
      const finishTime = minutesToTime(state.currentTimeMin);
      routes.push({
        engineerId: state.engineer.id,
        engineer: state.engineer,
        stops: state.stops,
        orders: state.assignedOrders,
        totalDistanceKm: Math.round(state.totalDistanceKm * 10) / 10,
        totalTravelTimeMin: state.totalTravelTimeMin,
        totalWorkTimeMin: state.totalWorkTimeMin,
        totalWaitTimeMin: state.totalWaitTimeMin,
        totalOrders: state.assignedOrders.length,
        shiftStart: state.engineer.shiftStart,
        shiftEnd: state.engineer.shiftEnd,
        finishTime,
        isOvertime: state.currentTimeMin > timeToMinutes(state.engineer.shiftEnd),
        color
      });

      totalDistAll += state.totalDistanceKm;
      totalTravelAll += state.totalTravelTimeMin;
      totalWorkAll += state.totalWorkTimeMin;
    }
  });

  const durationMs = Math.round(performance.now() - startTimeMs);
  const assignedCount = orders.length - unassigned.length;
  const onTimeCount = assignedCount; // В строгом базовом алгоритме принимаются только наряды без опозданий

  return {
    planId: `baseline_${Date.now()}`,
    name: "Базовое планирование (FIFO)",
    algorithmType: "baseline_fifo",
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
    executionTimeMs: durationMs
  };
}
