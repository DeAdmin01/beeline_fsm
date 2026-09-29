import React from "react";
import { Modal, Button, Table, Badge } from "react-bootstrap";
import { RefreshCw, ArrowRight, ShieldCheck } from "lucide-react";
import { PlanDiffItem } from "../core/types";

interface DiffViewerModalProps {
  show: boolean;
  onHide: () => void;
  diffs: PlanDiffItem[];
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  show,
  onHide,
  diffs
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <RefreshCw size={20} className="text-warning" />
          <span className="text-theme-main">Протокол оперативных изменений смены (Аудит назначений)</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="mb-3 text-theme-muted small">
          Журнал автоматической корректировки нарядов после оперативного вмешательства:
        </div>

        {diffs.length === 0 ? (
          <div className="text-center py-4 text-theme-muted">Изменений в расписании смены не зафиксировано.</div>
        ) : (
          <div className="table-responsive">
            <table className="fsm-table align-middle mb-0" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Действие</th>
                  <th>Наряд / Адрес</th>
                  <th>Предыдущее назначение</th>
                  <th style={{ width: 20 }}></th>
                  <th>Новое назначение</th>
                  <th>Обоснование</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, idx) => {
                  let badge = <Badge bg="secondary">Изменение</Badge>;
                  if (d.changeType === "added") {
                    badge = <Badge bg="danger" className="badge-urgent">ЭКСТРЕННО</Badge>;
                  } else if (d.changeType === "reassigned") {
                    badge = <Badge bg="warning" text="dark">ПЕРЕНАЗНАЧЕН</Badge>;
                  } else if (d.changeType === "rescheduled") {
                    badge = <Badge bg="info">СДВИГ ВРЕМЕНИ</Badge>;
                  } else if (d.changeType === "cancelled") {
                    badge = <Badge bg="secondary">АННУЛИРОВАН</Badge>;
                  } else if (d.changeType === "unassigned") {
                    badge = <Badge bg="danger">В РЕЗЕРВЕ</Badge>;
                  }

                  return (
                    <tr key={idx}>
                      <td>{badge}</td>
                      <td>
                        <div className="fw-bold text-theme-main">#{d.orderId}</div>
                        <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                          {d.orderAddress}
                        </div>
                      </td>
                      <td>
                        <span className="text-theme-muted">{d.previousEngineer || "—"}</span>
                        {d.previousTime && <div className="text-theme-dim small">{d.previousTime}</div>}
                      </td>
                      <td className="text-center text-warning">
                        <ArrowRight size={14} />
                      </td>
                      <td>
                        <span className="text-success fw-bold">{d.newEngineer || "—"}</span>
                        {d.newTime && <div className="text-info small">{d.newTime}</div>}
                      </td>
                      <td>
                        <span className="text-theme-muted small">{d.reason}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="warning" className="text-dark fw-bold" onClick={onHide} size="sm">
          Подтвердить и закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
