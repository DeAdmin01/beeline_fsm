import React, { useState } from "react";
import { Form, InputGroup, Badge, Button } from "react-bootstrap";
import { Search, Filter, HelpCircle, AlertCircle, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { Order, EngineerRoute, RouteStop } from "../core/types";

interface OrdersTableProps {
  orders: Order[];
  routes: EngineerRoute[];
  onInspectOrder: (order: Order, stop?: RouteStop, engineerId?: string) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  routes,
  onInspectOrder
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Карта быстрого сопоставления: ID наряда -> { инженер, точка маршрута, цвет }
  const assignmentMap = new Map<string, { engineerName: string; engineerId: string; stop: RouteStop; color: string }>();

  routes.forEach((route) => {
    route.stops.forEach((stop) => {
      if (stop.order) {
        assignmentMap.set(stop.order.id, {
          engineerName: route.engineer.name,
          engineerId: route.engineerId,
          stop,
          color: route.color
        });
      }
    });
  });

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.district.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "urgent") return o.priority === "urgent";
    if (filterType === "connections") return o.requiredSkill.includes("Подключение");
    if (filterType === "repairs") return o.requiredSkill.includes("Ремонт") || o.requiredSkill.includes("Ошибки");
    if (filterType === "unassigned") return !assignmentMap.has(o.id);

    return true;
  });

  return (
    <div className="fsm-card p-3">
      {/* Панель фильтров и поиска */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold small text-uppercase tracking-wider text-theme-main">
            Сменный реестр сервисных нарядов ({filteredOrders.length} из {orders.length})
          </span>
        </div>

        <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0" style={{ maxWidth: 480 }}>
          <InputGroup size="sm">
            <InputGroup.Text
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--text-muted)"
              }}
            >
              <Search size={14} />
            </InputGroup.Text>
            <Form.Control
              id="orders-search-input"
              type="text"
              placeholder="Поиск по наряду, адресу, району..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fsm-input"
            />
          </InputGroup>

          <Form.Select
            id="orders-filter-select"
            size="sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="fsm-select"
            style={{ width: 180 }}
          >
            <option value="all">Все категории</option>
            <option value="urgent">Срочные аварии</option>
            <option value="connections">Подключения</option>
            <option value="repairs">Локальный ремонт</option>
            <option value="unassigned">Невключенные</option>
          </Form.Select>
        </div>
      </div>

      {/* Таблица нарядов */}
      <div className="table-responsive" style={{ maxHeight: "calc(100vh - 230px)", minHeight: "380px" }}>
        <table className="fsm-table align-middle mb-0" style={{ fontSize: "0.82rem" }}>
          <thead className="sticky-top" style={{ zIndex: 5 }}>
            <tr>
              <th style={{ width: 90 }}>Наряд №</th>
              <th style={{ width: 160 }}>Категория / Допуск</th>
              <th>Адрес абонента и район</th>
              <th style={{ width: 130 }}>Окно абонента</th>
              <th style={{ width: 200 }}>Назначенный специалист</th>
              <th style={{ width: 130 }}>Расчетный визит</th>
              <th style={{ width: 100 }} className="text-end">Аудит</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-theme-muted py-4">
                  Наряды не найдены по текущим параметрам поиска
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const assigned = assignmentMap.get(order.id);
                const isUrgent = order.priority === "urgent";

                return (
                  <tr key={order.id}>
                    {/* Номер наряда */}
                    <td className="fw-mono text-theme-muted">#{order.id}</td>

                    {/* Категория работ и приоритет */}
                    <td>
                      {isUrgent ? (
                        <Badge bg="danger" className="badge-urgent me-1">
                          АВАРИЯ
                        </Badge>
                      ) : (
                        <span className="badge-skill me-1">{order.requiredSkill}</span>
                      )}
                      <div className="text-theme-muted" style={{ fontSize: "0.7rem" }}>
                        {order.hdType || order.bkType}
                      </div>
                    </td>

                    {/* Адрес и район */}
                    <td>
                      <div className="fw-semibold text-theme-main text-truncate" style={{ maxWidth: 300 }} title={order.address}>
                        {order.address}
                      </div>
                      <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                        {order.district}
                      </div>
                    </td>

                    {/* Временное окно клиента и дата */}
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: "var(--border-strong)",
                          color: "var(--text-main)",
                          fontWeight: 600,
                          fontSize: "0.75rem"
                        }}
                      >
                        {order.windowStart} – {order.windowEnd}
                      </span>
                      {order.date && (
                        <div className="text-theme-muted" style={{ fontSize: "0.7rem", marginTop: 2 }}>
                          {order.date} {order.dayOfWeekRu ? `(${order.dayOfWeekRu.slice(0, 2)})` : ""}
                        </div>
                      )}
                    </td>

                    {/* Назначенный инженер */}
                    <td>
                      {assigned ? (
                        <div className="d-flex align-items-center gap-1.5">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: assigned.color,
                              flexShrink: 0
                            }}
                          />
                          <span className="text-theme-main fw-medium">{assigned.engineerName}</span>
                        </div>
                      ) : (
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
                          В резерве
                        </span>
                      )}
                    </td>

                    {/* Расчетное время визита */}
                    <td>
                      {assigned ? (
                        <div className="small">
                          <div className="text-theme-main fw-semibold">
                            {assigned.stop.startWorkTime} – {assigned.stop.endWorkTime}
                          </div>
                          <div className="text-theme-muted" style={{ fontSize: "0.7rem" }}>
                            Доезд: {assigned.stop.travelDurationMinutes} мин
                          </div>
                        </div>
                      ) : (
                        <span className="text-theme-dim small">—</span>
                      )}
                    </td>

                    {/* Аудит и обоснование решения (XAI) */}
                    <td className="text-end">
                      <Button
                        id={`btn-explain-${order.id}`}
                        variant="outline-secondary"
                        size="sm"
                        style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                        className="d-inline-flex align-items-center gap-1"
                        onClick={() =>
                          onInspectOrder(order, assigned?.stop, assigned?.engineerId)
                        }
                      >
                        <HelpCircle size={12} className="text-warning" />
                        <span>Почему?</span>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
