import React from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wrench, 
  Truck, 
  Calendar, 
  MapPin, 
  HelpCircle,
  Users,
  ShieldCheck
} from "lucide-react";
import { Order, Engineer, RouteStop, EngineerRoute } from "../core/types";
import { explainAssignment, explainUnassignedOrder } from "../core/explain/explainer";

interface ExplainModalProps {
  show: boolean;
  onHide: () => void;
  order: Order | null;
  assignedEngineer: Engineer | null;
  stop: RouteStop | null;
  prevStop: RouteStop | null;
  allRoutes: EngineerRoute[];
  allEngineers: Engineer[];
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  show,
  onHide,
  order,
  assignedEngineer,
  stop,
  prevStop,
  allRoutes,
  allEngineers
}) => {
  if (!order) return null;

  const isAssigned = !!assignedEngineer && !!stop;
  const explanation = isAssigned
    ? explainAssignment(order, assignedEngineer, stop, prevStop, allRoutes)
    : null;

  const unassignedExp = !isAssigned
    ? explainUnassignedOrder(order, allEngineers, "превышение временного слота или занятость квалифицированных специалистов")
    : null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <HelpCircle size={20} className="text-warning" />
          <span className="text-theme-main">Аудит решения диспетчера: Наряд #{order.id}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Карточка параметров наряда */}
        <div className="fsm-card p-3 mb-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 className="fw-bold text-theme-main mb-1">{order.address}</h6>
              <div className="text-theme-muted small">
                Район: <span className="text-theme-main fw-semibold">{order.district}</span> • Услуга:{" "}
                <span className="text-info fw-semibold">{order.hdType || order.bkType}</span>
              </div>
            </div>
            <div className="d-flex flex-column align-items-end gap-1">
              {order.priority === "urgent" ? (
                <Badge bg="danger" className="badge-urgent">
                  СРОЧНАЯ АВАРИЯ
                </Badge>
              ) : (
                <span className="badge-skill">Стандартный наряд</span>
              )}
              <span className="badge fw-bold border border-warning text-warning small">
                Интервал клиента: {order.windowStart} – {order.windowEnd}
              </span>
            </div>
          </div>

          <div className="d-flex gap-3 small text-theme-muted pt-2 border-top border-theme">
            <div>
              Норматив выполнения: <b className="text-theme-main">{order.durationMinutes} мин</b>
            </div>
            <div>
              Требуемый допуск: <b className="text-theme-main">{order.requiredSkill}</b>
            </div>
            <div>
              Транспорт: <b className="text-theme-main">{order.requiredTransport}</b>
            </div>
          </div>
        </div>

        {/* Случай 1: Наряд успешно назначен инженеру */}
        {isAssigned && explanation && (
          <div>
            {/* Резюме алгоритма маршрутизации */}
            <div
              className="p-3 rounded mb-3"
              style={{ background: "rgba(255, 184, 0, 0.1)", border: "1px solid rgba(255, 184, 0, 0.3)" }}
            >
              <div className="fw-bold text-warning small text-uppercase mb-1 d-flex align-items-center gap-1">
                <span>Резюме системы маршрутизации</span>
              </div>
              <p className="mb-0 text-theme-main small" style={{ lineHeight: 1.5 }}>
                {explanation.summary}
              </p>
            </div>

            {/* Чек-лист проверки жестких ограничений регламента */}
            <div className="d-flex align-items-center gap-2 mb-2 pt-1">
              <ShieldCheck size={16} className="text-warning" />
              <span className="fw-bold text-theme-main small text-uppercase tracking-wider">
                Проверка сервисных регламентов:
              </span>
            </div>

            <div className="d-flex flex-column gap-2 mb-3">
              {/* Проверка 1: Квалификация и допуски */}
              <div className="fsm-card p-2.5 d-flex gap-2 mb-2">
                <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                <div className="small">
                  <div className="fw-bold text-theme-main d-flex align-items-center gap-1">
                    <Wrench size={14} className="text-info" />
                    <span>Квалификационный допуск и матрица навыков</span>
                  </div>
                  <div className="text-theme-muted">{explanation.skillCheck.details}</div>
                </div>
              </div>

              {/* Проверка 2: Временное 2-часовое окно клиента */}
              <div className="fsm-card p-2.5 d-flex gap-2 mb-2">
                <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                <div className="small">
                  <div className="fw-bold text-theme-main d-flex align-items-center gap-1">
                    <Clock size={14} className="text-warning" />
                    <span>Согласованное окно клиента и технологический норматив</span>
                  </div>
                  <div className="text-theme-muted">{explanation.timeWindowCheck.details}</div>
                </div>
              </div>

              {/* Проверка 3: Транспортная доступность */}
              <div className="fsm-card p-2.5 d-flex gap-2 mb-2">
                <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                <div className="small">
                  <div className="fw-bold text-theme-main d-flex align-items-center gap-1">
                    <Truck size={14} className="text-emerald" />
                    <span>Транспортное обеспечение и логистическая доступность</span>
                  </div>
                  <div className="text-theme-muted">{explanation.transportCheck.details}</div>
                </div>
              </div>

              {/* Проверка 4: Границы смены и отсутствие переработок */}
              <div className="fsm-card p-2.5 d-flex gap-2 mb-2">
                <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                <div className="small">
                  <div className="fw-bold text-theme-main d-flex align-items-center gap-1">
                    <Calendar size={14} className="text-secondary" />
                    <span>Лимит рабочего времени и окончание смены</span>
                  </div>
                  <div className="text-theme-muted">{explanation.shiftCheck.details}</div>
                </div>
              </div>

              {/* Логистическое плечо и предыдущая точка */}
              <div className="fsm-card p-2.5 d-flex gap-2 mb-2">
                <MapPin size={18} className="text-info flex-shrink-0 mt-1" />
                <div className="small">
                  <div className="fw-bold text-theme-main">Плечо доезда от предыдущей точки</div>
                  <div className="text-theme-muted">{explanation.logisticsCheck.details}</div>
                </div>
              </div>
            </div>

            {/* Анализ альтернативных кандидатов */}
            {explanation.alternativeAnalysis.length > 0 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-2 pt-2">
                  <Users size={16} className="text-info" />
                  <span className="fw-bold text-theme-main small text-uppercase tracking-wider">
                    Аудит отклоненных кандидатов:
                  </span>
                </div>
                <div className="fsm-card p-3">
                  <ul className="mb-0 ps-3 small text-theme-muted">
                    {explanation.alternativeAnalysis.map((alt, idx) => (
                      <li key={idx} className="mb-1 text-theme-main">
                        {alt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Случай 2: Наряд не назначен (в резерве) */}
        {!isAssigned && unassignedExp && (
          <div>
            <div
              className="p-3 rounded mb-3"
              style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)" }}
            >
              <div className="fw-bold text-danger small text-uppercase mb-1 d-flex align-items-center gap-1">
                <XCircle size={16} />
                <span>Причина невключения в текущий график</span>
              </div>
              <p className="mb-0 text-theme-main small" style={{ lineHeight: 1.5 }}>
                {unassignedExp.summary}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2 pt-2">
              <Users size={16} className="text-warning" />
              <span className="fw-bold text-theme-main small text-uppercase tracking-wider">
                Аудит загрузки дежурного штата сектора:
              </span>
            </div>
            <div className="fsm-card p-3">
              <ul className="mb-0 ps-3 small text-theme-muted">
                {unassignedExp.audit.map((item, idx) => (
                  <li key={idx} className="mb-1 text-theme-main">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} size="sm">
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
