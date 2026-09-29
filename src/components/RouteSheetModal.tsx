import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { Printer, Package } from "lucide-react";
import { EngineerRoute } from "../core/types";

interface RouteSheetModalProps {
  show: boolean;
  onHide: () => void;
  routes: EngineerRoute[];
  selectedDate?: string;
}

export const RouteSheetModal: React.FC<RouteSheetModalProps> = ({
  show,
  onHide,
  routes,
  selectedDate
}) => {
  const [selectedEngId, setSelectedEngId] = useState<string>(routes[0]?.engineerId || "");

  const activeRoute = routes.find((r) => r.engineerId === selectedEngId) || routes[0];

  if (!activeRoute) return null;

  // Расчет необходимого оборудования и комплектующих по типам нарядов
  let routersCount = 0;
  let tvBoxesCount = 0;
  let opticalCablesCount = 0;

  activeRoute.orders.forEach((o) => {
    const isConn = o.bkType.toLowerCase().includes("подключение");
    const isAddon = o.bkType.toLowerCase().includes("дозаказ");
    if (isConn || isAddon) {
      routersCount += 1;
      if (o.hdType.toLowerCase().includes("тв") || o.hdType.toLowerCase().includes("приставка")) {
        tvBoxesCount += 1;
      }
      opticalCablesCount += 1;
    }
  });

  const currentDateStr =
    selectedDate && selectedDate !== "all"
      ? selectedDate
      : new Date().toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

  const handlePrint = () => {
    window.print();
  };

  // Шаблон печатного документа путевого маршрутного листа А4
  const printableContent = (
    <div id="printable-route-sheet" className="print-page">
      {/* Официальная шапка документа */}
      <div className="print-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11pt", fontWeight: "bold" }}>ПАО «ВымпелКом» (билайн бизнес)</div>
            <div style={{ fontSize: "8.5pt", color: "#444" }}>
              Дирекция по сервисному обслуживанию клиентов ШПД
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "8.5pt" }}>
            <b>Форма: ФСМ-04/СМЕНА</b><br />
            Дата: <b>{currentDateStr}</b>
          </div>
        </div>

        <div className="print-title">
          СМЕННЫЙ ПУТЕВОЙ МАРШРУТНЫЙ ЛИСТ № МЛ-{activeRoute.engineerId.toUpperCase()}-{currentDateStr.replace(/\./g, "")}
        </div>
      </div>

      {/* Метаданные смены и специалиста */}
      <div className="print-meta-grid">
        <div><b>Специалист:</b> {activeRoute.engineer.name}</div>
        <div><b>Транспорт:</b> {activeRoute.engineer.transport}</div>
        <div><b>Смена:</b> {activeRoute.shiftStart} — {activeRoute.shiftEnd}</div>
        <div><b>Опорный склад:</b> {activeRoute.engineer.startDepot.address}</div>
        <div><b>Количество нарядов:</b> {activeRoute.totalOrders} адресов</div>
        <div><b>Расчетный километраж:</b> {activeRoute.totalDistanceKm} км ({activeRoute.totalTravelTimeMin} мин пути)</div>
      </div>

      {/* Раздел 1: Ведомость комплектации на складе ТМЦ */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: "4px", textTransform: "uppercase" }}>
          1. Ведомость комплектации на складе (утренняя выдача ТМЦ)
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: "30px" }}>№</th>
              <th>Наименование оборудования / ТМЦ</th>
              <th style={{ width: "90px" }}>По нарядам</th>
              <th style={{ width: "100px" }}>Выдано кладовщиком</th>
              <th style={{ width: "120px" }}>Роспись кладовщика</th>
              <th style={{ width: "100px" }}>Возврат остатка</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>1</td>
              <td>Wi-Fi Роутер Beeline Smart Box Giga (с адаптером питания)</td>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>{Math.max(1, routersCount)} шт.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>2</td>
              <td>ТВ-приставка Билайн ТВ (Android TV, пульт, HDMI)</td>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>{Math.max(0, tvBoxesCount)} шт.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>3</td>
              <td>Оптический патчкорд SC/APC — SC/APC (15м)</td>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>{Math.max(1, opticalCablesCount)} шт.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>4</td>
              <td>Кабель витая пара UTP 4 пары (бухта/отрез)</td>
              <td style={{ textAlign: "center" }}>1 комплект</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>5</td>
              <td>Коннекторы RJ-45 (упаковка)</td>
              <td style={{ textAlign: "center" }}>15 шт.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Раздел 2: Порядковый график выполнения нарядов */}
      <div>
        <div style={{ fontWeight: "bold", fontSize: "9pt", marginBottom: "4px", textTransform: "uppercase" }}>
          2. Порядковый график выполнения нарядов
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: "25px" }}>№</th>
              <th style={{ width: "80px" }}>Время визита</th>
              <th style={{ width: "80px" }}>Окно абонента</th>
              <th>Адрес абонента и район</th>
              <th style={{ width: "150px" }}>Вид работ / Услуга</th>
              <th style={{ width: "70px" }}>Отметка</th>
              <th style={{ width: "110px" }}>Подпись абонента</th>
            </tr>
          </thead>
          <tbody>
            {activeRoute.stops.map((stop, idx) => {
              if (stop.isDepot) {
                return (
                  <tr key={stop.id} style={{ backgroundColor: "#f8f9fa" }}>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{idx}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{stop.startWorkTime}</td>
                    <td style={{ textAlign: "center", color: "#666" }}>—</td>
                    <td><b>Базовый склад:</b> {stop.address}</td>
                    <td>Выезд со склада участка</td>
                    <td style={{ textAlign: "center" }}>Старт</td>
                    <td></td>
                  </tr>
                );
              }

              const isUrgent = stop.order?.priority === "urgent";

              return (
                <tr key={stop.id}>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{idx}</td>
                  <td style={{ textAlign: "center" }}>
                    <b>{stop.startWorkTime}</b> – {stop.endWorkTime}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {stop.order?.windowStart} – {stop.order?.windowEnd}
                  </td>
                  <td>
                    <b>{stop.address}</b>
                    <div style={{ fontSize: "7.5pt", color: "#444" }}>
                      {stop.district} • плечо {stop.travelDistanceKm} км ({stop.travelDurationMinutes} мин)
                    </div>
                  </td>
                  <td>
                    {isUrgent ? <b>[АВАРИЯ] </b> : null}
                    {stop.order?.hdType || stop.order?.bkType}
                  </td>
                  <td style={{ textAlign: "center" }}></td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Раздел 3: Подписи ответственных лиц */}
      <div className="print-signatures">
        <div className="print-sig-col">
          <div>Диспетчер смены:</div>
          <div className="print-sig-line"></div>
        </div>
        <div className="print-sig-col">
          <div>Оборудование выдал (склад):</div>
          <div className="print-sig-line"></div>
        </div>
        <div className="print-sig-col">
          <div>Маршрут принял (инженер):</div>
          <div className="print-sig-line"></div>
        </div>
      </div>
    </div>
  );

  const printPortalNode = document.getElementById("print-portal");

  return (
    <>
      {/* Модальное окно предпросмотра маршрутного листа на экране */}
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <Package size={20} className="text-warning" />
            <span className="text-theme-main">Сменный маршрутный лист и комплектация</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Панель управления и выбора инженера */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 p-3 fsm-card">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold small text-uppercase text-theme-muted">Специалист:</span>
              <Form.Select
                id="select-engineer-routesheet"
                size="sm"
                value={activeRoute.engineerId}
                onChange={(e) => setSelectedEngId(e.target.value)}
                className="fsm-select"
                style={{ width: "300px" }}
              >
                {routes.map((r) => (
                  <option key={r.engineerId} value={r.engineerId}>
                    {r.engineer.name} ({r.totalOrders} нарядов, {r.totalDistanceKm} км)
                  </option>
                ))}
              </Form.Select>
            </div>

            <Button
              id="btn-print-route-sheet"
              variant="warning"
              size="sm"
              className="fw-bold text-dark d-flex align-items-center gap-2 px-3 shadow-sm"
              onClick={handlePrint}
            >
              <Printer size={16} />
              <span>Печать листа (А4)</span>
            </Button>
          </div>

          {/* Контейнер экранного предпросмотра */}
          <div className="bg-white text-dark p-4 rounded shadow-sm" style={{ border: "1px solid var(--border-color)" }}>
            {printableContent}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} size="sm">
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Портал для чистой печати документа без элементов UI браузера */}
      {printPortalNode && ReactDOM.createPortal(printableContent, printPortalNode)}
    </>
  );
};
