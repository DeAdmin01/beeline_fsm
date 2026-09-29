import React, { useRef } from "react";
import { Container, Nav, Form, Button, Dropdown } from "react-bootstrap";
import { 
  Map, 
  Calendar, 
  Table as TableIcon, 
  Users, 
  BarChart2, 
  Zap, 
  MoreVertical, 
  Printer, 
  Upload, 
  BookOpen, 
  RotateCcw, 
  Play, 
  Sun, 
  Moon,
  Sparkles,
  MapPin,
  CheckCircle2,
  Sliders,
  Trash2,
  Plus
} from "lucide-react";
import { Depot, Order } from "../core/types";
import { parseDateString, getDayOfWeekRuShort, getDayOfWeekRuName } from "../core/utils/scheduleUtils";

export type NavTab = "map" | "timeline" | "orders" | "brigades" | "analytics";

interface HeaderProps {
  currentArea: string;
  allAreas: string[];
  onSelectArea: (area: string) => void;
  availableDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  algorithmType: "baseline_fifo" | "advanced_optimizer";
  onToggleAlgorithm: () => void;
  onRunOptimization: () => void;
  onOpenLiveDispatchModal: () => void;
  onOpenRouteSheetModal: () => void;
  onOpenInstructionModal: () => void;
  onOpenSettingsModal?: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onClearData: () => void;
  currentDepot: Depot;
  isSimulated: boolean;
  onResetSimulation: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  ordersCount: number;
  activeEngineersCount: number;
  totalEngineersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentArea,
  allAreas,
  onSelectArea,
  availableDates,
  selectedDate,
  onSelectDate,
  activeTab,
  onSelectTab,
  algorithmType,
  onToggleAlgorithm,
  onRunOptimization,
  onOpenLiveDispatchModal,
  onOpenRouteSheetModal,
  onOpenInstructionModal,
  onOpenSettingsModal,
  onUploadFiles,
  onClearData,
  currentDepot,
  isSimulated,
  onResetSimulation,
  theme,
  onToggleTheme,
  ordersCount,
  activeEngineersCount,
  totalEngineersCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  const selectedDateObj = parseDateString(selectedDate);
  const selectedDayName = selectedDateObj ? getDayOfWeekRuName(selectedDateObj) : "";

  return (
    <header className="fsm-header shadow-sm">
      {/* Верхний уровень: Бренд, сектор, сводка смены и панель оперативных действий */}
      <div
        className="px-3 py-2 border-bottom"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-surface)"
        }}
      >
        <Container fluid className="px-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
          {/* Левый блок: Логотип, территориальный сектор и селектор рабочей даты */}
          <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#ffb800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#000000",
                  fontWeight: 900,
                  fontSize: 13,
                  boxShadow: "0 2px 6px rgba(255,184,0,0.3)"
                }}
              >
                •)
              </div>
              <div className="d-flex align-items-baseline gap-1">
                <span className="fw-bold tracking-tight text-theme-main" style={{ fontSize: "1.05rem" }}>
                  билайн бизнес
                </span>
                <span
                  className="badge rounded-pill fw-bold"
                  style={{
                    fontSize: "0.62rem",
                    background: "rgba(255,184,0,0.15)",
                    color: "var(--beeline-yellow)",
                    border: "1px solid rgba(255,184,0,0.3)"
                  }}
                >
                  FSM PRO
                </span>
              </div>
            </div>

            <div className="vr d-none d-sm-block" style={{ height: 20, opacity: 0.2 }} />

            {/* Выбор территориального участка */}
            <div className="d-flex align-items-center gap-1">
              <MapPin size={14} className="text-warning d-none d-sm-block" />
              <Form.Select
                id="area-select"
                size="sm"
                value={currentArea}
                onChange={(e) => onSelectArea(e.target.value)}
                className="fsm-select fw-semibold"
                style={{ minWidth: "130px", fontSize: "0.82rem", padding: "4px 8px" }}
              >
                {allAreas.map((area) => (
                  <option key={area} value={area}>
                    Участок {area}
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* Выбор рабочего дня смены из календаря */}
            {availableDates.length > 0 && (
              <div className="d-flex align-items-center gap-1">
                <Calendar size={14} className="text-warning d-none d-sm-block" />
                <Form.Select
                  id="date-select"
                  size="sm"
                  value={selectedDate}
                  onChange={(e) => onSelectDate(e.target.value)}
                  className="fsm-select fw-semibold"
                  style={{ minWidth: "145px", fontSize: "0.82rem", padding: "4px 8px" }}
                  title="Выберите рабочий день для планирования"
                >
                  {availableDates.map((dateStr) => {
                    const parsed = parseDateString(dateStr);
                    const dow = parsed ? getDayOfWeekRuShort(parsed) : "";
                    return (
                      <option key={dateStr} value={dateStr}>
                        📅 {dateStr} ({dow})
                      </option>
                    );
                  })}
                  <option value="all">📅 Все даты ({availableDates.length})</option>
                </Form.Select>
              </div>
            )}
          </div>

          {/* Центральный блок: Индикаторы смены и общая статистика нарядов */}
          <div className="d-none d-xl-flex align-items-center gap-3 small text-theme-muted">
            <span className="d-flex align-items-center gap-1">
              <Users size={14} className="text-warning" />
              <span className="text-theme-main fw-bold">{activeEngineersCount}</span>
              <span>из {totalEngineersCount} бригад на смене</span>
            </span>
            <span className="text-dim">•</span>
            <span className="d-flex align-items-center gap-1">
              <TableIcon size={14} className="text-info" />
              <span className="text-theme-main fw-bold">{ordersCount}</span> нарядов
            </span>
            {selectedDate && selectedDate !== "all" && (
              <>
                <span className="text-dim">•</span>
                <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1">
                  {selectedDayName}
                </span>
              </>
            )}
          </div>

          {/* Правый блок: Загрузка файлов, переключатель алгоритма, тема и меню действий */}
          <div className="d-flex align-items-center gap-2">
            {/* Кнопка быстрой загрузки файлов CSV */}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="d-flex align-items-center gap-1 py-1 px-2 text-theme-muted"
              style={{ fontSize: "0.78rem" }}
              title="Загрузить дополнительные CSV-файлы"
            >
              <Upload size={13} className="text-warning" />
              <span className="d-none d-sm-inline">Загрузить CSV</span>
            </Button>

            {/* Переключатель алгоритма планирования */}
            <Button
              id="btn-toggle-algorithm"
              variant={algorithmType === "advanced_optimizer" ? "outline-warning" : "outline-secondary"}
              size="sm"
              onClick={onToggleAlgorithm}
              className="d-none d-md-flex align-items-center gap-1 py-1 px-2"
              style={{ fontSize: "0.78rem" }}
              title="Переключить режим: Интеллектуальный оптимизатор / По очереди"
            >
              <Sparkles size={13} />
              <span>{algorithmType === "advanced_optimizer" ? "Оптимизация: Вкл" : "По очереди"}</span>
            </Button>

            {/* Кнопка открытия модального окна оперативного управления */}
            <Button
              id="btn-live-dispatch"
              variant="warning"
              size="sm"
              onClick={onOpenLiveDispatchModal}
              className="fw-bold text-dark d-flex align-items-center gap-1 shadow-sm py-1 px-3"
              style={{ fontSize: "0.82rem" }}
            >
              <Zap size={14} />
              <span>Оперативное управление</span>
            </Button>

            {/* Кнопка переключения темы оформления (Светлая / Темная) */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={onToggleTheme}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-1"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                borderColor: "var(--border-strong)",
                color: "var(--text-main)",
                background: "transparent"
              }}
              title={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
            >
              {theme === "dark" ? (
                <Sun size={16} className="text-warning" />
              ) : (
                <Moon size={16} style={{ color: "#0284c7" }} />
              )}
            </button>

            {/* Выпадающее меню дополнительных действий и настроек диспетчера */}
            <Dropdown align="end">
              <Dropdown.Toggle
                id="dropdown-actions-menu"
                variant="outline-secondary"
                size="sm"
                className="d-flex align-items-center justify-content-center p-1"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  borderColor: "var(--border-strong)"
                }}
              >
                <MoreVertical size={16} />
              </Dropdown.Toggle>

              <Dropdown.Menu
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                  fontSize: "0.85rem",
                  minWidth: 240
                }}
              >
                <Dropdown.Header className="text-theme-muted fw-bold">Действия диспетчера</Dropdown.Header>

                <Dropdown.Item
                  id="menu-upload-csv"
                  onClick={() => fileInputRef.current?.click()}
                  className="d-flex align-items-center gap-2"
                >
                  <Upload size={15} className="text-warning" />
                  <span>Загрузить CSV-файлы...</span>
                </Dropdown.Item>

                <Dropdown.Item
                  id="menu-route-sheets"
                  onClick={onOpenRouteSheetModal}
                  className="d-flex align-items-center gap-2"
                >
                  <Printer size={15} className="text-warning" />
                  <span>Печать путевых листов</span>
                </Dropdown.Item>

                <Dropdown.Item
                  id="menu-instructions"
                  onClick={onOpenInstructionModal}
                  className="d-flex align-items-center gap-2"
                >
                  <BookOpen size={15} className="text-warning" />
                  <span>Инструкция диспетчера ШПД</span>
                </Dropdown.Item>

                {onOpenSettingsModal && (
                  <Dropdown.Item
                    id="menu-settings"
                    onClick={onOpenSettingsModal}
                    className="d-flex align-items-center gap-2"
                  >
                    <Sliders size={15} className="text-warning" />
                    <span>Параметры оптимизатора</span>
                  </Dropdown.Item>
                )}

                <Dropdown.Divider />

                <Dropdown.Item
                  id="menu-recalc"
                  onClick={onRunOptimization}
                  className="d-flex align-items-center gap-2"
                >
                  <Play size={15} className="text-warning" />
                  <span>Пересчитать план смены</span>
                </Dropdown.Item>

                {isSimulated && (
                  <Dropdown.Item
                    id="menu-reset"
                    onClick={onResetSimulation}
                    className="text-danger d-flex align-items-center gap-2"
                  >
                    <RotateCcw size={15} />
                    <span>Вернуть базовый график</span>
                  </Dropdown.Item>
                )}

                <Dropdown.Divider />

                <Dropdown.Item
                  id="menu-clear-data"
                  onClick={onClearData}
                  className="text-danger d-flex align-items-center gap-2"
                >
                  <Trash2 size={15} />
                  <span>Очистить все данные</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            {/* Скрытый input для выбора файлов CSV */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept=".csv,.txt,.json"
              onChange={handleFileInputChange}
            />
          </div>
        </Container>
      </div>

      {/* Уровень 2: Панель вкладок навигации (Карта, График Ганта, Реестр нарядов, Бригады, Аналитика) */}
      <div
        className="px-3"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <Container fluid className="px-0 d-flex justify-content-between align-items-center">
          <Nav className="nav-pills-fsm d-flex gap-1 py-1 overflow-auto">
            <Nav.Link
              id="tab-nav-map"
              active={activeTab === "map"}
              onClick={() => onSelectTab("map")}
            >
              <Map size={15} />
              <span>Карта маршрутов</span>
            </Nav.Link>

            <Nav.Link
              id="tab-nav-timeline"
              active={activeTab === "timeline"}
              onClick={() => onSelectTab("timeline")}
            >
              <Calendar size={15} />
              <span>График Ганта</span>
            </Nav.Link>

            <Nav.Link
              id="tab-nav-orders"
              active={activeTab === "orders"}
              onClick={() => onSelectTab("orders")}
            >
              <TableIcon size={15} />
              <span>Реестр нарядов</span>
              <span
                className="badge rounded-pill ms-1"
                style={{
                  fontSize: "0.68rem",
                  background: activeTab === "orders" ? "rgba(0,0,0,0.18)" : "var(--border-strong)",
                  color: activeTab === "orders" ? "#000" : "var(--text-muted)"
                }}
              >
                {ordersCount}
              </span>
            </Nav.Link>

            <Nav.Link
              id="tab-nav-brigades"
              active={activeTab === "brigades"}
              onClick={() => onSelectTab("brigades")}
            >
              <Users size={15} />
              <span>Дежурный штат</span>
              <span
                className="badge rounded-pill ms-1"
                style={{
                  fontSize: "0.68rem",
                  background: activeTab === "brigades" ? "rgba(0,0,0,0.18)" : "var(--border-strong)",
                  color: activeTab === "brigades" ? "#000" : "var(--text-muted)"
                }}
              >
                {activeEngineersCount}
              </span>
            </Nav.Link>

            <Nav.Link
              id="tab-nav-analytics"
              active={activeTab === "analytics"}
              onClick={() => onSelectTab("analytics")}
            >
              <BarChart2 size={15} />
              <span>Аналитика и SLA</span>
            </Nav.Link>
          </Nav>

          {/* Быстрые действия справа от панели вкладок (Параметры алгоритма, Путевые листы) */}
          <div className="d-none d-md-flex align-items-center gap-2">
            {onOpenSettingsModal && (
              <button
                id="btn-quick-settings"
                onClick={onOpenSettingsModal}
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 py-1 px-2 text-theme-muted"
                style={{
                  fontSize: "0.78rem",
                  borderRadius: 6,
                  borderColor: "var(--border-color)",
                  background: "transparent"
                }}
                title="Настроить критерии, приоритеты и транспортную модель"
              >
                <Sliders size={13} className="text-warning" />
                <span>Параметры алгоритма</span>
              </button>
            )}
            <button
              onClick={onOpenRouteSheetModal}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 py-1 px-2 text-theme-muted"
              style={{
                fontSize: "0.78rem",
                borderRadius: 6,
                borderColor: "var(--border-color)",
                background: "transparent"
              }}
            >
              <Printer size={13} className="text-warning" />
              <span>Печать путевых листов</span>
            </button>
          </div>
        </Container>
      </div>
    </header>
  );
};
