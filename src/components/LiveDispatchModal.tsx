import React, { useState } from "react";
import { Modal, Tabs, Tab, Form, Button, Alert, Row, Col } from "react-bootstrap";
import { Zap, XCircle, UserX, AlertOctagon, CheckCircle2, PhoneCall } from "lucide-react";
import { EngineerRoute, Order, Depot } from "../core/types";

interface LiveDispatchModalProps {
  show: boolean;
  onHide: () => void;
  routes: EngineerRoute[];
  currentDepot: Depot;
  currentArea: string;
  onApplyEmergency: (emergencyOrder: Order, timeStr: string) => void;
  onApplyCancel: (orderId: string) => void;
  onApplyEngineerUnavailable: (engineerId: string, timeStr: string) => void;
}

export const LiveDispatchModal: React.FC<LiveDispatchModalProps> = ({
  show,
  onHide,
  routes,
  currentDepot,
  currentArea,
  onApplyEmergency,
  onApplyCancel,
  onApplyEngineerUnavailable
}) => {
  const [activeTab, setActiveTab] = useState<string>("emergency");

  // Состояния для сценария экстренной аварии (NOC)
  const [emergencyTime, setEmergencyTime] = useState("13:00");
  const [emergencyAddress, setEmergencyAddress] = useState("г. Москва, ул. Краснодонская, д. 24");
  const [emergencyDistrict, setEmergencyDistrict] = useState(currentDepot.district);
  const [incidentType, setIncidentType] = useState("Обрыв оптического кабеля на вводе ТКД");

  // Состояния для сценария отмены наряда клиентом
  const [cancelOrderId, setCancelOrderId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("Абонент перенес дату визита через личный кабинет");

  // Состояния для сценария форс-мажора / схода бригады с линии
  const [unavailEngineerId, setUnavailEngineerId] = useState<string>("");
  const [unavailTime, setUnavailTime] = useState("14:00");
  const [unavailReason, setUnavailReason] = useState("Техническая неисправность служебного автомобиля");

  // Получение полного списка назначенных в смене нарядов
  const assignedOrders: { order: Order; engineerName: string }[] = [];
  routes.forEach((r) => {
    r.stops.forEach((s) => {
      if (s.order) {
        assignedOrders.push({ order: s.order, engineerName: r.engineer.name });
      }
    });
  });

  const handleTriggerEmergency = () => {
    const newEmergency: Order = {
      id: `999${Math.floor(Math.random() * 900 + 100)}`,
      area: currentArea,
      bkType: "Глобальная проблема",
      hdType: incidentType,
      windowStart: emergencyTime,
      windowEnd: "22:00",
      district: emergencyDistrict,
      address: emergencyAddress,
      isGigabit: false,
      priority: "urgent",
      requiredSkill: "Аварийные работы",
      requiredTransport: "Любой",
      durationMinutes: 100, // 20 travel + 80 work
      workMinutes: 80,
      docMinutes: 0,
      lat: currentDepot.lat + 0.012,
      lon: currentDepot.lon + 0.015
    };

    onApplyEmergency(newEmergency, emergencyTime);
    onHide();
  };

  const handleTriggerCancel = () => {
    if (!cancelOrderId) return;
    onApplyCancel(cancelOrderId);
    onHide();
  };

  const handleTriggerUnavailable = () => {
    if (!unavailEngineerId) return;
    onApplyEngineerUnavailable(unavailEngineerId, unavailTime);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <AlertOctagon size={20} className="text-warning" />
          <span className="text-theme-main">Оперативное управление сменой • Диспетчерский пульт</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="text-theme-muted small mb-3">
          Регистрация оперативных событий, поступающих от Единого центра мониторинга сети (NOC) и контакт-центра в течение смены:
        </div>

        <Tabs
          id="live-dispatch-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || "emergency")}
          className="mb-3"
        >
          {/* Вкладка 1: Экстренная авария сети (NOC) */}
          <Tab
            eventKey="emergency"
            title={
              <span className="d-flex align-items-center gap-1">
                <Zap size={14} className="text-danger" />
                <span>Экстренный аварийный наряд (NOC)</span>
              </span>
            }
          >
            <div className="p-2">
              <Alert variant="danger" className="bg-danger bg-opacity-10 border-danger border-opacity-25 text-theme-main small mb-3">
                <b>Регламент обслуживания аварий:</b> Алгоритм автоматически определит оптимального специалиста с квалификацией <i>«Аварийные работы»</i>. Текущий наряд инженера не прерывается (сохранение технологической непрерывности), авария ставится в приоритет после завершения текущего адреса.
              </Alert>

              <Row className="g-2 mb-2">
                <Col sm={4}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Время фиксации:</Form.Label>
                    <Form.Select
                      size="sm"
                      value={emergencyTime}
                      onChange={(e) => setEmergencyTime(e.target.value)}
                      className="fsm-select"
                    >
                      <option value="11:30">11:30 (Утро)</option>
                      <option value="13:00">13:00 (День)</option>
                      <option value="15:00">15:00 (День)</option>
                      <option value="17:00">17:00 (Вечер)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm={8}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Характер аварии / Неисправность:</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="fsm-select"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-2 mb-3">
                <Col sm={8}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Адрес инцидента:</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={emergencyAddress}
                      onChange={(e) => setEmergencyAddress(e.target.value)}
                      className="fsm-select"
                    />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Район:</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={emergencyDistrict}
                      onChange={(e) => setEmergencyDistrict(e.target.value)}
                      className="fsm-select"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Button
                id="btn-apply-emergency"
                variant="danger"
                className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={handleTriggerEmergency}
              >
                <Zap size={16} />
                <span>Зарегистрировать аварию и перенаправить бригаду</span>
              </Button>
            </div>
          </Tab>

          {/* Вкладка 2: Отмена наряда по звонку абонента */}
          <Tab
            eventKey="cancel"
            title={
              <span className="d-flex align-items-center gap-1">
                <PhoneCall size={14} className="text-warning" />
                <span>Снятие наряда (Звонок абонента)</span>
              </span>
            }
          >
            <div className="p-2">
              <p className="text-muted small mb-3">
                Абонент обратился в контактный центр и перенес дату визита. Наряд аннулируется из графика бригады, а последующие выезды подтягиваются, устраняя холостой простой.
              </p>

              <Form.Group className="mb-2">
                <Form.Label className="small text-muted">Выберите наряд из текущего расписания:</Form.Label>
                <Form.Select
                  size="sm"
                  value={cancelOrderId}
                  onChange={(e) => setCancelOrderId(e.target.value)}
                  className="fsm-select"
                >
                  <option value="">-- Выберите наряд из сменного графика --</option>
                  {assignedOrders.slice(0, 20).map(({ order, engineerName }) => (
                    <option key={order.id} value={order.id}>
                      #{order.id} ({order.address}) — Бригада: {engineerName} ({order.windowStart}–{order.windowEnd})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">Причина снятия:</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="fsm-input"
                />
              </Form.Group>

              <Button
                id="btn-apply-cancel"
                variant="warning"
                disabled={!cancelOrderId}
                className="w-100 fw-bold text-dark d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={handleTriggerCancel}
              >
                <XCircle size={16} />
                <span>Снять наряд и оптимизировать график инженера</span>
              </Button>
            </div>
          </Tab>

          {/* Вкладка 3: Поломка ТС / Сход бригады по болезни */}
          <Tab
            eventKey="unavailable"
            title={
              <span className="d-flex align-items-center gap-1">
                <UserX size={14} className="text-info" />
                <span>Форс-мажор / Сход бригады с линии</span>
              </span>
            }
          >
            <div className="p-2">
              <p className="text-muted small mb-3">
                Поломка транспортного средства, ДТП или сход сотрудника по состоянию здоровья. Выполненные наряды фиксируются в реестре, а невыполненные работы автоматически перераспределяются между соседними бригадами участка.
              </p>

              <Row className="g-2 mb-2">
                <Col sm={7}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Специалист / Бригада:</Form.Label>
                    <Form.Select
                      size="sm"
                      value={unavailEngineerId}
                      onChange={(e) => setUnavailEngineerId(e.target.value)}
                      className="fsm-select"
                    >
                      <option value="">-- Выберите бригаду --</option>
                      {routes.map((r) => (
                        <option key={r.engineerId} value={r.engineerId}>
                          {r.engineer.name} ({r.totalOrders} нарядов в графике)
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group>
                    <Form.Label className="small text-muted">Время схода:</Form.Label>
                    <Form.Select
                      size="sm"
                      value={unavailTime}
                      onChange={(e) => setUnavailTime(e.target.value)}
                      className="fsm-select"
                    >
                      <option value="12:00">12:00</option>
                      <option value="14:00">14:00</option>
                      <option value="16:00">16:00</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">Причина выбытия:</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  value={unavailReason}
                  onChange={(e) => setUnavailReason(e.target.value)}
                  className="fsm-input"
                />
              </Form.Group>

              <Button
                id="btn-apply-unavailable"
                variant="info"
                disabled={!unavailEngineerId}
                className="w-100 fw-bold text-dark d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={handleTriggerUnavailable}
              >
                <CheckCircle2 size={16} />
                <span>Зафиксировать сход и перераспределить оставшиеся наряды</span>
              </Button>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
};
