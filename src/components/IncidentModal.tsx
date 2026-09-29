import React, { useState } from "react";
import { Modal, Tabs, Tab, Form, Button, Alert } from "react-bootstrap";
import { AlertTriangle, XCircle, UserX, Zap, CheckCircle2 } from "lucide-react";
import { EngineerRoute, Order, Depot } from "../core/types";

interface IncidentModalProps {
  show: boolean;
  onHide: () => void;
  routes: EngineerRoute[];
  currentDepot: Depot;
  currentArea: string;
  onApplyEmergency: (emergencyOrder: Order, timeStr: string) => void;
  onApplyCancel: (orderId: string) => void;
  onApplyEngineerUnavailable: (engineerId: string, timeStr: string) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
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

  // Состояние формы для сценария «Срочная авария»
  const [emergencyTime, setEmergencyTime] = useState("13:00");
  const [emergencyAddress, setEmergencyAddress] = useState("г. Москва, ул. Срочная Аварийная, д. 12");
  const [emergencyDistrict, setEmergencyDistrict] = useState(currentDepot.district);

  // Состояние формы для сценария «Отмена заявки абонентом»
  const [cancelOrderId, setCancelOrderId] = useState<string>("");

  // Состояние формы для сценария «Сход инженера с линии»
  const [unavailEngineerId, setUnavailEngineerId] = useState<string>("");
  const [unavailTime, setUnavailTime] = useState("14:00");

  // Получение всех назначенных заявок из текущих маршрутов бригад
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
      hdType: "Авария на оптической муфте ТКД",
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
      lat: currentDepot.lat + 0.015,
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
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <AlertTriangle size={20} className="text-warning" />
          <span>Симулятор динамических инцидентов (Перепланирование)</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Alert variant="secondary" className="bg-dark border-secondary border-opacity-50 text-light small mb-3">
          <b>Требование ТЗ (п. 2.1.6):</b> Перестроить план после одного из 3 событий дня с сохранением неразрывности текущей выполняемой работы и наглядным отображением изменений.
        </Alert>

        <Tabs
          id="incident-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || "emergency")}
          className="mb-3"
        >
          {/* Вкладка 1: Срочная авария */}
          <Tab
            eventKey="emergency"
            title={
              <span className="d-flex align-items-center gap-1">
                <Zap size={14} className="text-danger" />
                <span>1. Срочная авария</span>
              </span>
            }
          >
            <div className="p-2">
              <p className="text-muted small mb-3">
                Поступает внезапная авария наивысшего приоритета. Алгоритм находит ближайшего инженера с квалификацией <b>"Аварийные работы"</b>, дожидается окончания его текущей начатой заявки (неразрывность работ) и встраивает аварию в график.
              </p>

              <Form.Group className="mb-2">
                <Form.Label className="small text-muted">Время возникновения аварии:</Form.Label>
                <Form.Select
                  size="sm"
                  value={emergencyTime}
                  onChange={(e) => setEmergencyTime(e.target.value)}
                  className="bg-dark text-light border-secondary"
                  style={{ maxWidth: 160 }}
                >
                  <option value="11:30">11:30</option>
                  <option value="13:00">13:00 (середина дня)</option>
                  <option value="15:00">15:00</option>
                  <option value="17:00">17:00</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="small text-muted">Адрес инцидента:</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  value={emergencyAddress}
                  onChange={(e) => setEmergencyAddress(e.target.value)}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">Район:</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  value={emergencyDistrict}
                  onChange={(e) => setEmergencyDistrict(e.target.value)}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>

              <Button
                id="btn-apply-emergency"
                variant="danger"
                className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                onClick={handleTriggerEmergency}
              >
                <Zap size={16} />
                <span>Смоделировать аварию и перестроить план</span>
              </Button>
            </div>
          </Tab>

          {/* Вкладка 2: Отмена заявки абонентом */}
          <Tab
            eventKey="cancel"
            title={
              <span className="d-flex align-items-center gap-1">
                <XCircle size={14} className="text-warning" />
                <span>2. Отмена заявки клиентом</span>
              </span>
            }
          >
            <div className="p-2">
              <p className="text-muted small mb-3">
                Абонент перенес или отменил визит. Окно у инженера освобождается, алгоритм подтягивает последующие заявки, сокращая простой и время завершения смены.
              </p>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">Выберите заявку для отмены:</Form.Label>
                <Form.Select
                  size="sm"
                  value={cancelOrderId}
                  onChange={(e) => setCancelOrderId(e.target.value)}
                  className="bg-dark text-light border-secondary"
                >
                  <option value="">-- Выберите заявку из графика --</option>
                  {assignedOrders.slice(0, 15).map(({ order, engineerName }) => (
                    <option key={order.id} value={order.id}>
                      #{order.id} ({order.address}) — Исполнитель: {engineerName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Button
                id="btn-apply-cancel"
                variant="warning"
                disabled={!cancelOrderId}
                className="w-100 fw-bold text-dark d-flex align-items-center justify-content-center gap-2"
                onClick={handleTriggerCancel}
              >
                <XCircle size={16} />
                <span>Отменить заявку и уплотнить маршрут</span>
              </Button>
            </div>
          </Tab>

          {/* Вкладка 3: Недоступность инженера */}
          <Tab
            eventKey="unavailable"
            title={
              <span className="d-flex align-items-center gap-1">
                <UserX size={14} className="text-info" />
                <span>3. Недоступность инженера</span>
              </span>
            }
          >
            <div className="p-2">
              <p className="text-muted small mb-3">
                Инженер заболел или произошла поломка транспорта во время смены. Выполненные заявки фиксируются, а оставшиеся невыполненные работы автоматически перераспределяются между другими доступными бригадами участка.
              </p>

              <Form.Group className="mb-2">
                <Form.Label className="small text-muted">Инженер, сошедший с линии:</Form.Label>
                <Form.Select
                  size="sm"
                  value={unavailEngineerId}
                  onChange={(e) => setUnavailEngineerId(e.target.value)}
                  className="bg-dark text-light border-secondary"
                >
                  <option value="">-- Выберите инженера --</option>
                  {routes.map((r) => (
                    <option key={r.engineerId} value={r.engineerId}>
                      {r.engineer.name} ({r.totalOrders} заявок в графике)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">Время схода с линии:</Form.Label>
                <Form.Select
                  size="sm"
                  value={unavailTime}
                  onChange={(e) => setUnavailTime(e.target.value)}
                  className="bg-dark text-light border-secondary"
                  style={{ maxWidth: 160 }}
                >
                  <option value="12:00">12:00</option>
                  <option value="14:00">14:00</option>
                  <option value="16:00">16:00</option>
                </Form.Select>
              </Form.Group>

              <Button
                id="btn-apply-unavailable"
                variant="info"
                disabled={!unavailEngineerId}
                className="w-100 fw-bold text-dark d-flex align-items-center justify-content-center gap-2"
                onClick={handleTriggerUnavailable}
              >
                <CheckCircle2 size={16} />
                <span>Снять с линии и перераспределить заявки</span>
              </Button>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
};
