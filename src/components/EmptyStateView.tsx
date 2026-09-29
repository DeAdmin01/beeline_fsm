import React, { useState, useRef } from "react";
import { Container, Row, Col, Button, Form, Card, Alert } from "react-bootstrap";
import { Upload, FileText, Database, Sparkles, Calendar, Clock, MapPin, CheckCircle2, Shield, Layers } from "lucide-react";

interface EmptyStateViewProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onTextPasted: (text: string, areaName: string) => void;
  onLoadDemoData: () => void;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  onFilesSelected,
  onTextPasted,
  onLoadDemoData
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pastedAreaName, setPastedAreaName] = useState("Мой сектор");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = "";
    }
  };

  const handlePastedSubmit = () => {
    if (!pastedText.trim()) return;
    onTextPasted(pastedText, pastedAreaName.trim() || "Сектор");
    setPastedText("");
    setShowPasteArea(false);
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100 p-4"
      style={{
        background: "radial-gradient(circle at 50% 20%, rgba(255, 184, 0, 0.08), transparent 70%), var(--bg-app)",
        color: "var(--text-main)"
      }}
    >
      <div style={{ maxWidth: 840, width: "100%" }}>
        {/* Заголовок бренда и описание сервиса */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center gap-2 mb-2">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#ffb800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
                fontWeight: 900,
                fontSize: 18,
                boxShadow: "0 4px 14px rgba(255, 184, 0, 0.4)"
              }}
            >
              •)
            </div>
            <h3 className="fw-bold tracking-tight mb-0 text-theme-main">билайн бизнес • FSM PRO</h3>
          </div>
          <h4 className="fw-bold text-theme-main mb-2">Интеллектуальный сервис планирования маршрутов ШПД</h4>
          <p className="text-theme-muted mx-auto" style={{ maxWidth: 640, fontSize: "0.92rem" }}>
            Программа изначально не содержит предустановленных данных и готова к расчету любого региона.
            Загрузите один или несколько CSV-файлов (поддерживаются множественные даты, участки и кодировки).
          </p>
        </div>

        {/* Область Drag & Drop для перетаскивания файлов */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-5 rounded-4 text-center cursor-pointer transition-all mb-4 ${isDragging ? "border-warning bg-warning bg-opacity-10" : ""}`}
          style={{
            border: `2px dashed ${isDragging ? "var(--bs-warning)" : "var(--border-strong)"}`,
            background: "var(--bg-card)",
            cursor: "pointer",
            boxShadow: isDragging ? "0 0 20px rgba(255, 184, 0, 0.2)" : "0 4px 16px rgba(0, 0, 0, 0.1)"
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".csv,.txt,.json"
            style={{ display: "none" }}
          />

          <div
            className="d-inline-flex p-3 rounded-circle mb-3"
            style={{ background: "rgba(255, 184, 0, 0.15)", color: "var(--beeline-yellow)" }}
          >
            <Upload size={38} />
          </div>

          <h5 className="fw-bold text-theme-main mb-1">
            Перетащите сюда один или несколько CSV-файлов
          </h5>
          <div className="text-theme-muted small mb-3">
            или нажмите для выбора файлов на компьютере (поддерживаются выгрузки Beekeeper / HelpDesk)
          </div>

          <div className="d-flex justify-content-center gap-2">
            <Button
              variant="warning"
              className="fw-bold px-4 py-2"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Выбрать файлы (можно несколько)
            </Button>

            <Button
              variant="outline-secondary"
              className="px-3"
              onClick={(e) => {
                e.stopPropagation();
                setShowPasteArea(!showPasteArea);
              }}
            >
              Вставить текст CSV
            </Button>
          </div>
        </div>

        {/* Форма для прямой вставки текста CSV из буфера обмена */}
        {showPasteArea && (
          <div className="fsm-card p-3 mb-4 animate-fade-in">
            <h6 className="fw-bold text-theme-main mb-2">Вставка содержимого CSV из буфера обмена:</h6>
            <Form.Group className="mb-2">
              <Form.Label className="small text-theme-muted">Название региона / сектора:</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={pastedAreaName}
                onChange={(e) => setPastedAreaName(e.target.value)}
                placeholder="Например: Восток, Казань, Санкт-Петербург"
                className="fsm-input mb-2"
                style={{ maxWidth: 300 }}
              />
              <Form.Control
                as="textarea"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Заявка;Вид услуги BK;Услуга BK;Тип заявки HD;Начало;Окончание;Подокруг;Адрес..."
                className="fsm-input"
                style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" size="sm" onClick={() => setShowPasteArea(false)}>
                Отмена
              </Button>
              <Button variant="warning" size="sm" onClick={handlePastedSubmit} className="fw-semibold">
                Загрузить из текста
              </Button>
            </div>
          </div>
        )}

        {/* Кнопка быстрой загрузки тестового демонстрационного набора */}
        <div className="d-flex justify-content-center mb-4">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onLoadDemoData}
            className="d-flex align-items-center gap-2 py-2 px-3"
            style={{ fontSize: "0.84rem", borderColor: "var(--border-color)" }}
          >
            <Sparkles size={16} className="text-warning" />
            <span>Загрузить тестовый демонстрационный набор (3 сектора Москвы)</span>
          </Button>
        </div>

        {/* Карточки ключевых возможностей платформы */}
        <Row className="g-3">
          <Col xs={12} sm={6} md={3}>
            <div className="fsm-card p-3 h-100 text-center">
              <Layers size={22} className="text-warning mb-2" />
              <div className="fw-bold text-theme-main small mb-1">Множественные файлы</div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                Загружайте несколько CSV сразу. Система сама разделит данные по участкам.
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <div className="fsm-card p-3 h-100 text-center">
              <Calendar size={22} className="text-warning mb-2" />
              <div className="fw-bold text-theme-main small mb-1">Календарь и даты</div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                Распознавание любых дат (28.09, 29.09 и т.д.) и переключение между днями недели.
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <div className="fsm-card p-3 h-100 text-center">
              <Clock size={22} className="text-warning mb-2" />
              <div className="fw-bold text-theme-main small mb-1">Гибкие смены бригад</div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                Графики 5/2, 2/2, индивидуальные смены и точные допустимые периоды работы.
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <div className="fsm-card p-3 h-100 text-center">
              <MapPin size={22} className="text-warning mb-2" />
              <div className="fw-bold text-theme-main small mb-1">Любые регионы</div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>
                Автоматическая привязка и расчет опорных складов для любого города РФ.
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};
