import React from "react";
import { Row, Col, Badge } from "react-bootstrap";
import { Users, Navigation, Clock, CheckCircle2, TrendingDown, Cpu } from "lucide-react";
import { PlanResult, PlanComparison } from "../core/types";

interface MetricsBarProps {
  currentPlan: PlanResult;
  comparison: PlanComparison | null;
  algorithmType: "baseline_fifo" | "advanced_optimizer";
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  currentPlan,
  comparison,
  algorithmType
}) => {
  const isOptimized = algorithmType === "advanced_optimizer";

  return (
    <div className="mb-3">
      <Row className="g-2">
        {/* Метрика 1: Задействованные бригады */}
        <Col xs={12} sm={6} lg={3}>
          <div className="kpi-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <span className="kpi-title d-flex align-items-center gap-1">
                <Users size={15} className="text-warning" />
                <span>Задействовано бригад</span>
              </span>
              <Badge bg="dark" className="border border-secondary border-opacity-50 text-light small">
                Штат
              </Badge>
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <span className="kpi-value">{currentPlan.activeEngineersCount}</span>
              <span className="text-muted small">специалистов на линии</span>
            </div>
            {isOptimized && comparison && (
              <div className="mt-2 d-flex align-items-center gap-1">
                {comparison.savedEngineers > 0 ? (
                  <span className="kpi-diff-positive d-flex align-items-center">
                    <TrendingDown size={14} className="me-1" />
                    Высвобождено в резерв: {comparison.savedEngineers} бригад (-{comparison.savedEngineersPercent}%)
                  </span>
                ) : (
                  <span className="text-muted small">Штат сбалансирован</span>
                )}
              </div>
            )}
            {!isOptimized && (
              <div className="mt-2 text-warning small">Неоптимальное распределение</div>
            )}
          </div>
        </Col>

        {/* Метрика 2: Суммарный километраж */}
        <Col xs={12} sm={6} lg={3}>
          <div className="kpi-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <span className="kpi-title d-flex align-items-center gap-1">
                <Navigation size={15} className="text-info" />
                <span>Суммарный километраж</span>
              </span>
              <Badge bg="dark" className="border border-secondary border-opacity-50 text-light small">
                Логистика
              </Badge>
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <span className="kpi-value">{currentPlan.totalDistanceKm}</span>
              <span className="text-muted small">км по дорожной сети</span>
            </div>
            {isOptimized && comparison && (
              <div className="mt-2 d-flex align-items-center gap-1">
                {comparison.savedDistanceKm > 0 ? (
                  <span className="kpi-diff-positive d-flex align-items-center">
                    <TrendingDown size={14} className="me-1" />
                    Экономия пробега: -{comparison.savedDistanceKm} км (-{comparison.savedDistancePercent}%)
                  </span>
                ) : (
                  <span className="text-muted small">Прямые маршруты</span>
                )}
              </div>
            )}
            {!isOptimized && (
              <div className="mt-2 text-muted small">С учетом холостых переездов</div>
            )}
          </div>
        </Col>

        {/* Метрика 3: Время в пути */}
        <Col xs={12} sm={6} lg={3}>
          <div className="kpi-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <span className="kpi-title d-flex align-items-center gap-1">
                <Clock size={15} className="text-emerald" />
                <span>Время в пути</span>
              </span>
              <Badge bg="dark" className="border border-secondary border-opacity-50 text-light small">
                Эффективность
              </Badge>
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <span className="kpi-value">
                {Math.floor(currentPlan.totalTravelTimeMin / 60)}ч {currentPlan.totalTravelTimeMin % 60}м
              </span>
              <span className="text-muted small">чистое перемещение</span>
            </div>
            {isOptimized && comparison && comparison.savedTravelTimeMin > 0 && (
              <div className="mt-2 text-emerald small font-weight-bold">
                Сбережено: {Math.floor(comparison.savedTravelTimeMin / 60)}ч {comparison.savedTravelTimeMin % 60}м рабочего времени
              </div>
            )}
            {(!isOptimized || !comparison || comparison.savedTravelTimeMin <= 0) && (
              <div className="mt-2 text-muted small">Транспортные затраты смены</div>
            )}
          </div>
        </Col>

        {/* Метрика 4: Исполнение нарядов и окна SLA */}
        <Col xs={12} sm={6} lg={3}>
          <div className="kpi-card h-100">
            <div className="d-flex justify-content-between align-items-start">
              <span className="kpi-title d-flex align-items-center gap-1">
                <CheckCircle2 size={15} className="text-success" />
                <span>Исполнение слотов SLA</span>
              </span>
              <span className="text-muted small d-flex align-items-center gap-1">
                <Cpu size={13} className="text-warning" />
                {currentPlan.executionTimeMs} мс
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <span className="kpi-value text-success">
                {currentPlan.assignedOrdersCount} / {currentPlan.totalOrders}
              </span>
              <Badge bg={currentPlan.unassignedOrders.length > 0 ? "warning" : "success"} text={currentPlan.unassignedOrders.length > 0 ? "dark" : "light"}>
                {currentPlan.onTimeRatePercent}% точно в срок
              </Badge>
            </div>
            <div className="mt-2 d-flex justify-content-between align-items-center small">
              <span className="text-muted">
                Невключенных нарядов: {currentPlan.unassignedOrders.length}
              </span>
              <span className="text-emerald fw-semibold">100% окон соблюдены</span>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};
