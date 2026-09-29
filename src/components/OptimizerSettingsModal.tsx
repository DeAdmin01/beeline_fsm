import React, { useState } from "react";
import { Modal, Button, Form, Row, Col, Badge } from "react-bootstrap";
import { 
  Sliders, 
  Sparkles, 
  Navigation, 
  MapPin, 
  Users, 
  Scale, 
  TrainFront,
  RotateCcw,
  CheckCircle2,
  Car
} from "lucide-react";
import { 
  OptimizerSettings, 
  OptimizationProfile, 
  DEFAULT_OPTIMIZER_SETTINGS 
} from "../core/types";

interface OptimizerSettingsModalProps {
  show: boolean;
  onHide: () => void;
  settings: OptimizerSettings;
  onSaveSettings: (settings: OptimizerSettings) => void;
}

export const OptimizerSettingsModal: React.FC<OptimizerSettingsModalProps> = ({
  show,
  onHide,
  settings,
  onSaveSettings
}) => {
  const [current, setCurrent] = useState<OptimizerSettings>(settings);

  // Синхронизация состояния настроек при повторном открытии модального окна
  React.useEffect(() => {
    setCurrent(settings);
  }, [settings, show]);

  const handleProfileSelect = (profile: OptimizationProfile) => {
    switch (profile) {
      case "balanced":
        setCurrent({
          ...current,
          profile: "balanced",
          priorityMileage: 8,
          priorityCluster: 9,
          priorityFleet: 6,
          priorityBalance: 5,
          useMetroTransit: true
        });
        break;
      case "min_mileage":
        setCurrent({
          ...current,
          profile: "min_mileage",
          priorityMileage: 10,
          priorityCluster: 10,
          priorityFleet: 4,
          priorityBalance: 3,
          useMetroTransit: true
        });
        break;
      case "min_fleet":
        setCurrent({
          ...current,
          profile: "min_fleet",
          priorityMileage: 6,
          priorityCluster: 7,
          priorityFleet: 10,
          priorityBalance: 2,
          useMetroTransit: true
        });
        break;
      case "max_sla":
        setCurrent({
          ...current,
          profile: "max_sla",
          priorityMileage: 6,
          priorityCluster: 8,
          priorityFleet: 4,
          priorityBalance: 8,
          useMetroTransit: true
        });
        break;
    }
  };

  const handleReset = () => {
    setCurrent(DEFAULT_OPTIMIZER_SETTINGS);
  };

  const handleSave = () => {
    onSaveSettings(current);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <Sliders size={20} className="text-warning" />
          <span className="text-theme-main">Настройки и приоритеты интеллектуального алгоритма</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ maxHeight: "78vh", overflowY: "auto" }}>
        {/* Раздел 1: Профили оптимизации (готовые бизнес-сценарии) */}
        <div className="mb-4">
          <label className="fw-bold small text-uppercase tracking-wider text-theme-muted mb-2 d-block">
            1. Профиль оптимизации (Сценарии планирования)
          </label>
          <Row className="g-2">
            {/* Профиль 1: Сбалансированный */}
            <Col xs={12} sm={6}>
              <div
                onClick={() => handleProfileSelect("balanced")}
                className={`fsm-card p-3 h-100 cursor-pointer transition-all ${
                  current.profile === "balanced"
                    ? "border-warning bg-warning bg-opacity-10"
                    : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-theme-main d-flex align-items-center gap-1.5">
                    <Sparkles size={16} className="text-warning" />
                    <span>Сбалансированный</span>
                  </span>
                  {current.profile === "balanced" && (
                    <Badge bg="warning" className="text-dark fw-bold" style={{ fontSize: "0.65rem" }}>
                      Активен
                    </Badge>
                  )}
                </div>
                <p className="text-theme-muted small mb-0" style={{ fontSize: "0.78rem" }}>
                  Оптимальный баланс между сокращением автопарка, минимальным пробегом и 100% соблюдением окон клиентов.
                </p>
              </div>
            </Col>

            {/* Профиль 2: Минимальный пробег (Эко-ГСМ) */}
            <Col xs={12} sm={6}>
              <div
                onClick={() => handleProfileSelect("min_mileage")}
                className={`fsm-card p-3 h-100 cursor-pointer transition-all ${
                  current.profile === "min_mileage"
                    ? "border-warning bg-warning bg-opacity-10"
                    : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-theme-main d-flex align-items-center gap-1.5">
                    <Navigation size={16} className="text-info" />
                    <span>Минимум пробега (Эко-ГСМ)</span>
                  </span>
                  {current.profile === "min_mileage" && (
                    <Badge bg="warning" className="text-dark fw-bold" style={{ fontSize: "0.65rem" }}>
                      Активен
                    </Badge>
                  )}
                </div>
                <p className="text-theme-muted small mb-0" style={{ fontSize: "0.78rem" }}>
                  Максимальная локализация в пределах районов, устранение транзитных переездов через город, минимальный расход бензина.
                </p>
              </div>
            </Col>

            {/* Профиль 3: Минимальный автопарк */}
            <Col xs={12} sm={6}>
              <div
                onClick={() => handleProfileSelect("min_fleet")}
                className={`fsm-card p-3 h-100 cursor-pointer transition-all ${
                  current.profile === "min_fleet"
                    ? "border-warning bg-warning bg-opacity-10"
                    : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-theme-main d-flex align-items-center gap-1.5">
                    <Users size={16} className="text-success" />
                    <span>Минимум автопарка</span>
                  </span>
                  {current.profile === "min_fleet" && (
                    <Badge bg="warning" className="text-dark fw-bold" style={{ fontSize: "0.65rem" }}>
                      Активен
                    </Badge>
                  )}
                </div>
                <p className="text-theme-muted small mb-0" style={{ fontSize: "0.78rem" }}>
                  Плотная упаковка расписаний, высвобождение максимального количества специалистов в дежурный резерв.
                </p>
              </div>
            </Col>

            {/* Профиль 4: Максимальный запас надежности SLA */}
            <Col xs={12} sm={6}>
              <div
                onClick={() => handleProfileSelect("max_sla")}
                className={`fsm-card p-3 h-100 cursor-pointer transition-all ${
                  current.profile === "max_sla"
                    ? "border-warning bg-warning bg-opacity-10"
                    : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-theme-main d-flex align-items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>Максимальный запас SLA</span>
                  </span>
                  {current.profile === "max_sla" && (
                    <Badge bg="warning" className="text-dark fw-bold" style={{ fontSize: "0.65rem" }}>
                      Активен
                    </Badge>
                  )}
                </div>
                <p className="text-theme-muted small mb-0" style={{ fontSize: "0.78rem" }}>
                  Увеличенные временные интервалы между выездами для гарантированного исключения опозданий при пробках.
                </p>
              </div>
            </Col>
          </Row>
        </div>

        {/* Раздел 2: Тонкая настройка весовых коэффициентов целевой функции */}
        <div className="mb-4">
          <label className="fw-bold small text-uppercase tracking-wider text-theme-muted mb-3 d-block">
            2. Весовые коэффициенты оптимизатора
          </label>
          <div className="fsm-card p-3 d-flex flex-column gap-3">
            {/* Вес 1: Сокращение пробега */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-theme-main d-flex align-items-center gap-1.5">
                  <Navigation size={14} className="text-info" />
                  <span>Приоритет сокращения пробега (ГСМ):</span>
                </span>
                <span className="badge bg-secondary rounded-pill">{current.priorityMileage} / 10</span>
              </div>
              <Form.Range
                min={1}
                max={10}
                value={current.priorityMileage}
                onChange={(e) =>
                  setCurrent({ ...current, priorityMileage: parseInt(e.target.value, 10), profile: "balanced" })
                }
              />
            </div>

            {/* Вес 2: Кластеризация и кучность в районах */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-theme-main d-flex align-items-center gap-1.5">
                  <MapPin size={14} className="text-warning" />
                  <span>Территориальная кучность (Кластеризация по районам):</span>
                </span>
                <span className="badge bg-secondary rounded-pill">{current.priorityCluster} / 10</span>
              </div>
              <Form.Range
                min={1}
                max={10}
                value={current.priorityCluster}
                onChange={(e) =>
                  setCurrent({ ...current, priorityCluster: parseInt(e.target.value, 10), profile: "balanced" })
                }
              />
            </div>

            {/* Вес 3: Высвобождение автопарка */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-theme-main d-flex align-items-center gap-1.5">
                  <Users size={14} className="text-success" />
                  <span>Приоритет высвобождения бригад в резерв:</span>
                </span>
                <span className="badge bg-secondary rounded-pill">{current.priorityFleet} / 10</span>
              </div>
              <Form.Range
                min={1}
                max={10}
                value={current.priorityFleet}
                onChange={(e) =>
                  setCurrent({ ...current, priorityFleet: parseInt(e.target.value, 10), profile: "balanced" })
                }
              />
            </div>

            {/* Вес 4: Равномерность нагрузки */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-theme-main d-flex align-items-center gap-1.5">
                  <Scale size={14} className="text-secondary" />
                  <span>Равномерность распределения нагрузки между сотрудниками:</span>
                </span>
                <span className="badge bg-secondary rounded-pill">{current.priorityBalance} / 10</span>
              </div>
              <Form.Range
                min={1}
                max={10}
                value={current.priorityBalance}
                onChange={(e) =>
                  setCurrent({ ...current, priorityBalance: parseInt(e.target.value, 10), profile: "balanced" })
                }
              />
            </div>
          </div>
        </div>

        {/* Раздел 3: Модель мультимодального городского транзита (метро и дорожный трафик) */}
        <div>
          <label className="fw-bold small text-uppercase tracking-wider text-theme-muted mb-2 d-block">
            3. Мультимодальная городская логистика Москвы
          </label>
          <div className="fsm-card p-3">
            <Form.Check
              type="switch"
              id="switch-metro-transit"
              label={
                <div className="ms-1">
                  <div className="fw-semibold text-theme-main d-flex align-items-center gap-1">
                    <TrainFront size={15} className="text-danger" />
                    <span>Учитывать станции Московского метрополитена для инженеров на ОТ</span>
                  </div>
                  <div className="text-theme-muted small" style={{ fontSize: "0.78rem" }}>
                    Для дистанций свыше 1.2 км рассчитывается пеший маршрут до ближайшей станции, перегон на метро (40 км/ч) и выход к адресу абонента.
                  </div>
                </div>
              }
              checked={current.useMetroTransit}
              onChange={(e) => setCurrent({ ...current, useMetroTransit: e.target.checked })}
              className="mb-3"
            />

            <Form.Check
              type="switch"
              id="switch-traffic-factors"
              label={
                <div className="ms-1">
                  <div className="fw-semibold text-theme-main d-flex align-items-center gap-1">
                    <Car size={15} className="text-info" />
                    <span>Учитывать дорожный коэффициент (1.32) и задержки во дворах</span>
                  </div>
                  <div className="text-theme-muted small" style={{ fontSize: "0.78rem" }}>
                    Автомобильные маршруты рассчитываются с поправкой на извилистость дорожной сети и 4–5 минут на парковку и подъем к абоненту.
                  </div>
                </div>
              }
              checked={current.useTrafficFactors}
              onChange={(e) => setCurrent({ ...current, useTrafficFactors: e.target.checked })}
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={handleReset}
          className="d-flex align-items-center gap-1"
        >
          <RotateCcw size={14} />
          <span>По умолчанию</span>
        </Button>

        <div className="d-flex gap-2">
          <Button variant="secondary" size="sm" onClick={onHide}>
            Отмена
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="fw-bold text-dark px-3 shadow-sm"
            onClick={handleSave}
          >
            Применить и пересчитать план
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
