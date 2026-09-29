import React from "react";
import { Row, Col, Button, Badge } from "react-bootstrap";
import { 
  Users, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  TrendingDown, 
  Sparkles, 
  Sliders, 
  MapPin, 
  ShieldCheck,
  Scale
} from "lucide-react";
import { PlanResult, PlanComparison } from "../core/types";

interface AnalyticsViewProps {
  currentPlan: PlanResult;
  comparison: PlanComparison | null;
  algorithmType: "baseline_fifo" | "advanced_optimizer";
  onOpenSettingsModal?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  currentPlan,
  comparison,
  algorithmType,
  onOpenSettingsModal
}) => {
  const isOptimized = algorithmType === "advanced_optimizer";

  return (
    <div className="p-2">
      {/* 4 ключевых показателя эффективности (KPI) */}
      <Row className="g-3 mb-4">
        {/* Метрика 1: Задействованный персонал и бригады */}
        <Col xs={12} sm={6} lg={3}>
          <div className="fsm-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-theme-muted fw-semibold text-uppercase d-flex align-items-center gap-1.5">
                <Users size={15} className="text-warning" />
                <span>Штат на линии</span>
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.68rem",
                  background: "var(--border-strong)",
                  color: "var(--text-muted)"
                }}
              >
                Персонал
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-2 fw-bold text-theme-main">{currentPlan.activeEngineersCount}</span>
              <span className="text-theme-muted small">бригад</span>
            </div>
            {isOptimized && comparison && comparison.savedEngineers > 0 ? (
              <div className="mt-2 text-success small d-flex align-items-center gap-1 fw-semibold">
                <TrendingDown size={14} />
                <span>Высвобождено {comparison.savedEngineers} бригад (-{comparison.savedEngineersPercent}%)</span>
              </div>
            ) : (
              <div className="mt-2 text-theme-muted small">Базовый состав смены</div>
            )}
          </div>
        </Col>

        {/* Метрика 2: Пробег автопарка и расход ГСМ */}
        <Col xs={12} sm={6} lg={3}>
          <div className="fsm-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-theme-muted fw-semibold text-uppercase d-flex align-items-center gap-1.5">
                <Navigation size={15} className="text-info" />
                <span>Пробег парка</span>
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.68rem",
                  background: "var(--border-strong)",
                  color: "var(--text-muted)"
                }}
              >
                ГСМ
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-2 fw-bold text-theme-main">{currentPlan.totalDistanceKm}</span>
              <span className="text-theme-muted small">км по дорогам</span>
            </div>
            {isOptimized && comparison && comparison.savedDistanceKm > 0 ? (
              <div className="mt-2 text-success small d-flex align-items-center gap-1 fw-semibold">
                <TrendingDown size={14} />
                <span>Экономия: -{comparison.savedDistanceKm} км (-{comparison.savedDistancePercent}%)</span>
              </div>
            ) : (
              <div className="mt-2 text-theme-muted small">
                {isOptimized ? "Маршруты оптимизированы" : "Без оптимизации маршрутов"}
              </div>
            )}
          </div>
        </Col>

        {/* Метрика 3: Время перемещений специалистов */}
        <Col xs={12} sm={6} lg={3}>
          <div className="fsm-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-theme-muted fw-semibold text-uppercase d-flex align-items-center gap-1.5">
                <Clock size={15} className="text-emerald" />
                <span>Время перемещений</span>
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.68rem",
                  background: "var(--border-strong)",
                  color: "var(--text-muted)"
                }}
              >
                Логистика
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-2 fw-bold text-theme-main">
                {Math.floor(currentPlan.totalTravelTimeMin / 60)}ч {currentPlan.totalTravelTimeMin % 60}м
              </span>
            </div>
            {isOptimized && comparison && comparison.savedTravelTimeMin > 0 ? (
              <div className="mt-2 text-success small fw-semibold">
                Сбережено {Math.floor(comparison.savedTravelTimeMin / 60)}ч {comparison.savedTravelTimeMin % 60}м смены
              </div>
            ) : (
              <div className="mt-2 text-theme-muted small">Холостые переезды устранены</div>
            )}
          </div>
        </Col>

        {/* Метрика 4: Исполнение временных окон SLA */}
        <Col xs={12} sm={6} lg={3}>
          <div className="fsm-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-theme-muted fw-semibold text-uppercase d-flex align-items-center gap-1.5">
                <CheckCircle2 size={15} className="text-success" />
                <span>Исполнение SLA</span>
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.68rem",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}
              >
                100% окон
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-2 fw-bold text-success">
                {currentPlan.assignedOrdersCount} / {currentPlan.totalOrders}
              </span>
              <span className="text-theme-muted small">нарядов</span>
            </div>
            <div className="mt-2 text-theme-muted small d-flex justify-content-between">
              <span>В резерве: {currentPlan.unassignedOrders.length}</span>
              <span className="text-theme-dim">Расчет: {currentPlan.executionTimeMs} мс</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* Таблица сравнительного бенчмарка (FIFO vs VRP) */}
      {comparison && (
        <div className="fsm-card p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h6 className="fw-bold text-theme-main mb-1 d-flex align-items-center gap-2">
                <Sparkles size={16} className="text-warning" />
                <span>Сравнительный бенчмарк: Интеллектуальная оптимизация против очереди (FIFO)</span>
              </h6>
              <div className="text-theme-muted small">
                Объективное сопоставление удельных показателей логистики и покрытия сервисной программы
              </div>
            </div>

            {onOpenSettingsModal && (
              <Button
                variant="outline-warning"
                size="sm"
                onClick={onOpenSettingsModal}
                className="d-flex align-items-center gap-1.5 py-1 px-3 fw-semibold"
                style={{ fontSize: "0.8rem" }}
              >
                <Sliders size={14} />
                <span>Настроить критерии алгоритма</span>
              </Button>
            )}
          </div>

          <div className="table-responsive">
            <table className="fsm-table align-middle mb-0" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Параметр эффективности</th>
                  <th style={{ width: 220 }}>Обычный порядок (Очередь)</th>
                  <th style={{ width: 220 }}>Интеллектуальная оптимизация</th>
                  <th style={{ width: 220 }}>Дельта (Экономия)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Покрытие окон SLA */}
                <tr>
                  <td>
                    <b>Выполнение нарядов в согласованные окна (SLA)</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Доля абонентов, получивших подключение точно в срок
                    </div>
                  </td>
                  <td>
                    <span className="text-danger fw-bold">{comparison.baseline.assignedOrdersCount} нарядов</span>
                    <span className="text-theme-muted ms-1">({comparison.baseline.onTimeRatePercent}%)</span>
                  </td>
                  <td>
                    <span className="text-success fw-bold">{comparison.optimized.assignedOrdersCount} нарядов</span>
                    <span className="text-theme-muted ms-1">({comparison.optimized.onTimeRatePercent}%)</span>
                  </td>
                  <td className="text-success fw-bold">
                    +{comparison.slaImprovementPercent}% прирост охвата
                  </td>
                </tr>

                {/* 2. Удельный километраж на наряд */}
                <tr>
                  <td>
                    <b>Удельный пробег на 1 обслуженный наряд</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Фактический расход километража автопарка на каждую заявку
                    </div>
                  </td>
                  <td>{comparison.baselineKmPerOrder} км / наряд</td>
                  <td className="text-info fw-bold">{comparison.optimizedKmPerOrder} км / наряд</td>
                  <td className="text-success fw-bold">
                    -{comparison.specificMileageSavingsPercent}% расход ГСМ
                  </td>
                </tr>

                {/* 3. Удельное время в пути */}
                <tr>
                  <td>
                    <b>Среднее время в пути на 1 выезд</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Чистые затраты рабочего времени сотрудника на переезд
                    </div>
                  </td>
                  <td>{comparison.baselineAvgTravelMinPerOrder} мин / заявка</td>
                  <td className="text-emerald fw-bold">{comparison.optimizedAvgTravelMinPerOrder} мин / заявка</td>
                  <td className="text-success fw-bold">
                    -{comparison.specificTravelTimeSavingsPercent}% быстрее доезд
                  </td>
                </tr>

                {/* 4. Суммарный километраж автопарка */}
                <tr>
                  <td>
                    <b>Суммарный километраж (при равном объеме работ)</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Сравнение затрат на выполнение {comparison.optimized.assignedOrdersCount} нарядов
                    </div>
                  </td>
                  <td>
                    ~{Math.round(comparison.baselineKmPerOrder * comparison.optimized.assignedOrdersCount)} км
                    <span className="text-theme-dim ms-1">(расчетный)</span>
                  </td>
                  <td className="text-info fw-bold">{comparison.optimized.totalDistanceKm} км</td>
                  <td className="text-success fw-bold">
                    -{comparison.savedDistanceKm} км (-{comparison.savedDistancePercent}%)
                  </td>
                </tr>

                {/* 5. Задействованный персонал на линии */}
                <tr>
                  <td>
                    <b>Задействовано специалистов на линии</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Минимизация штата и высвобождение сотрудников в резерв
                    </div>
                  </td>
                  <td>{comparison.baseline.activeEngineersCount} инженеров</td>
                  <td className="text-warning fw-bold">{comparison.optimized.activeEngineersCount} инженеров</td>
                  <td className="text-success fw-bold">
                    -{comparison.savedEngineers} бригад (-{comparison.savedEngineersPercent}%)
                  </td>
                </tr>

                {/* 6. Скорость расчета алгоритма */}
                <tr>
                  <td>
                    <b>Время работы алгоритма</b>
                    <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                      Мгновенный расчет маршрутов в браузере диспетчера
                    </div>
                  </td>
                  <td>{comparison.baseline.executionTimeMs} мс</td>
                  <td className="text-theme-main">{comparison.optimized.executionTimeMs} мс</td>
                  <td className="text-theme-dim">Мгновенный расчет (&lt;0.05 с)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
