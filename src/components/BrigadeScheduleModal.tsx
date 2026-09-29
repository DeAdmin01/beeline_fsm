import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, Badge } from "react-bootstrap";
import { Clock, Calendar, Plus, Trash2, Shield, Truck, Check, AlertCircle, Sparkles } from "lucide-react";
import { Engineer, WorkPeriod, SchedulePattern, TransportType, Skill } from "../core/types";
import { 
  getDayOfWeekRuName, 
  parseDateString, 
  isEngineerWorkingOnDate, 
  getEffectiveWorkPeriods 
} from "../core/utils/scheduleUtils";

interface BrigadeScheduleModalProps {
  show: boolean;
  onHide: () => void;
  engineer: Engineer | null;
  targetDate: string;
  onSave: (updatedEngineer: Engineer) => void;
}

const ALL_SKILLS: Skill[] = [
  "Локальные работы",
  "Работы на подключение и дозаказы",
  "Аварийные работы"
];

const DAYS_OF_WEEK = [
  { id: 1, name: "Пн", full: "Понедельник" },
  { id: 2, name: "Вт", full: "Вторник" },
  { id: 3, name: "Ср", full: "Среда" },
  { id: 4, name: "Чт", full: "Четверг" },
  { id: 5, name: "Пт", full: "Пятница" },
  { id: 6, name: "Сб", full: "Суббота" },
  { id: 7, name: "Вс", full: "Воскресенье" }
];

export const BrigadeScheduleModal: React.FC<BrigadeScheduleModalProps> = ({
  show,
  onHide,
  engineer,
  targetDate,
  onSave
}) => {
  if (!engineer) return null;

  const [name, setName] = useState(engineer.name);
  const [transport, setTransport] = useState<TransportType>(engineer.transport);
  const [skills, setSkills] = useState<Skill[]>(engineer.skills);
  const [pattern, setPattern] = useState<SchedulePattern>(engineer.schedule?.pattern || "5/2");
  const [workDays, setWorkDays] = useState<number[]>(engineer.schedule?.workDaysOfWeek || [1, 2, 3, 4, 5]);
  const [shiftOffset, setShiftOffset] = useState<number>(engineer.schedule?.shiftOffset || 0);
  const [workPeriods, setWorkPeriods] = useState<WorkPeriod[]>(() => getEffectiveWorkPeriods(engineer));
  const [daysOffDates, setDaysOffDates] = useState<string[]>(engineer.schedule?.daysOffDates || []);
  const [isActive, setIsActive] = useState(engineer.isActive);

  // Синхронизация локального состояния при изменении переданного инженера
  useEffect(() => {
    if (engineer) {
      setName(engineer.name);
      setTransport(engineer.transport);
      setSkills(engineer.skills);
      setPattern(engineer.schedule?.pattern || "5/2");
      setWorkDays(engineer.schedule?.workDaysOfWeek || [1, 2, 3, 4, 5]);
      setShiftOffset(engineer.schedule?.shiftOffset || 0);
      setWorkPeriods(getEffectiveWorkPeriods(engineer));
      setDaysOffDates(engineer.schedule?.daysOffDates || []);
      setIsActive(engineer.isActive);
    }
  }, [engineer]);

  const handleAddPeriod = () => {
    setWorkPeriods([...workPeriods, { start: "14:00", end: "18:00" }]);
  };

  const handleRemovePeriod = (index: number) => {
    if (workPeriods.length <= 1) {
      alert("Необходимо указать как минимум один рабочий период!");
      return;
    }
    setWorkPeriods(workPeriods.filter((_, idx) => idx !== index));
  };

  const handlePeriodChange = (index: number, field: "start" | "end", val: string) => {
    const updated = [...workPeriods];
    updated[index] = { ...updated[index], [field]: val };
    setWorkPeriods(updated);
  };

  const applyPreset = (periods: WorkPeriod[]) => {
    setWorkPeriods(periods);
  };

  const toggleDayOfWeek = (dayId: number) => {
    if (workDays.includes(dayId)) {
      if (workDays.length === 1) return;
      setWorkDays(workDays.filter((d) => d !== dayId));
    } else {
      setWorkDays([...workDays, dayId].sort());
    }
  };

  const toggleSkill = (skill: Skill) => {
    if (skills.includes(skill)) {
      if (skills.length === 1) return;
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const isDayOffToday = targetDate ? daysOffDates.includes(targetDate) : false;

  const handleToggleDayOffToday = () => {
    if (!targetDate) return;
    if (isDayOffToday) {
      setDaysOffDates(daysOffDates.filter((d) => d !== targetDate));
    } else {
      setDaysOffDates([...daysOffDates, targetDate]);
    }
  };

  const handleSave = () => {
    // Определение самого раннего начала и самого позднего окончания смены для обратной совместимости
    const starts = workPeriods.map((p) => p.start).sort();
    const ends = workPeriods.map((p) => p.end).sort();
    const earliestStart = starts[0] || "08:00";
    const latestEnd = ends[ends.length - 1] || "22:00";

    const updated: Engineer = {
      ...engineer,
      name,
      transport,
      skills,
      shiftStart: earliestStart,
      shiftEnd: latestEnd,
      workPeriods,
      isActive,
      schedule: {
        pattern,
        workDaysOfWeek: pattern === "5/2" ? [1, 2, 3, 4, 5] : pattern === "everyday" ? [1, 2, 3, 4, 5, 6, 7] : workDays,
        workPeriods,
        daysOffDates,
        shiftOffset
      }
    };

    onSave(updated);
    onHide();
  };

  // Предварительный расчет статуса выхода на дежурство для targetDate
  const previewWorking = isEngineerWorkingOnDate({
    ...engineer,
    isActive,
    schedule: {
      pattern,
      workDaysOfWeek: workDays,
      workPeriods,
      daysOffDates,
      shiftOffset
    }
  }, targetDate);

  const targetDateObj = parseDateString(targetDate);
  const targetDateDayName = targetDateObj ? getDayOfWeekRuName(targetDateObj) : "";

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="fsm-modal">
      <Modal.Header closeButton style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <Modal.Title className="d-flex align-items-center gap-2 text-theme-main" style={{ fontSize: "1.1rem" }}>
          <Clock className="text-warning" size={20} />
          <span>Настройка графика и допустимых периодов работы</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ background: "var(--bg-app)", color: "var(--text-main)" }} className="p-4">
        {/* Информационный баннер инженера */}
        <div className="p-3 mb-4 rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <div>
            <div className="fw-bold text-theme-main" style={{ fontSize: "1rem" }}>{name}</div>
            <div className="small text-theme-muted">
              Участок: <b className="text-theme-main">{engineer.area}</b> • База: {engineer.startDepot.district}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {targetDate && targetDate !== "all" && (
              <Badge bg={previewWorking ? "success" : "secondary"} className="p-2 fw-semibold">
                {targetDate}: {previewWorking ? "В графике" : "Выходной"} {targetDateDayName ? `(${targetDateDayName})` : ""}
              </Badge>
            )}
            <Form.Check
              type="switch"
              id="modal-active-toggle"
              label="Статус: Активен в штате"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="fw-semibold small"
            />
          </div>
        </div>

        <Row className="g-3">
          {/* Общие сведения: ФИО и транспорт */}
          <Col xs={12} md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-theme-muted">Наименование бригады / ФИО инженера:</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="fsm-input"
              />
            </Form.Group>
          </Col>

          <Col xs={12} md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-theme-muted">Транспортное средство:</Form.Label>
              <Form.Select
                value={transport}
                onChange={(e) => setTransport(e.target.value as TransportType)}
                className="fsm-select"
              >
                <option value="Автомобиль">Автомобиль</option>
                <option value="Общественный транспорт">Общественный транспорт</option>
                <option value="Велосипед">Велосипед / СИМ</option>
                <option value="Пешеход">Пешеход</option>
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Навыки и квалификации инженера */}
          <Col xs={12}>
            <div className="mb-3">
              <Form.Label className="small fw-semibold text-theme-muted d-flex align-items-center gap-1">
                <Shield size={14} className="text-warning" />
                <span>Матрица квалификаций и допусков:</span>
              </Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {ALL_SKILLS.map((skill) => {
                  const has = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`btn btn-sm ${has ? "btn-warning" : "btn-outline-secondary"}`}
                      style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                    >
                      {has ? <Check size={12} className="me-1" /> : null}
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          </Col>

          {/* Секция: Шаблон рабочих дней (График дежурств) */}
          <Col xs={12}>
            <hr style={{ borderColor: "var(--border-color)" }} />
            <div className="d-flex align-items-center gap-2 mb-3">
              <Calendar size={18} className="text-warning" />
              <h6 className="fw-bold mb-0 text-theme-main">Режим рабочих дней недели (График)</h6>
            </div>

            <Row className="g-2 mb-3">
              <Col xs={12} sm={6} md={3}>
                <div
                  onClick={() => setPattern("5/2")}
                  className={`p-2 rounded text-center cursor-pointer border ${pattern === "5/2" ? "border-warning bg-warning bg-opacity-10 fw-bold" : "border-secondary"}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="text-theme-main">5/2 (Пн–Пт)</div>
                  <div className="small text-theme-muted" style={{ fontSize: "0.7rem" }}>Сб, Вс — выходные</div>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div
                  onClick={() => setPattern("2/2")}
                  className={`p-2 rounded text-center cursor-pointer border ${pattern === "2/2" ? "border-warning bg-warning bg-opacity-10 fw-bold" : "border-secondary"}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="text-theme-main">2/2 (Сменный)</div>
                  <div className="small text-theme-muted" style={{ fontSize: "0.7rem" }}>Два через два</div>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div
                  onClick={() => setPattern("everyday")}
                  className={`p-2 rounded text-center cursor-pointer border ${pattern === "everyday" ? "border-warning bg-warning bg-opacity-10 fw-bold" : "border-secondary"}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="text-theme-main">Ежедневно</div>
                  <div className="small text-theme-muted" style={{ fontSize: "0.7rem" }}>Без фикс. выходных</div>
                </div>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div
                  onClick={() => setPattern("custom")}
                  className={`p-2 rounded text-center cursor-pointer border ${pattern === "custom" ? "border-warning bg-warning bg-opacity-10 fw-bold" : "border-secondary"}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="text-theme-main">Индивидуальный</div>
                  <div className="small text-theme-muted" style={{ fontSize: "0.7rem" }}>Выбор дней недели</div>
                </div>
              </Col>
            </Row>

            {pattern === "2/2" && (
              <div className="p-3 mb-3 rounded bg-surface border border-secondary">
                <Form.Label className="small fw-semibold text-theme-muted">Чередование смены (2/2):</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant={shiftOffset === 0 ? "warning" : "outline-secondary"}
                    size="sm"
                    onClick={() => setShiftOffset(0)}
                  >
                    Смена А (Первый цикл)
                  </Button>
                  <Button
                    variant={shiftOffset === 2 ? "warning" : "outline-secondary"}
                    size="sm"
                    onClick={() => setShiftOffset(2)}
                  >
                    Смена Б (Второй цикл)
                  </Button>
                </div>
              </div>
            )}

            {pattern === "custom" && (
              <div className="p-3 mb-3 rounded bg-surface border border-secondary">
                <Form.Label className="small fw-semibold text-theme-muted">Рабочие дни недели:</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isWork = workDays.includes(d.id);
                    return (
                      <Button
                        key={d.id}
                        variant={isWork ? "warning" : "outline-secondary"}
                        size="sm"
                        onClick={() => toggleDayOfWeek(d.id)}
                        style={{ minWidth: 44 }}
                      >
                        {d.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {targetDate && (
              <div className="d-flex align-items-center justify-content-between p-2 rounded bg-surface border mb-3">
                <div className="small">
                  <b>Исключение для даты {targetDate} ({targetDateDayName}):</b>
                  <div className="text-theme-muted" style={{ fontSize: "0.75rem" }}>
                    {isDayOffToday ? "Назначен внеочередной выходной день" : "Работает в обычном режиме графика"}
                  </div>
                </div>
                <Button
                  variant={isDayOffToday ? "outline-success" : "outline-danger"}
                  size="sm"
                  onClick={handleToggleDayOffToday}
                  style={{ fontSize: "0.78rem" }}
                >
                  {isDayOffToday ? "Снять статус выходного" : "Установить выходной на этот день"}
                </Button>
              </div>
            )}
          </Col>

          {/* Секция: Допустимые периоды смены (Интервалы работы) */}
          <Col xs={12}>
            <hr style={{ borderColor: "var(--border-color)" }} />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center gap-2">
                <Clock size={18} className="text-warning" />
                <div>
                  <h6 className="fw-bold mb-0 text-theme-main">Допустимые периоды работы (Смены и интервалы)</h6>
                  <div className="small text-theme-muted">
                    Наряды назначаются только внутри указанных временных интервалов смены
                  </div>
                </div>
              </div>

              <Button
                variant="outline-warning"
                size="sm"
                onClick={handleAddPeriod}
                className="d-flex align-items-center gap-1"
                style={{ fontSize: "0.78rem" }}
              >
                <Plus size={14} />
                <span>Добавить период</span>
              </Button>
            </div>

            {/* Быстрые шаблоны смен */}
            <div className="d-flex flex-wrap gap-1 mb-3">
              <span className="small text-theme-muted me-1 align-self-center">Быстрые шаблоны:</span>
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-1 px-2"
                onClick={() => applyPreset([{ start: "08:00", end: "17:00" }])}
              >
                08:00 — 17:00
              </button>
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-1 px-2"
                onClick={() => applyPreset([{ start: "10:00", end: "22:00" }])}
              >
                10:00 — 22:00 (Стандарт)
              </button>
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-1 px-2"
                onClick={() => applyPreset([{ start: "09:00", end: "21:00" }])}
              >
                09:00 — 21:00
              </button>
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-1 px-2"
                onClick={() => applyPreset([{ start: "12:00", end: "21:00" }])}
              >
                12:00 — 21:00 (Вечерняя)
              </button>
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-1 px-2"
                onClick={() =>
                  applyPreset([
                    { start: "09:00", end: "13:00" },
                    { start: "14:00", end: "19:00" }
                  ])
                }
              >
                09:00–13:00 и 14:00–19:00 (Обед)
              </button>
            </div>

            {/* Список интервалов смены */}
            <div className="d-flex flex-column gap-2 mb-2">
              {workPeriods.map((period, idx) => (
                <div
                  key={idx}
                  className="d-flex align-items-center gap-2 p-2 rounded"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
                >
                  <span className="badge bg-warning text-dark fw-bold" style={{ minWidth: 24 }}>
                    #{idx + 1}
                  </span>

                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <span className="small text-theme-muted">Начало:</span>
                    <Form.Control
                      type="time"
                      size="sm"
                      value={period.start}
                      onChange={(e) => handlePeriodChange(idx, "start", e.target.value)}
                      className="fsm-input"
                      style={{ width: 120 }}
                    />

                    <span className="small text-theme-muted ms-2">Окончание:</span>
                    <Form.Control
                      type="time"
                      size="sm"
                      value={period.end}
                      onChange={(e) => handlePeriodChange(idx, "end", e.target.value)}
                      className="fsm-input"
                      style={{ width: 120 }}
                    />
                  </div>

                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRemovePeriod(idx)}
                    title="Удалить период"
                    className="p-1"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Отмена
        </Button>
        <Button variant="warning" size="sm" onClick={handleSave} className="fw-semibold px-3">
          Сохранить график бригады
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
