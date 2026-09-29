import React from "react";
import { Modal, Button, Table, Badge, Form } from "react-bootstrap";
import { Users, Truck, Wrench, Clock, ShieldCheck } from "lucide-react";
import { Engineer, Skill, TransportType } from "../core/types";

interface EngineerPoolModalProps {
  show: boolean;
  onHide: () => void;
  engineers: Engineer[];
  onToggleEngineer: (id: string) => void;
  onUpdateTransport: (id: string, transport: TransportType) => void;
}

export const EngineerPoolModal: React.FC<EngineerPoolModalProps> = ({
  show,
  onHide,
  engineers,
  onToggleEngineer,
  onUpdateTransport
}) => {
  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <Users size={20} className="text-warning" />
          <span>Дежурный штат специалистов и матрица квалификаций</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="text-muted small mb-3">
          Оперативное управление составом дежурной смены участка, графиком дежурства, транспортным средством и допусками к видам работ:
        </div>

        <div className="table-responsive">
          <Table hover size="sm" variant="dark" className="align-middle mb-0" style={{ fontSize: "0.82rem" }}>
            <thead className="bg-secondary text-light">
              <tr>
                <th style={{ width: 80 }}>На смене</th>
                <th>Специалист / Бригада</th>
                <th style={{ width: 140 }}>График смены</th>
                <th style={{ width: 220 }}>Транспортное средство</th>
                <th>Матрица квалификаций и допусков</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((eng) => (
                <tr key={eng.id} className={!eng.isActive ? "opacity-50" : ""}>
                  <td>
                    <Form.Check
                      type="switch"
                      id={`switch-eng-${eng.id}`}
                      checked={eng.isActive}
                      onChange={() => onToggleEngineer(eng.id)}
                    />
                  </td>
                  <td>
                    <div className="fw-bold text-light">{eng.name}</div>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Базовый склад: {eng.startDepot.address}
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-dark border border-secondary text-info">
                      {eng.shiftStart} — {eng.shiftEnd}
                    </span>
                  </td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={eng.transport}
                      onChange={(e) => onUpdateTransport(eng.id, e.target.value as TransportType)}
                      className="bg-dark text-light border-secondary border-opacity-50"
                      style={{ fontSize: "0.78rem" }}
                    >
                      <option value="Автомобиль">🚗 Автомобиль</option>
                      <option value="Общественный транспорт">🚇 Общ. транспорт</option>
                      <option value="Велосипед">🚲 Велосипед</option>
                      <option value="Пешеход">🚶 Пешеход</option>
                    </Form.Select>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {eng.skills.map((s, idx) => (
                        <span key={idx} className="badge-skill">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="warning" className="text-dark fw-bold" onClick={onHide} size="sm">
          Применить и закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
