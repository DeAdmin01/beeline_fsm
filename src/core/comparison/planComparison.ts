/**
 * Модуль сравнительной логистической аналитики планов маршрутизации:
 * сопоставление базового алгоритма (FIFO) с интеллектуальным оптимизатором.
 */

import { PlanResult, PlanComparison } from "../types";

/**
 * Вычисляет экономический и логистический эффект от применения оптимизатора:
 * - Сокращение числа задействованных специалистов (парка)
 * - Снижение холостого пробега и ГСМ
 * - Удельная экономия времени в пути на каждый наряд
 * - Прирост уровня соблюдения временных окон клиента (SLA)
 */
export function comparePlans(baseline: PlanResult, optimized: PlanResult): PlanComparison {
  const savedEngineers = baseline.activeEngineersCount - optimized.activeEngineersCount;
  const savedEngineersPercent =
    baseline.activeEngineersCount > 0
      ? Math.round((savedEngineers / baseline.activeEngineersCount) * 100)
      : 0;

  // Нормализованные метрики на один выполненный наряд для честного сопоставления
  const baselineKmPerOrder =
    baseline.assignedOrdersCount > 0
      ? Math.round((baseline.totalDistanceKm / baseline.assignedOrdersCount) * 10) / 10
      : 0;

  const optimizedKmPerOrder =
    optimized.assignedOrdersCount > 0
      ? Math.round((optimized.totalDistanceKm / optimized.assignedOrdersCount) * 10) / 10
      : 0;

  const specificMileageSavingsPercent =
    baselineKmPerOrder > 0
      ? Math.round(((baselineKmPerOrder - optimizedKmPerOrder) / baselineKmPerOrder) * 100)
      : 0;

  const baselineAvgTravelMinPerOrder =
    baseline.assignedOrdersCount > 0
      ? Math.round(baseline.totalTravelTimeMin / baseline.assignedOrdersCount)
      : 0;

  const optimizedAvgTravelMinPerOrder =
    optimized.assignedOrdersCount > 0
      ? Math.round(optimized.totalTravelTimeMin / optimized.assignedOrdersCount)
      : 0;

  const specificTravelTimeSavingsPercent =
    baselineAvgTravelMinPerOrder > 0
      ? Math.round(((baselineAvgTravelMinPerOrder - optimizedAvgTravelMinPerOrder) / baselineAvgTravelMinPerOrder) * 100)
      : 0;

  // Проекция базового пробега на сопоставимый объем заявок
  const projectedBaselineKm = baselineKmPerOrder * optimized.assignedOrdersCount;
  const savedDistanceKm =
    baseline.assignedOrdersCount === optimized.assignedOrdersCount
      ? Math.round((baseline.totalDistanceKm - optimized.totalDistanceKm) * 10) / 10
      : Math.round((projectedBaselineKm - optimized.totalDistanceKm) * 10) / 10;

  const savedDistancePercent =
    projectedBaselineKm > 0
      ? Math.round((savedDistanceKm / projectedBaselineKm) * 100)
      : 0;

  const projectedBaselineTravelMin = baselineAvgTravelMinPerOrder * optimized.assignedOrdersCount;
  const savedTravelTimeMin =
    baseline.assignedOrdersCount === optimized.assignedOrdersCount
      ? baseline.totalTravelTimeMin - optimized.totalTravelTimeMin
      : projectedBaselineTravelMin - optimized.totalTravelTimeMin;

  const savedTravelTimePercent =
    projectedBaselineTravelMin > 0
      ? Math.round((savedTravelTimeMin / projectedBaselineTravelMin) * 100)
      : 0;

  const resolvedOrdersDiff = optimized.assignedOrdersCount - baseline.assignedOrdersCount;
  const slaImprovementPercent = optimized.onTimeRatePercent - baseline.onTimeRatePercent;

  return {
    baseline,
    optimized,
    savedEngineers,
    savedEngineersPercent,
    savedDistanceKm: Math.max(0, savedDistanceKm),
    savedDistancePercent: Math.max(0, savedDistancePercent),
    savedTravelTimeMin: Math.max(0, savedTravelTimeMin),
    savedTravelTimePercent: Math.max(0, savedTravelTimePercent),
    resolvedOrdersDiff,
    baselineKmPerOrder,
    optimizedKmPerOrder,
    specificMileageSavingsPercent,
    baselineAvgTravelMinPerOrder,
    optimizedAvgTravelMinPerOrder,
    specificTravelTimeSavingsPercent,
    slaImprovementPercent
  };
}
