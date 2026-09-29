/**
 * Модуль оперативного диспетчерского реагирования (симулятор рабочего дня).
 * Обрабатывает динамические события в реальном времени:
 * 1. Экстренное поступление аварии (NOC) с правилом неразрывности текущей работы.
 * 2. Снятие / отмена наряда по звонку абонента с уплотнением графика.
 * 3. Форс-мажор / сход специалиста с линии (поломка, болезнь) с перехватом нарядов.
 */

import {
  PlanResult,
  Order,
  Engineer,
  PlanDiffItem,
  RouteStop,
  EngineerRoute,
  UnassignedOrder
} from "../types";
import { timeToMinutes, minutesToTime } from "../utils/timeUtils";
import { getRoadDistanceKm, estimateTravelTimeMinutes } from "../geo/distance";

export class IncidentManager {
  /**
   * Сценарий 1: Экстренная авария поступает в момент currentTimeStr
   * Жесткое правило регламента: если специалист уже выполняет наряд на объекте,
   * он ОБЯЗАН завершить его! Прерывать начатую работу запрещено.
   */
  static handleEmergencyIncident(
    currentPlan: PlanResult,
    emergencyOrder: Order,
    currentTimeStr: string,
    engineers: Engineer[]
  ): { updatedPlan: PlanResult; diffs: PlanDiffItem[] } {
    const currentMin = timeToMinutes(currentTimeStr);
    const diffs: PlanDiffItem[] = [];

    // Индексация специалистов
    const engMap = new Map<string, Engineer>();
    engineers.forEach((e) => engMap.set(e.id, e));

    let bestEngineerId: string | null = null;
    let bestArrivalMin = Infinity;
    let bestRouteStops: RouteStop[] | null = null;

    // Оцениваем каждого специалиста с допуском к аварийным работам
    for (const route of currentPlan.routes) {
      const eng = engMap.get(route.engineerId);
      if (!eng || !eng.isActive) continue;
      if (!eng.skills.includes("Аварийные работы")) continue;

      // Определение состояния инженера в момент времени currentTimeStr
      let readyMin = currentMin;
      let readyLat = eng.startDepot.lat;
      let readyLon = eng.startDepot.lon;
      const lockedStops: RouteStop[] = [];
      const pendingStops: RouteStop[] = [];

      for (const stop of route.stops) {
        const startMin = timeToMinutes(stop.startWorkTime);
        const endMin = timeToMinutes(stop.endWorkTime);

        if (endMin <= currentMin) {
          // Уже завершенный наряд
          lockedStops.push(stop);
          readyLat = stop.lat;
          readyLon = stop.lon;
          readyMin = Math.max(readyMin, endMin);
        } else if (startMin <= currentMin && currentMin < endMin) {
          // НАХОДИТСЯ В ПРОЦЕССЕ ВЫПОЛНЕНИЯ: прерывать запрещено регламентом!
          lockedStops.push(stop);
          readyLat = stop.lat;
          readyLon = stop.lon;
          readyMin = endMin; // специалист освободится только после сдачи текущей заявки
        } else {
          // Будущий наряд в очереди, который можно сдвинуть
          pendingStops.push(stop);
        }
      }

      // Расчет доезда до места аварии
      const distToEmergency = getRoadDistanceKm(readyLat, readyLon, emergencyOrder.lat, emergencyOrder.lon);
      const travelToEmergency = estimateTravelTimeMinutes(distToEmergency, eng.transport);
      const arrivalAtEmergency = readyMin + travelToEmergency;

      // Проверка окончания работ до закрытия смены инженера
      const emergencyEndMin = arrivalAtEmergency + emergencyOrder.durationMinutes;
      const shiftEndMin = timeToMinutes(eng.shiftEnd);

      if (emergencyEndMin <= shiftEndMin && arrivalAtEmergency < bestArrivalMin) {
        // Формируем новую цепочку: завершенные -> АВАРИЯ -> сдвинутые будущие наряды
        const emergencyStop: RouteStop = {
          id: `stop_${emergencyOrder.id}`,
          isDepot: false,
          stopType: "order",
          order: { ...emergencyOrder, priority: "urgent", status: "assigned" },
          lat: emergencyOrder.lat,
          lon: emergencyOrder.lon,
          address: emergencyOrder.address,
          district: emergencyOrder.district,
          arrivalTime: minutesToTime(arrivalAtEmergency),
          startWorkTime: minutesToTime(arrivalAtEmergency),
          endWorkTime: minutesToTime(emergencyEndMin),
          travelDistanceKm: distToEmergency,
          travelDurationMinutes: travelToEmergency,
          waitMinutes: 0,
          explanation: `[Экстренное перепланирование]: Направлен на срочную аварию в ${currentTimeStr}. Прибытие в ${minutesToTime(arrivalAtEmergency)}. Текущая работа не прерывалась.`
        };

        // Проверяем, успевает ли специалист выполнить оставшиеся заявки
        let testCurrentLat = emergencyOrder.lat;
        let testCurrentLon = emergencyOrder.lon;
        let testTimeMin = emergencyEndMin;
        const validPendingStops: RouteStop[] = [];
        let canFitAll = true;

        for (const pStop of pendingStops) {
          if (!pStop.order) continue;
          const dist = getRoadDistanceKm(testCurrentLat, testCurrentLon, pStop.lat, pStop.lon);
          const travel = estimateTravelTimeMinutes(dist, eng.transport);
          const arrival = testTimeMin + travel;
          const winStart = timeToMinutes(pStop.order.windowStart);
          const startWork = Math.max(arrival, winStart);
          const endWork = startWork + pStop.order.durationMinutes;

          if (endWork <= shiftEndMin) {
            validPendingStops.push({
              ...pStop,
              arrivalTime: minutesToTime(arrival),
              startWorkTime: minutesToTime(startWork),
              endWorkTime: minutesToTime(endWork),
              travelDistanceKm: dist,
              travelDurationMinutes: travel,
              waitMinutes: Math.max(0, winStart - arrival),
              explanation: `[Сдвиг графика]: Перенесено из-за приоритетной аварии. Новое время: ${minutesToTime(startWork)}.`
            });
            testCurrentLat = pStop.lat;
            testCurrentLon = pStop.lon;
            testTimeMin = endWork;
          } else {
            canFitAll = false;
            break;
          }
        }

        if (canFitAll) {
          bestArrivalMin = arrivalAtEmergency;
          bestEngineerId = eng.id;
          bestRouteStops = [...lockedStops, emergencyStop, ...validPendingStops];
        }
      }
    }

    if (bestEngineerId && bestRouteStops) {
      const targetEng = engMap.get(bestEngineerId)!;
      diffs.push({
        orderId: emergencyOrder.id,
        orderAddress: emergencyOrder.address,
        changeType: "added",
        newEngineer: targetEng.name,
        newTime: minutesToTime(bestArrivalMin),
        reason: `Срочная авария назначена ближайшему свободному инженеру (${targetEng.name}) с квалификацией "Аварийные работы"`
      });

      // Обновляем маршруты в плане
      const updatedRoutes = currentPlan.routes.map((r) => {
        if (r.engineerId === bestEngineerId) {
          const orders = bestRouteStops!
            .filter((s) => s.order)
            .map((s) => s.order!);

          let totalDist = 0;
          let totalTravel = 0;
          let totalWork = 0;
          bestRouteStops!.forEach((s) => {
            totalDist += s.travelDistanceKm;
            totalTravel += s.travelDurationMinutes;
            if (s.order) totalWork += s.order.durationMinutes;
          });

          const lastStop = bestRouteStops![bestRouteStops!.length - 1];

          return {
            ...r,
            stops: bestRouteStops!,
            orders,
            totalDistanceKm: Math.round(totalDist * 10) / 10,
            totalTravelTimeMin: totalTravel,
            totalWorkTimeMin: totalWork,
            totalOrders: orders.length,
            finishTime: lastStop ? lastStop.endWorkTime : r.finishTime
          };
        }
        return r;
      });

      return {
        updatedPlan: {
          ...currentPlan,
          planId: `replan_${Date.now()}`,
          name: `${currentPlan.name} (После добавления аварии в ${currentTimeStr})`,
          routes: updatedRoutes,
          assignedOrdersCount: currentPlan.assignedOrdersCount + 1,
          totalOrders: currentPlan.totalOrders + 1
        },
        diffs
      };
    }

    // Если аварию не удалось встроить в существующие маршруты
    diffs.push({
      orderId: emergencyOrder.id,
      orderAddress: emergencyOrder.address,
      changeType: "unassigned",
      reason: "Все квалифицированные инженеры заняты до конца смены или не успевают доехать"
    });

    return {
      updatedPlan: {
        ...currentPlan,
        unassignedOrders: [
          ...currentPlan.unassignedOrders,
          {
            order: emergencyOrder,
            reason: `Срочная заявка в ${currentTimeStr} не может быть выполнена из-за исчерпания смен инженеров`
          }
        ]
      },
      diffs
    };
  }

  /**
   * Сценарий 2: Отмена существующего наряда клиентом (звонок в контакт-центр)
   */
  static handleCancelOrder(
    currentPlan: PlanResult,
    orderIdToCancel: string
  ): { updatedPlan: PlanResult; diffs: PlanDiffItem[] } {
    const diffs: PlanDiffItem[] = [];
    let cancelledOrder: Order | null = null;
    let affectedEngName = "";

    const updatedRoutes = currentPlan.routes.map((route) => {
      const hasOrder = route.orders.some((o) => o.id === orderIdToCancel);
      if (!hasOrder) return route;

      const newStops: RouteStop[] = [];
      let currentLat = route.engineer.startDepot.lat;
      let currentLon = route.engineer.startDepot.lon;
      let currentTimeMin = timeToMinutes(route.engineer.shiftStart);

      for (const stop of route.stops) {
        if (stop.order?.id === orderIdToCancel) {
          cancelledOrder = stop.order;
          affectedEngName = route.engineer.name;
          continue; // Исключаем отмененный наряд
        }

        if (stop.isDepot) {
          newStops.push(stop);
          continue;
        }

        const dist = getRoadDistanceKm(currentLat, currentLon, stop.lat, stop.lon);
        const travel = estimateTravelTimeMinutes(dist, route.engineer.transport);
        const arrival = currentTimeMin + travel;
        const winStart = timeToMinutes(stop.order!.windowStart);
        const startWork = Math.max(arrival, winStart);
        const endWork = startWork + stop.order!.durationMinutes;

        newStops.push({
          ...stop,
          arrivalTime: minutesToTime(arrival),
          startWorkTime: minutesToTime(startWork),
          endWorkTime: minutesToTime(endWork),
          travelDistanceKm: dist,
          travelDurationMinutes: travel,
          waitMinutes: Math.max(0, winStart - arrival),
          explanation: `[Маршрут уплотнен]: Время подтянуто после отмены заявки #${orderIdToCancel}.`
        });

        currentLat = stop.lat;
        currentLon = stop.lon;
        currentTimeMin = endWork;
      }

      let totalDist = 0;
      let totalTravel = 0;
      let totalWork = 0;
      newStops.forEach((s) => {
        totalDist += s.travelDistanceKm;
        totalTravel += s.travelDurationMinutes;
        if (s.order) totalWork += s.order.durationMinutes;
      });

      const remainingOrders = route.orders.filter((o) => o.id !== orderIdToCancel);
      const lastStop = newStops[newStops.length - 1];

      return {
        ...route,
        stops: newStops,
        orders: remainingOrders,
        totalDistanceKm: Math.round(totalDist * 10) / 10,
        totalTravelTimeMin: totalTravel,
        totalWorkTimeMin: totalWork,
        totalOrders: remainingOrders.length,
        finishTime: lastStop ? lastStop.endWorkTime : route.shiftStart
      };
    });

    if (cancelledOrder) {
      diffs.push({
        orderId: orderIdToCancel,
        orderAddress: (cancelledOrder as Order).address,
        changeType: "cancelled",
        previousEngineer: affectedEngName,
        reason: `Заявка отменена абонентом. Маршрут инженера ${affectedEngName} скорректирован и уплотнен.`
      });
    }

    return {
      updatedPlan: {
        ...currentPlan,
        planId: `cancel_${Date.now()}`,
        name: `${currentPlan.name} (После отмены заявки #${orderIdToCancel})`,
        routes: updatedRoutes,
        assignedOrdersCount: Math.max(0, currentPlan.assignedOrdersCount - 1)
      },
      diffs
    };
  }

  /**
   * Сценарий 3: Сход специалиста с линии (болезнь, поломка транспорта, ДТП)
   * Оставшиеся невыполненные наряды автоматически перераспределяются между соседними бригадами
   */
  static handleEngineerUnavailable(
    currentPlan: PlanResult,
    engineerId: string,
    currentTimeStr: string,
    engineers: Engineer[]
  ): { updatedPlan: PlanResult; diffs: PlanDiffItem[] } {
    const diffs: PlanDiffItem[] = [];
    const currentMin = timeToMinutes(currentTimeStr);

    const affectedRoute = currentPlan.routes.find((r) => r.engineerId === engineerId);
    if (!affectedRoute) {
      return { updatedPlan: currentPlan, diffs };
    }

    // Разделяем остановки: уже выполненные vs оставшиеся наряды
    const preservedStops: RouteStop[] = [];
    const orphanedOrders: Order[] = [];

    affectedRoute.stops.forEach((stop) => {
      const endMin = timeToMinutes(stop.endWorkTime);
      if (endMin <= currentMin) {
        preservedStops.push(stop);
      } else {
        if (stop.order) {
          orphanedOrders.push(stop.order);
        }
      }
    });

    diffs.push({
      orderId: `eng_${engineerId}`,
      orderAddress: `Инженер: ${affectedRoute.engineer.name}`,
      changeType: "cancelled",
      previousEngineer: affectedRoute.engineer.name,
      reason: `Инженер ${affectedRoute.engineer.name} сошел с линии в ${currentTimeStr} (недоступен). Перераспределение ${orphanedOrders.length} заявок.`
    });

    // Перераспределяем оставшиеся наряды между другими активными бригадами
    const remainingRoutes = currentPlan.routes.filter((r) => r.engineerId !== engineerId);
    const unassigned: UnassignedOrder[] = [...currentPlan.unassignedOrders];

    for (const orphan of orphanedOrders) {
      let reassigned = false;

      for (let i = 0; i < remainingRoutes.length; i++) {
        const r = remainingRoutes[i];
        if (!r.engineer.skills.includes(orphan.requiredSkill)) continue;
        if (orphan.requiredTransport !== "Любой" && r.engineer.transport !== orphan.requiredTransport) continue;

        // Проверяем возможность добавления наряда в конец маршрута
        const lastStop = r.stops[r.stops.length - 1];
        const dist = getRoadDistanceKm(lastStop.lat, lastStop.lon, orphan.lat, orphan.lon);
        const travel = estimateTravelTimeMinutes(dist, r.engineer.transport);
        const readyTime = Math.max(currentMin, timeToMinutes(lastStop.endWorkTime));
        const arrival = readyTime + travel;
        const winStart = timeToMinutes(orphan.windowStart);
        const startWork = Math.max(arrival, winStart);
        const endWork = startWork + orphan.durationMinutes;
        const shiftEnd = timeToMinutes(r.shiftEnd);

        if (endWork <= shiftEnd) {
          const newStop: RouteStop = {
            id: `stop_${orphan.id}`,
            isDepot: false,
            stopType: "order",
            order: { ...orphan, status: "assigned" },
            lat: orphan.lat,
            lon: orphan.lon,
            address: orphan.address,
            district: orphan.district,
            arrivalTime: minutesToTime(arrival),
            startWorkTime: minutesToTime(startWork),
            endWorkTime: minutesToTime(endWork),
            travelDistanceKm: dist,
            travelDurationMinutes: travel,
            waitMinutes: Math.max(0, winStart - arrival),
            explanation: `[Переназначение]: Передана от сошедшего с линии инженера ${affectedRoute.engineer.name}. Назначен ${r.engineer.name}.`
          };

          r.stops.push(newStop);
          r.orders.push(orphan);
          r.totalDistanceKm = Math.round((r.totalDistanceKm + dist) * 10) / 10;
          r.totalTravelTimeMin += travel;
          r.totalWorkTimeMin += orphan.durationMinutes;
          r.totalOrders = r.orders.length;
          r.finishTime = minutesToTime(endWork);

          diffs.push({
            orderId: orphan.id,
            orderAddress: orphan.address,
            changeType: "reassigned",
            previousEngineer: affectedRoute.engineer.name,
            newEngineer: r.engineer.name,
            newTime: minutesToTime(startWork),
            reason: `Заявка успешно перехвачена инженером ${r.engineer.name}`
          });

          reassigned = true;
          break;
        }
      }

      if (!reassigned) {
        unassigned.push({
          order: { ...orphan, status: "unassigned" },
          reason: `После схода с линии инженера ${affectedRoute.engineer.name} у других бригад не осталось свободного времени`
        });
        diffs.push({
          orderId: orphan.id,
          orderAddress: orphan.address,
          changeType: "unassigned",
          previousEngineer: affectedRoute.engineer.name,
          reason: "Не удалось перераспределить заявку из-за загруженности других бригад"
        });
      }
    }

    // Сохраняем уже выполненные остановки сошедшего инженера в отчетности
    if (preservedStops.length > 1) {
      remainingRoutes.push({
        ...affectedRoute,
        stops: preservedStops,
        orders: preservedStops.filter((s) => s.order).map((s) => s.order!),
        totalOrders: preservedStops.filter((s) => s.order).length,
        finishTime: currentTimeStr
      });
    }

    return {
      updatedPlan: {
        ...currentPlan,
        planId: `unavail_${Date.now()}`,
        name: `${currentPlan.name} (После схода инженера ${affectedRoute.engineer.name})`,
        routes: remainingRoutes,
        unassignedOrders: unassigned
      },
      diffs
    };
  }
}
