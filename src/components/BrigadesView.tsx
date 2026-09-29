import React, { useState } from "react";
import { Row, Col, Form, Button, Badge } from "react-bootstrap";
import { 
  Users, 
  Car, 
  Bus, 
  Footprints, 
  Bike, 
  Clock, 
  Calendar, 
  Plus, 
  Sliders, 
  Trash2, 
  MapPin, 
  CheckCircle2, 
  Wrench, 
  ShieldAlert, 
  Zap,
  Briefcase
} from "lucide-react";
import { Engineer, EngineerRoute, TransportType } from "../core/types";
import { BrigadeScheduleModal } from "./BrigadeScheduleModal";
import { 
  isEngineerWorkingOnDate, 
  getEffectiveWorkPeriods, 
  getDayOfWeekRuName, 
  parseDateString,
  createDefaultEngineerSchedule
} from "../core/utils/scheduleUtils";

interface BrigadesViewProps {
  engineers: Engineer[];
  routes: EngineerRoute[];
  targetDate: string;
  onToggleEngineer: (id: string) => void;
  onUpdateTransport: (id: string, transport: TransportType) => void;
  onUpdateEngineer: (updated: Engineer) => void;
  onAddEngineer: (newEng: Engineer) => void;
  onDeleteEngineer: (id: string) => void;
  onSelectEngineerForMap: (id: string) => void;
}

export const BrigadesView: React.FC<BrigadesViewProps> = ({
  engineers,
  routes,
  targetDate,
  onToggleEngineer,
  onUpdateTransport,
  onUpdateEngineer,
  onAddEngineer,
  onDeleteEngineer,
  onSelectEngineerForMap
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "working" | "dayoff">("all");
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);

  const routeMap = new Map<string, EngineerRoute>();
  routes.forEach((r) => routeMap.set(r.engineerId, r));

  const isAllDates = !targetDate || targetDate === "all";
  const targetDateObj = isAllDates ? null : parseDateString(targetDate);
  const targetDayName = targetDateObj ? getDayOfWeekRuName(targetDateObj) : "";

  // Статистика дежурств на выбранную дату targetDate
  const workingTodayCount = engineers.filter((e) => isEngineerWorkingOnDate(e, targetDate)).length;
  const dayOffCount = engineers.length - workingTodayCount;

  const filteredEngineers = engineers.filter((eng) => {
    const isWorking = isEngineerWorkingOnDate(eng, targetDate);
    if (filterMode === "working") return isWorking;
    if (filterMode === "dayoff") return !isWorking;
    return true;
  });

  const handleAddNewBrigade = () => {
    const newIdx = engineers.length + 1;
    const baseDepot = engineers[0]?.startDepot || {
      address: "г. Москва, базовый склад",
      lat: 55.75,
      lon: 37.62,
      district: "Центральный"
    };

    const newEng: Engineer = {
      id: `eng_custom_${Date.now()}_${newIdx}`,
      name: `Бригада ${newIdx} — Специалист`,
      area: engineers[0]?.area || "Основной сектор",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      transport: "Автомобиль",
      shiftStart: "10:00",
      shiftEnd: "22:00",
      workPeriods: [{ start: "10:00", end: "22:00" }],
      schedule: createDefaultEngineerSchedule("5/2", [{ start: "10:00", end: "22:00" }]),
      startDepot: baseDepot,
      maxCapacityUnits: 6,
      isActive: true
    };

    onAddEngineer(newEng);
    setEditingEngineer(newEng);
  };

  const getTransportIcon = (transport: TransportType) => {
    switch (transport) {
      case "Автомобиль":
        return <Car size={13} className="text-warning" />;
      case "Общественный транспорт":
        return <Bus size={13} className="text-info" />;
      case "Велосипед":
        return <Bike size={13} className="text-success" />;
      case "Пешеход":
        return <Footprints size={13} className="text-secondary" />;
      default:
        return <Car size={13} />;
    }
  };

  // Вспомогательная функция для получения инициалов бригады для аватара
  const getInitials = (name: string): string => {
    const parts = name.replace(/^Бригада\s*\d*\s*[-—]?\s*/i, "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "ИН";
  };

  return (
    <div className="p-1">
      {/* Верхняя панель и контекстный баннер с датой */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3 pb-3 border-bottom border-secondary border-opacity-25">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold text-theme-main mb-0 tracking-tight">Штат выездных специалистов</h5>
            {!isAllDates ? (
              <span className="badge rounded-pill fw-semibold px-2.5 py-1"
                style={{ background: "rgba(255, 184, 0, 0.15)", color: "var(--beeline-yellow)", border: "1px solid rgba(255, 184, 0, 0.3)", fontSize: "0.78rem" }}
              >
                {targetDate} {targetDayName ? `• ${targetDayName}` : ""}
              </span>
            ) : (
              <span className="badge bg-secondary bg-opacity-25 text-theme-muted rounded-pill px-2.5 py-1" style={{ fontSize: "0.78rem" }}>
                Сводный режим (Все даты)
              </span>
            )}
          </div>
          <div className="text-theme-muted small mt-1">
            Управление графиками дежурств, профилями смен (5/2, 2/2) и допустимыми интервалами работы
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Сегментированный фильтр статуса дежурства */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${filterMode === "all" ? "btn-warning fw-semibold" : "btn-outline-secondary"}`}
              onClick={() => setFilterMode("all")}
              style={{ fontSize: "0.8rem", padding: "4px 12px" }}
            >
              Все бригады ({engineers.length})
            </button>
            <button
              type="button"
              className={`btn ${filterMode === "working" ? "btn-warning fw-semibold" : "btn-outline-secondary"}`}
              onClick={() => setFilterMode("working")}
              style={{ fontSize: "0.8rem", padding: "4px 12px" }}
            >
              В графике ({workingTodayCount})
            </button>
            <button
              type="button"
              className={`btn ${filterMode === "dayoff" ? "btn-warning fw-semibold" : "btn-outline-secondary"}`}
              onClick={() => setFilterMode("dayoff")}
              style={{ fontSize: "0.8rem", padding: "4px 12px" }}
            >
              Выходные ({dayOffCount})
            </button>
          </div>

          <Button
            variant="warning"
            size="sm"
            onClick={handleAddNewBrigade}
            className="d-flex align-items-center gap-1 fw-bold text-dark px-3 py-1.5 shadow-sm"
            style={{ fontSize: "0.82rem" }}
          >
            <Plus size={15} />
            <span>Добавить инженера</span>
          </Button>
        </div>
      </div>

      {/* Сетка карточек выездных инженеров */}
      <Row className="g-3">
        {filteredEngineers.map((eng) => {
          const route = routeMap.get(eng.id);
          const hasOrders = route && route.totalOrders > 0;
          const isWorkingToday = isEngineerWorkingOnDate(eng, targetDate);
          const periods = getEffectiveWorkPeriods(eng);
          const initials = getInitials(eng.name);

          const patternText =
            eng.schedule?.pattern === "5/2"
              ? "5/2 (Пн–Пт)"
              : eng.schedule?.pattern === "2/2"
              ? "2/2 (Сменный)"
              : eng.schedule?.pattern === "everyday"
              ? "Без выходных"
              : "Индивидуальный";

          return (
            <Col key={eng.id} xs={12} md={6} xl={4}>
              <div
                className={`fsm-card p-3 h-100 d-flex flex-column transition-all ${!eng.isActive ? "opacity-60" : ""}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8
                }}
              >
                {/* Шапка карточки: Аватар, имя, базовый склад и переключатели */}
                <div className="d-flex justify-content-between align-items-start mb-2.5">
                  <div className="d-flex align-items-center gap-2.5">
                    {/* Аватар с инициалами */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 6,
                        background: route?.color ? `${route.color}22` : "rgba(255, 184, 0, 0.12)",
                        color: route?.color || "var(--beeline-yellow)",
                        border: `1px solid ${route?.color || "rgba(255, 184, 0, 0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        flexShrink: 0
                      }}
                      title={eng.name}
                    >
                      {initials}
                    </div>

                    <div>
                      <div className="fw-bold text-theme-main" style={{ fontSize: "0.92rem", lineHeight: 1.25 }}>
                        {eng.name}
                      </div>
                      <div className="text-theme-muted d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: "0.72rem" }}>
                        <MapPin size={11} className="text-theme-dim" />
                        <span>База: {eng.startDepot.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Кнопка настройки графика и переключатель активности */}
                  <div className="d-flex align-items-center gap-1.5">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setEditingEngineer(eng)}
                      title="Настроить график и периоды работы"
                      className="p-1 btn-xs"
                      style={{ borderRadius: 6, borderColor: "var(--border-color)" }}
                    >
                      <Sliders size={13} className="text-warning" />
                    </Button>

                    <Form.Check
                      type="switch"
                      id={`switch-view-eng-${eng.id}`}
                      checked={eng.isActive}
                      onChange={() => onToggleEngineer(eng.id)}
                      title={eng.isActive ? "Активен в штате" : "Отключен"}
                      className="m-0"
                    />
                  </div>
                </div>

                {/* Строка статуса смены и тип расписания */}
                <div 
                  className="p-2 rounded mb-2.5 d-flex align-items-center justify-content-between"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", fontSize: "0.76rem" }}
                >
                  <div className="d-flex align-items-center gap-1.5">
                    {isWorkingToday ? (
                      <span className="badge rounded-pill fw-semibold" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                        В графике
                      </span>
                    ) : (
                      <span className="badge rounded-pill fw-semibold" style={{ background: "rgba(148, 163, 184, 0.15)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                        Выходной
                      </span>
                    )}
                    <span className="text-theme-muted">•</span>
                    <span className="text-theme-main fw-medium">{patternText}</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-link btn-xs p-0 text-warning text-decoration-none fw-semibold"
                    onClick={() => setEditingEngineer(eng)}
                    style={{ fontSize: "0.72rem" }}
                  >
                    График
                  </button>
                </div>

                {/* Интервалы смены и допустимые рабочие периоды */}
                <div className="mb-2">
                  <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "0.72rem" }}>
                    <span className="text-theme-muted d-flex align-items-center gap-1">
                      <Clock size={11} className="text-warning" />
                      <span>Разрешенные часы смены:</span>
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-1">
                    {periods.map((p, idx) => (
                      <span
                        key={idx}
                        className="badge"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          fontWeight: 600,
                          padding: "3px 7px"
                        }}
                      >
                        {p.start} — {p.end}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Селектор типа транспорта */}
                <div className="mb-2">
                  <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "0.72rem" }}>
                    <span className="text-theme-muted d-flex align-items-center gap-1">
                      {getTransportIcon(eng.transport)}
                      <span>Транспорт:</span>
                    </span>
                  </div>
                  <Form.Select
                    size="sm"
                    value={eng.transport}
                    onChange={(e) => onUpdateTransport(eng.id, e.target.value as TransportType)}
                    className="fsm-select py-1"
                    style={{ fontSize: "0.78rem" }}
                  >
                    <option value="Автомобиль">Автомобиль</option>
                    <option value="Общественный транспорт">Общественный транспорт</option>
                    <option value="Велосипед">Велосипед / СИМ</option>
                    <option value="Пешеход">Пешеход</option>
                  </Form.Select>
                </div>

                {/* Квалификации и допуски */}
                <div className="mb-3">
                  <div className="text-theme-muted mb-1 d-flex align-items-center gap-1" style={{ fontSize: "0.72rem" }}>
                    <Briefcase size={11} className="text-theme-dim" />
                    <span>Допуски и профиль:</span>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {eng.skills.map((s, idx) => {
                      const isEmergency = s.includes("Аварийные");
                      return (
                        <span
                          key={idx}
                          className="badge"
                          style={{
                            background: isEmergency ? "rgba(239, 68, 68, 0.12)" : "rgba(59, 130, 246, 0.1)",
                            color: isEmergency ? "#ef4444" : "#3b82f6",
                            border: `1px solid ${isEmergency ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.2)"}`,
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            padding: "2px 6px"
                          }}
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Нагрузка бригады и кнопки действий */}
                <div
                  className="d-flex justify-content-between align-items-center pt-2 mt-auto"
                  style={{ borderTop: "1px solid var(--border-color)" }}
                >
                  <div className="small" style={{ fontSize: "0.76rem" }}>
                    {hasOrders ? (
                      <span>
                        Назначено: <b className="text-theme-main">{route.totalOrders} нарядов</b>
                        <span className="text-theme-muted ms-1">({route.totalDistanceKm} км)</span>
                      </span>
                    ) : (
                      <span className="text-theme-muted">Нарядов нет (свободен)</span>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-1.5">
                    {hasOrders && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        onClick={() => onSelectEngineerForMap(eng.id)}
                      >
                        Маршрут
                      </Button>
                    )}

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                      onClick={() => setEditingEngineer(eng)}
                      title="Редактировать смену"
                    >
                      Смена
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                      onClick={() => {
                        if (confirm(`Удалить инженера «${eng.name}» из штата?`)) {
                          onDeleteEngineer(eng.id);
                        }
                      }}
                      title="Удалить инженера"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Модальное окно редактирования расписания и допустимых периодов работы */}
      {editingEngineer && (
        <BrigadeScheduleModal
          show={!!editingEngineer}
          onHide={() => setEditingEngineer(null)}
          engineer={editingEngineer}
          targetDate={targetDate}
          onSave={onUpdateEngineer}
        />
      )}
    </div>
  );
};
