import React, { useState, useMemo } from "react";
import { Badge, Button } from "react-bootstrap";
import { EngineerRoute, Order, RouteStop } from "../core/types";
import { timeToMinutes } from "../core/utils/timeUtils";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Wrench, 
  Car, 
  Coffee,
  Calendar,
  Sparkles
} from "lucide-react";

interface TimelineViewProps {
  routes: EngineerRoute[];
  currentTimeStr?: string;
  onChangeTimeSlice?: (time: string) => void;
  onInspectOrder: (order: Order, stop?: RouteStop, engineerId?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  routes,
  currentTimeStr = "13:00",
  onChangeTimeSlice,
  onInspectOrder
}) => {
  // Границы рабочего дня: с 08:00 (480 мин) до 22:00 (1320 мин) -> всего 840 минут
  const DAY_START_MIN = 8 * 60;
  const DAY_END_MIN = 22 * 60;
  const TOTAL_DAY_MIN = DAY_END_MIN - DAY_START_MIN;

  const formatMinutes = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Внутреннее состояние среза времени с синхронизацией
  const [timeSliceMin, setTimeSliceMin] = useState<number>(() =>
    timeToMinutes(currentTimeStr || "13:00")
  );

  const updateTimeSlice = (newMin: number) => {
    const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, newMin));
    setTimeSliceMin(clamped);
    if (onChangeTimeSlice) {
      onChangeTimeSlice(formatMinutes(clamped));
    }
  };

  const currentPosPercent = Math.min(
    100,
    Math.max(0, ((timeSliceMin - DAY_START_MIN) / TOTAL_DAY_MIN) * 100)
  );

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  const PRESETS = [
    { label: "09:00", min: 9 * 60 },
    { label: "11:00", min: 11 * 60 },
    { label: "13:00", min: 13 * 60 },
    { label: "15:00", min: 15 * 60 },
    { label: "17:00", min: 17 * 60 },
    { label: "19:00", min: 19 * 60 },
    { label: "21:00", min: 21 * 60 }
  ];

  // Оперативный срез статусов бригад на выбранный момент времени (на объекте, в пути, ожидание)
  const sliceStats = useMemo(() => {
    let onSite = 0;
    let inTransit = 0;
    let idle = 0;

    routes.forEach((route) => {
      const shiftStart = timeToMinutes(route.shiftStart);
      const shiftEnd = timeToMinutes(route.shiftEnd);
      if (timeSliceMin < shiftStart || timeSliceMin > shiftEnd) {
        idle++;
        return;
      }

      let statusFound = false;
      for (const stop of route.stops) {
        if (stop.isDepot) continue;
        const arrival = timeToMinutes(stop.arrivalTime);
        const startWork = timeToMinutes(stop.startWorkTime);
        const endWork = timeToMinutes(stop.endWorkTime);
        const prevDeparture = arrival - stop.travelDurationMinutes;

        if (timeSliceMin >= startWork && timeSliceMin <= endWork) {
          onSite++;
          statusFound = true;
          break;
        } else if (timeSliceMin >= prevDeparture && timeSliceMin < arrival) {
          inTransit++;
          statusFound = true;
          break;
        }
      }
      if (!statusFound) {
        idle++;
      }
    });

    return { onSite, inTransit, idle };
  }, [routes, timeSliceMin]);

  // Установка среза времени кликом по временной шкале
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const clickedMin = Math.round(DAY_START_MIN + ratio * TOTAL_DAY_MIN);
    // Привязка к шагу в 15 минут
    const snapped = Math.round(clickedMin / 15) * 15;
    updateTimeSlice(snapped);
  };

  return (
    <div className="fsm-card p-3">
      {/* Уровень 1: Заголовок, пресеты времени и легенда */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2 pb-2 border-bottom" style={{ borderColor: "var(--border-color)" }}>
        <div className="d-flex align-items-center gap-2">
          <Clock size={18} className="text-warning" />
          <span className="fw-bold text-theme-main" style={{ fontSize: "0.95rem" }}>
            Суточный график смен и выездов (Гант)
          </span>
        </div>

        {/* Легенда типов блоков */}
        <div className="d-flex align-items-center gap-3 small text-theme-muted">
          <div className="d-flex align-items-center gap-1.5">
            <span
              style={{
                width: 12,
                height: 12,
                background: "repeating-linear-gradient(45deg, rgba(148,163,184,0.4), rgba(148,163,184,0.4) 3px, transparent 3px, transparent 6px)",
                border: "1px dashed var(--border-strong)",
                display: "inline-block",
                borderRadius: 2
              }}
            />
            <span className="text-theme-main">Дорога</span>
          </div>
          <div className="d-flex align-items-center gap-1.5">
            <span
              style={{
                width: 12,
                height: 12,
                background: "#2563eb",
                display: "inline-block",
                borderRadius: 2
              }}
            />
            <span className="text-theme-main">Наряд</span>
          </div>
          <div className="d-flex align-items-center gap-1.5">
            <span
              style={{
                width: 12,
                height: 12,
                background: "#f43f5e",
                display: "inline-block",
                borderRadius: 2
              }}
            />
            <span className="text-theme-main">Авария</span>
          </div>
        </div>
      </div>

      {/* Уровень 2: Интерактивная консоль управления срезом времени */}
      <div
        className="p-2.5 rounded mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)"
        }}
      >
        {/* Кнопки и ползунок шага времени */}
        <div className="d-flex align-items-center gap-2">
          <span className="small fw-bold text-theme-main text-uppercase tracking-wider d-flex align-items-center gap-1">
            <Clock size={14} className="text-warning" />
            <span>Срез времени:</span>
          </span>

          <button
            onClick={() => updateTimeSlice(timeSliceMin - 15)}
            className="btn btn-xs btn-outline-secondary p-1 d-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26, borderRadius: 4 }}
            title="Назад на 15 мин"
          >
            <ChevronLeft size={14} />
          </button>

          <span
            className="badge px-2.5 py-1.5 fw-bold"
            style={{
              background: "#ffb800",
              color: "#000000",
              fontSize: "0.85rem",
              borderRadius: 6,
              boxShadow: "0 2px 6px rgba(255,184,0,0.3)"
            }}
          >
            {formatMinutes(timeSliceMin)}
          </span>

          <button
            onClick={() => updateTimeSlice(timeSliceMin + 15)}
            className="btn btn-xs btn-outline-secondary p-1 d-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26, borderRadius: 4 }}
            title="Вперед на 15 мин"
          >
            <ChevronRight size={14} />
          </button>

          {/* Интерактивный ползунок диапазона */}
          <div style={{ width: 140 }} className="ms-1 d-none d-sm-block">
            <input
              type="range"
              className="form-range"
              min={DAY_START_MIN}
              max={DAY_END_MIN}
              step={15}
              value={timeSliceMin}
              onChange={(e) => updateTimeSlice(Number(e.target.value))}
              style={{ cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Быстрые пресеты часов */}
        <div className="d-flex align-items-center gap-1 overflow-auto">
          {PRESETS.map((p) => {
            const isActive = timeSliceMin === p.min;
            return (
              <button
                key={p.label}
                onClick={() => updateTimeSlice(p.min)}
                className={`btn btn-xs rounded px-2 py-0.5 text-nowrap fw-semibold ${
                  isActive ? "btn-warning text-dark shadow-sm" : "btn-outline-secondary text-theme-muted"
                }`}
                style={{ fontSize: "0.74rem" }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Сводная оперативная информация на срезе */}
        <div className="d-flex align-items-center gap-2 small text-theme-muted">
          <span
            className="d-flex align-items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "rgba(37, 99, 235, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)" }}
            title="Инженеров на объекте заказчика"
          >
            <Wrench size={12} />
            <b>{sliceStats.onSite}</b> на объектах
          </span>
          <span
            className="d-flex align-items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--beeline-yellow)", border: "1px solid rgba(245, 158, 11, 0.25)" }}
            title="Инженеров в пути между адресами"
          >
            <Car size={12} />
            <b>{sliceStats.inTransit}</b> в пути
          </span>
          <span
            className="d-flex align-items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "var(--nav-active-bg)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
            title="Инженеров в ожидании наряда"
          >
            <Coffee size={12} />
            <b>{sliceStats.idle}</b> резерв
          </span>
        </div>
      </div>

      {/* Контейнер диаграммы Ганта */}
      <div className="timeline-container">
        {/* Заголовок временной шкалы */}
        <div className="d-flex align-items-center mb-2 pb-1 border-bottom" style={{ borderColor: "var(--border-color)" }}>
          <div style={{ width: 175, flexShrink: 0 }} className="small text-theme-main fw-bold text-uppercase tracking-wider">
            Специалист / Смена
          </div>
          <div
            className="flex-grow-1 position-relative d-flex justify-content-between text-theme-main"
            style={{ height: 22, fontSize: "0.75rem", cursor: "pointer" }}
            onClick={handleTimelineClick}
            title="Кликните в любое место шкалы, чтобы установить срез времени"
          >
            {hours.map((h, i) => {
              const leftPercent = ((h * 60 - DAY_START_MIN) / TOTAL_DAY_MIN) * 100;
              return (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    transform: "translateX(-50%)",
                    fontWeight: 700,
                    color: "var(--text-main)"
                  }}
                >
                  {h}:00
                </div>
              );
            })}
          </div>
        </div>

        {/* Дорожки с вертикальной сеткой часов и подвижным маркером среза */}
        <div className="position-relative">
          {/* Вертикальные часовые линии */}
          <div
            className="position-absolute top-0 bottom-0"
            style={{
              left: 175,
              right: 0,
              pointerEvents: "none",
              zIndex: 1
            }}
          >
            {hours.map((h) => {
              const leftPercent = ((h * 60 - DAY_START_MIN) / TOTAL_DAY_MIN) * 100;
              return (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: "1px dashed var(--border-color)",
                    opacity: 0.6
                  }}
                />
              );
            })}
          </div>

          {/* Интерактивный вертикальный маркер текущего среза времени */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `calc(175px + (100% - 175px) * ${currentPosPercent / 100})`,
              width: 2,
              background: "#ffb800",
              boxShadow: "0 0 10px rgba(255, 184, 0, 0.9)",
              zIndex: 25,
              pointerEvents: "none",
              transition: "left 0.1s ease-out"
            }}
          >
            {/* Верхний бейдж указателя */}
            <div
              style={{
                position: "absolute",
                top: -20,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#ffb800",
                color: "#000000",
                fontSize: "0.68rem",
                fontWeight: 900,
                padding: "1px 5px",
                borderRadius: 3,
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                whiteSpace: "nowrap"
              }}
            >
              ▼ {formatMinutes(timeSliceMin)}
            </div>
          </div>

          {/* Строки инженеров */}
          {routes.map((route) => {
            const shiftStartMin = timeToMinutes(route.shiftStart);
            const shiftEndMin = timeToMinutes(route.shiftEnd);
            const shiftLeftPercent = Math.max(0, ((shiftStartMin - DAY_START_MIN) / TOTAL_DAY_MIN) * 100);
            const shiftWidthPercent = Math.min(100, ((shiftEndMin - shiftStartMin) / TOTAL_DAY_MIN) * 100);

            const transportIcon = route.engineer.transport === "Автомобиль" 
              ? "🚗" 
              : route.engineer.transport === "Общественный транспорт" 
                ? "🚇" 
                : route.engineer.transport === "Велосипед" 
                  ? "🚲" 
                  : "🚶";

            return (
              <div key={route.engineerId} className="timeline-row">
                {/* Информация об инженере */}
                <div className="timeline-engineer-label d-flex flex-column pe-2" style={{ width: 175 }}>
                  <div className="d-flex align-items-center gap-1.5">
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: route.color,
                        flexShrink: 0,
                        boxShadow: `0 0 4px ${route.color}`
                      }}
                    />
                    <span className="text-truncate text-theme-main fw-bold" title={route.engineer.name}>
                      {route.engineer.name}
                    </span>
                  </div>
                  <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                    <span>{transportIcon} {route.engineer.transport}</span> • <span>{route.shiftStart}–{route.shiftEnd}</span>
                  </div>
                </div>

                {/* Дорожка расписания */}
                <div
                  className="timeline-track"
                  onClick={handleTimelineClick}
                  style={{ cursor: "pointer" }}
                  title="Кликните для выбора среза времени"
                >
                  {/* Фон рабочей смены */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${shiftLeftPercent}%`,
                      width: `${shiftWidthPercent}%`,
                      top: 0,
                      bottom: 0,
                      background: "var(--nav-active-bg)",
                      borderLeft: "2px solid var(--border-strong)",
                      borderRight: "2px solid var(--border-strong)",
                      opacity: 0.6
                    }}
                  />

                  {/* Отрисовка остановок (дорога + работа) */}
                  {route.stops.map((stop, idx) => {
                    if (stop.isDepot) return null;

                    const arrivalMin = timeToMinutes(stop.arrivalTime);
                    const startWorkMin = timeToMinutes(stop.startWorkTime);

                    // 1. Сегмент доезда
                    const prevDepartureMin = arrivalMin - stop.travelDurationMinutes;
                    const travelLeft = ((prevDepartureMin - DAY_START_MIN) / TOTAL_DAY_MIN) * 100;
                    const travelWidth = (stop.travelDurationMinutes / TOTAL_DAY_MIN) * 100;

                    // 2. Сегмент выполнения работ на объекте
                    const workLeft = ((startWorkMin - DAY_START_MIN) / TOTAL_DAY_MIN) * 100;
                    const workWidth = (stop.order ? stop.order.durationMinutes / TOTAL_DAY_MIN : 0) * 100;

                    const isUrgent = stop.order?.priority === "urgent";

                    return (
                      <React.Fragment key={stop.id}>
                        {/* Блок доезда */}
                        {stop.travelDurationMinutes > 0 && (
                          <div
                            className="timeline-block timeline-block-travel"
                            style={{
                              left: `${travelLeft}%`,
                              width: `${Math.max(1.2, travelWidth)}%`,
                              opacity: 0.85
                            }}
                            title={`Дорога: ${stop.travelDurationMinutes} мин (${stop.travelDistanceKm} км) • ${stop.transitDescription || ""}`}
                          >
                            <span style={{ fontSize: "0.62rem" }}>{stop.travelDurationMinutes}м</span>
                          </div>
                        )}

                        {/* Блок работы */}
                        <div
                          className={`timeline-block ${
                            isUrgent ? "timeline-block-urgent" : "timeline-block-work"
                          }`}
                          style={{
                            left: `${workLeft}%`,
                            width: `${Math.max(2, workWidth)}%`,
                            backgroundColor: isUrgent ? "#ef4444" : route.color,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.25)"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (stop.order) {
                              onInspectOrder(stop.order, stop, route.engineerId);
                            }
                          }}
                          title={`Наряд #${stop.order?.id}: ${stop.order?.address} (${stop.startWorkTime} – ${stop.endWorkTime}) • Окно: ${stop.order?.windowStart}–${stop.order?.windowEnd}`}
                        >
                          <span style={{ fontWeight: 700, fontSize: "0.68rem" }}>
                            {idx}. #{stop.order?.id}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
