import React, { useState, useEffect, useMemo } from "react";
import { Container, Spinner } from "react-bootstrap";
import { Header, NavTab } from "./components/Header";
import { MapView } from "./components/MapView";
import { TimelineView } from "./components/TimelineView";
import { OrdersTable } from "./components/OrdersTable";
import { BrigadesView } from "./components/BrigadesView";
import { AnalyticsView } from "./components/AnalyticsView";
import { ExplainModal } from "./components/ExplainModal";
import { LiveDispatchModal } from "./components/LiveDispatchModal";
import { DiffViewerModal } from "./components/DiffViewerModal";
import { RouteSheetModal } from "./components/RouteSheetModal";
import { InstructionModal } from "./components/InstructionModal";
import { OptimizerSettingsModal } from "./components/OptimizerSettingsModal";
import { EmptyStateView } from "./components/EmptyStateView";

import { 
  AreaDataset, 
  Engineer, 
  Order, 
  PlanResult, 
  RouteStop, 
  PlanDiffItem, 
  TransportType,
  OptimizerSettings,
  DEFAULT_OPTIMIZER_SETTINGS
} from "./core/types";
import { runAdvancedOptimizer } from "./core/optimizer/vrpSolver";
import { runBaselineFIFO } from "./core/baseline/fifoPlanner";
import { comparePlans } from "./core/comparison/planComparison";
import { IncidentManager } from "./core/simulator/incidentManager";
import { parseMultipleCSVFiles, getOrCreateDepotForArea, decodeFileBuffer } from "./core/parser/csvParser";
import { isEngineerWorkingOnDate, parseDateString } from "./core/utils/scheduleUtils";
import { Activity, CheckCircle2, History } from "lucide-react";

export const App: React.FC = () => {
  // При первом запуске приложение стартует БЕЗ встроенных наборов данных (Zero-data startup)
  const [datasets, setDatasets] = useState<Record<string, AreaDataset>>(() => {
    try {
      const saved = localStorage.getItem("beeline_fsm_datasets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {
      // Игнорируем поврежденные данные хранилища
    }
    return {};
  });

  const [currentArea, setCurrentArea] = useState<string>(() => {
    const keys = Object.keys(datasets);
    return keys.length > 0 ? keys[0] : "";
  });

  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [algorithmType, setAlgorithmType] = useState<"baseline_fifo" | "advanced_optimizer">("advanced_optimizer");
  const [activeTab, setActiveTab] = useState<NavTab>("map");

  // Управление темой интерфейса: темная / светлая
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("beeline_fsm_theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("beeline_fsm_theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Сохранение загруженных датасетов в локальное хранилище браузера
  useEffect(() => {
    if (datasets && Object.keys(datasets).length > 0) {
      try {
        localStorage.setItem("beeline_fsm_datasets", JSON.stringify(datasets));
      } catch (e) {
        console.warn("Превышена квота хранилища или ошибка сохранения:", e);
      }
    } else {
      localStorage.removeItem("beeline_fsm_datasets");
    }
  }, [datasets]);

  // Состояния модальных окон
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);
  const [inspectedStop, setInspectedStop] = useState<RouteStop | null>(null);
  const [inspectedEngId, setInspectedEngId] = useState<string | null>(null);

  const [showLiveDispatchModal, setShowLiveDispatchModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [lastDiffs, setLastDiffs] = useState<PlanDiffItem[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  const [showRouteSheetModal, setShowRouteSheetModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showOptimizerSettingsModal, setShowOptimizerSettingsModal] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string | null>(null);

  // Настройки параметров алгоритма оптимизации
  const [optimizerSettings, setOptimizerSettings] = useState<OptimizerSettings>(DEFAULT_OPTIMIZER_SETTINGS);

  const allAreas = useMemo(() => Object.keys(datasets), [datasets]);

  // Проверка валидности текущего выбранного сектора/города
  useEffect(() => {
    if (allAreas.length > 0 && (!currentArea || !datasets[currentArea])) {
      setCurrentArea(allAreas[0]);
    }
  }, [allAreas, currentArea, datasets]);

  const currentDataset = datasets[currentArea];

  // Список доступных дат в нарядах для текущего участка
  const availableDates = useMemo(() => {
    if (!currentDataset) return [];
    if (currentDataset.availableDates && currentDataset.availableDates.length > 0) {
      return currentDataset.availableDates;
    }
    const dSet = new Set<string>();
    currentDataset.orders.forEach((o) => {
      if (o.date) dSet.add(o.date);
    });
    return Array.from(dSet).sort((a, b) => {
      const da = parseDateString(a)?.getTime() || 0;
      const db = parseDateString(b)?.getTime() || 0;
      return da - db;
    });
  }, [currentDataset]);

  // Автоматический выбор первой доступной даты при смене участка
  useEffect(() => {
    if (availableDates.length > 0 && (selectedDate === "all" || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  // Переключение выбранного участка/района
  const handleSelectArea = (area: string) => {
    setCurrentArea(area);
    setSelectedEngineerId(null);
    setIsSimulated(false);
  };

  const currentDepot = useMemo(() => {
    if (currentDataset?.depot) {
      return currentDataset.depot;
    }
    return getOrCreateDepotForArea(currentArea || "Основной");
  }, [currentDataset, currentArea]);

  const currentOrders = useMemo(() => {
    return currentDataset?.orders || [];
  }, [currentDataset]);

  const currentEngineers = useMemo(() => {
    return currentDataset?.engineers || [];
  }, [currentDataset]);

  // Фильтрация нарядов по выбранному рабочему дню
  const filteredOrdersForDate = useMemo(() => {
    if (!selectedDate || selectedDate === "all") {
      return currentOrders;
    }
    return currentOrders.filter((o) => !o.date || o.date === selectedDate);
  }, [currentOrders, selectedDate]);

  // Базовый расчет маршрутов по правилу FIFO (без глобальной оптимизации)
  const baselinePlan = useMemo(() => {
    if (filteredOrdersForDate.length === 0 || currentEngineers.length === 0) return null;
    return runBaselineFIFO(filteredOrdersForDate, currentEngineers, currentArea, selectedDate);
  }, [filteredOrdersForDate, currentEngineers, currentArea, selectedDate]);

  // Интеллектуальный мультимодальный план оптимизатора VRP
  const optimizedPlan = useMemo(() => {
    if (filteredOrdersForDate.length === 0 || currentEngineers.length === 0) return null;
    return runAdvancedOptimizer(
      filteredOrdersForDate,
      currentEngineers,
      currentArea,
      optimizerSettings,
      selectedDate
    );
  }, [filteredOrdersForDate, currentEngineers, currentArea, optimizerSettings, selectedDate]);

  // Текущий активный план (включая результат оперативной симуляции диспетчера)
  const [simulatedPlan, setSimulatedPlan] = useState<PlanResult | null>(null);

  const activePlan = useMemo(() => {
    if (isSimulated && simulatedPlan) {
      return simulatedPlan;
    }
    return algorithmType === "advanced_optimizer" ? optimizedPlan : baselinePlan;
  }, [isSimulated, simulatedPlan, algorithmType, optimizedPlan, baselinePlan]);

  // Метрики сравнения между базовым планом FIFO и алгоритмом оптимизации
  const comparison = useMemo(() => {
    if (!baselinePlan || !optimizedPlan) return null;
    return comparePlans(baselinePlan, optimizedPlan);
  }, [baselinePlan, optimizedPlan]);

  // Обработчик загрузки одного или нескольких файлов CSV / JSON
  const handleFilesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const loadedFiles: Array<{ name: string; content: string }> = [];

    for (const file of fileArray) {
      try {
        const buffer = await file.arrayBuffer();
        const text = decodeFileBuffer(buffer);

        if (file.name.endsWith(".json")) {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed["Восток"] || (Object.values(parsed)[0] as any)?.orders)) {
              setDatasets((prev) => ({ ...prev, ...parsed }));
              setCurrentArea(Object.keys(parsed)[0]);
              return;
            }
          } catch {
            // Если не словарь датасетов, пробуем парсить как текст
          }
        }

        loadedFiles.push({ name: file.name, content: text });
      } catch (err) {
        console.error("Ошибка чтения файла:", file.name, err);
      }
    }

    if (loadedFiles.length > 0) {
      const prevOrderCounts: Record<string, number> = {};
      Object.keys(datasets).forEach((k) => {
        prevOrderCounts[k] = datasets[k].orders.length;
      });

      const newDatasets = parseMultipleCSVFiles(loadedFiles, datasets, currentArea);
      const newAreaKeys = Object.keys(newDatasets);
      if (newAreaKeys.length > 0) {
        setDatasets(newDatasets);

        // Находим добавленный сектор или сектор с обновленными нарядами
        let targetArea = newAreaKeys.find((k) => !datasets[k]);
        if (!targetArea) {
          targetArea = newAreaKeys.find((k) => (newDatasets[k].orders.length > (prevOrderCounts[k] || 0))) || currentArea || newAreaKeys[0];
        }

        setCurrentArea(targetArea);
        const dates = newDatasets[targetArea].availableDates;
        if (dates && dates.length > 0) {
          setSelectedDate(dates[0]);
        } else {
          setSelectedDate("all");
        }
        setIsSimulated(false);
        setSimulatedPlan(null);

        const newCount = newDatasets[targetArea].orders.length - (prevOrderCounts[targetArea] || 0);
        console.log(`Загружено ${newCount > 0 ? newCount : newDatasets[targetArea].orders.length} нарядов для сектора «${targetArea}».`);
      } else {
        alert("Не удалось распознать наряды из выбранных CSV-файлов. Убедитесь, что файл содержит колонки нарядов и адресов.");
      }
    }
  };

  // Прямая вставка CSV текста из буфера обмена
  const handleTextPasted = (text: string, areaName: string) => {
    const newDatasets = parseMultipleCSVFiles(
      [{ name: `${areaName}.csv`, content: text }],
      datasets
    );
    setDatasets(newDatasets);
    setCurrentArea(areaName);
    const dates = newDatasets[areaName]?.availableDates;
    if (dates && dates.length > 0) {
      setSelectedDate(dates[0]);
    } else {
      setSelectedDate("all");
    }
    setIsSimulated(false);
  };

  // Быстрая загрузка демонстрационного набора данных (для проверки возможностей)
  const handleLoadDemoData = () => {
    fetch("/data/datasets.json")
      .then((res) => res.json())
      .then((data: Record<string, AreaDataset>) => {
        setDatasets(data);
        const keys = Object.keys(data);
        if (keys.length > 0) {
          setCurrentArea(keys[0]);
          setSelectedDate(data[keys[0]].availableDates?.[0] || "all");
        }
      })
      .catch((err) => {
        alert("Ошибка загрузки демо-данных: " + err);
      });
  };

  // Очистка всех загруженных данных и возврат к экрану приветствия
  const handleClearData = () => {
    if (confirm("Вы действительно хотите удалить все загруженные наборы данных и вернуться к начальному экрану?")) {
      setDatasets({});
      setCurrentArea("");
      setSelectedDate("all");
      setSelectedEngineerId(null);
      setIsSimulated(false);
      setSimulatedPlan(null);
      localStorage.removeItem("beeline_fsm_datasets");
    }
  };

  // Аудит и объяснение назначения заявки (XAI - Explainable AI)
  const handleInspectOrder = (order: Order, stop?: RouteStop, engineerId?: string) => {
    setInspectedOrder(order);
    setInspectedStop(stop || null);
    setInspectedEngId(engineerId || null);
    setShowExplainModal(true);
  };

  // Управление пулом выездных инженеров и бригад
  const handleToggleEngineer = (engId: string) => {
    if (!currentArea || !datasets[currentArea]) return;
    const updated = currentEngineers.map((e) =>
      e.id === engId ? { ...e, isActive: !e.isActive } : e
    );
    setDatasets((prev) => ({
      ...prev,
      [currentArea]: { ...prev[currentArea], engineers: updated }
    }));
  };

  const handleUpdateTransport = (engId: string, transport: TransportType) => {
    if (!currentArea || !datasets[currentArea]) return;
    const updated = currentEngineers.map((e) =>
      e.id === engId ? { ...e, transport } : e
    );
    setDatasets((prev) => ({
      ...prev,
      [currentArea]: { ...prev[currentArea], engineers: updated }
    }));
  };

  const handleUpdateEngineer = (updatedEng: Engineer) => {
    if (!currentArea || !datasets[currentArea]) return;
    const updated = currentEngineers.map((e) =>
      e.id === updatedEng.id ? updatedEng : e
    );
    setDatasets((prev) => ({
      ...prev,
      [currentArea]: { ...prev[currentArea], engineers: updated }
    }));
  };

  const handleAddEngineer = (newEng: Engineer) => {
    if (!currentArea || !datasets[currentArea]) return;
    const updated = [...currentEngineers, newEng];
    setDatasets((prev) => ({
      ...prev,
      [currentArea]: { ...prev[currentArea], engineers: updated }
    }));
  };

  const handleDeleteEngineer = (engId: string) => {
    if (!currentArea || !datasets[currentArea]) return;
    const updated = currentEngineers.filter((e) => e.id !== engId);
    setDatasets((prev) => ({
      ...prev,
      [currentArea]: { ...prev[currentArea], engineers: updated }
    }));
  };

  const handleSelectEngineerForMap = (engId: string) => {
    setSelectedEngineerId(engId);
    setActiveTab("map");
  };

  // Обработчики оперативного перепланирования (Live Dispatch)
  const handleApplyEmergency = (emergencyOrder: Order, timeStr: string) => {
    if (!activePlan) return;
    const { updatedPlan, diffs } = IncidentManager.handleEmergencyIncident(
      activePlan,
      emergencyOrder,
      timeStr,
      currentEngineers
    );
    setSimulatedPlan(updatedPlan);
    setLastDiffs(diffs);
    setIsSimulated(true);
    setShowDiffModal(true);
  };

  const handleApplyCancel = (orderId: string) => {
    if (!activePlan) return;
    const { updatedPlan, diffs } = IncidentManager.handleCancelOrder(activePlan, orderId);
    setSimulatedPlan(updatedPlan);
    setLastDiffs(diffs);
    setIsSimulated(true);
    setShowDiffModal(true);
  };

  const handleApplyEngineerUnavailable = (engineerId: string, timeStr: string) => {
    if (!activePlan) return;
    const { updatedPlan, diffs } = IncidentManager.handleEngineerUnavailable(
      activePlan,
      engineerId,
      timeStr,
      currentEngineers
    );
    setSimulatedPlan(updatedPlan);
    setLastDiffs(diffs);
    setIsSimulated(true);
    setShowDiffModal(true);
  };

  const handleResetSimulation = () => {
    setIsSimulated(false);
    setSimulatedPlan(null);
  };

  // Если данных нет, отображаем приветственный стартовый экран EmptyStateView
  if (allAreas.length === 0 || !currentDataset) {
    return (
      <EmptyStateView
        onFilesSelected={handleFilesUpload}
        onTextPasted={handleTextPasted}
        onLoadDemoData={handleLoadDemoData}
      />
    );
  }

  // Количество работающих бригад на выбранную дату
  const workingEngineersCount = currentEngineers.filter((e) =>
    isEngineerWorkingOnDate(e, selectedDate)
  ).length;

  const inspectedEngineer = inspectedEngId
    ? currentEngineers.find((e) => e.id === inspectedEngId) || null
    : null;

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: "var(--bg-app)", color: "var(--text-main)" }}>
      {/* Динамическая шапка с контекстом и инструментами */}
      <Header
        currentArea={currentArea}
        allAreas={allAreas}
        onSelectArea={handleSelectArea}
        availableDates={availableDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        algorithmType={algorithmType}
        onToggleAlgorithm={() =>
          setAlgorithmType((prev) =>
            prev === "advanced_optimizer" ? "baseline_fifo" : "advanced_optimizer"
          )
        }
        onRunOptimization={() => {
          setIsSimulated(false);
          setSimulatedPlan(null);
        }}
        onOpenLiveDispatchModal={() => setShowLiveDispatchModal(true)}
        onOpenRouteSheetModal={() => setShowRouteSheetModal(true)}
        onOpenInstructionModal={() => setShowInstructionModal(true)}
        onOpenSettingsModal={() => setShowOptimizerSettingsModal(true)}
        onUploadFiles={handleFilesUpload}
        onClearData={handleClearData}
        currentDepot={currentDepot}
        isSimulated={isSimulated}
        onResetSimulation={handleResetSimulation}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        ordersCount={filteredOrdersForDate.length}
        activeEngineersCount={activePlan?.activeEngineersCount || workingEngineersCount}
        totalEngineersCount={currentEngineers.length}
      />

      {/* Основная рабочая область вкладок */}
      <main className="flex-grow-1 p-3" style={{ paddingBottom: "54px" }}>
        {/* Заглушка, если на выбранную дату отсутствуют наряды или доступные бригады */}
        {!activePlan ? (
          <div className="text-center p-5 fsm-card my-4">
            <h5 className="fw-bold text-theme-main mb-2">Нет нарядов или доступных бригад на выбранную дату</h5>
            <div className="text-theme-muted small mb-3">
              На дату <b>{selectedDate}</b> нет назначенных нарядов либо все бригады имеют статус «Выходной».
            </div>
            <button className="btn btn-warning btn-sm" onClick={() => setSelectedDate("all")}>
              Показать все даты
            </button>
          </div>
        ) : (
          <>
            {/* Вкладка 1: Интерактивная карта с маршрутами инженеров и 2ГИС */}
            {activeTab === "map" && (
              <div>
                <MapView
                  depot={currentDepot}
                  routes={activePlan.routes}
                  unassignedOrders={activePlan.unassignedOrders.map((u) => u.order)}
                  selectedEngineerId={selectedEngineerId}
                  onSelectEngineer={setSelectedEngineerId}
                  onInspectOrder={handleInspectOrder}
                  onOpenRouteSheet={() => setShowRouteSheetModal(true)}
                />
              </div>
            )}

            {/* Вкладка 2: Диаграмма Ганта (расписание и временные слоты смен) */}
            {activeTab === "timeline" && (
              <div>
                <TimelineView
                  routes={activePlan.routes}
                  currentTimeStr="13:00"
                  onInspectOrder={handleInspectOrder}
                />
              </div>
            )}

            {/* Вкладка 3: Реестр нарядов с фильтрацией и статусами SLA */}
            {activeTab === "orders" && (
              <div>
                <OrdersTable
                  orders={filteredOrdersForDate}
                  routes={activePlan.routes}
                  onInspectOrder={handleInspectOrder}
                />
              </div>
            )}

            {/* Вкладка 4: Выездные бригады, графики смен (5/2, 2/2) и навыки */}
            {activeTab === "brigades" && (
              <div>
                <BrigadesView
                  engineers={currentEngineers}
                  routes={activePlan.routes}
                  targetDate={selectedDate}
                  onToggleEngineer={handleToggleEngineer}
                  onUpdateTransport={handleUpdateTransport}
                  onUpdateEngineer={handleUpdateEngineer}
                  onAddEngineer={handleAddEngineer}
                  onDeleteEngineer={handleDeleteEngineer}
                  onSelectEngineerForMap={handleSelectEngineerForMap}
                />
              </div>
            )}

            {/* Вкладка 5: Аналитика и сравнение планов (Benchmark FIFO vs VRP) */}
            {activeTab === "analytics" && (
              <div>
                <AnalyticsView
                  currentPlan={activePlan}
                  comparison={comparison}
                  algorithmType={algorithmType}
                  onOpenSettingsModal={() => setShowOptimizerSettingsModal(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Нижняя статусная панель приложения (закреплена внизу экрана) */}
      <footer
        className="fsm-footer py-2 px-3 small text-theme-muted d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 1030,
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-color)",
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.25)"
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Activity size={14} className="text-success" />
          <span><b>билайн бизнес</b> • Выездной сервис ШПД • <span className="text-warning fw-bold">TeamAstra</span></span>
          <span className="text-theme-dim">|</span>
          <span className="text-theme-main fw-semibold">Участок: {currentArea}</span>
          {selectedDate && selectedDate !== "all" && (
            <>
              <span className="text-theme-dim">|</span>
              <span>Дата: <b>{selectedDate}</b></span>
            </>
          )}
          <span className="text-theme-dim">|</span>
          <span>На смене: <b>{activePlan?.activeEngineersCount || workingEngineersCount}</b> из {currentEngineers.length} бригад</span>
          {activePlan && (
            <>
              <span className="text-theme-dim">|</span>
              <span>Пробег: <b>{activePlan.totalDistanceKm}</b> км</span>
            </>
          )}
        </div>

        <div className="d-flex align-items-center gap-3">
          {isSimulated && (
            <button
              onClick={() => setShowDiffModal(true)}
              className="btn btn-xs btn-outline-info d-flex align-items-center gap-1 py-0 px-2"
              style={{ fontSize: "0.72rem" }}
            >
              <History size={12} />
              <span>Журнал изменений ({lastDiffs.length})</span>
            </button>
          )}

          <span className="d-flex align-items-center gap-1 text-success">
            <CheckCircle2 size={13} />
            Городская карта: 2ГИС
          </span>
        </div>
      </footer>

      {/* Модальные окна приложения */}
      {activePlan && (
        <>
          <ExplainModal
            show={showExplainModal}
            onHide={() => setShowExplainModal(false)}
            order={inspectedOrder}
            assignedEngineer={inspectedEngineer}
            stop={inspectedStop}
            prevStop={null}
            allRoutes={activePlan.routes}
            allEngineers={currentEngineers}
          />

          <LiveDispatchModal
            show={showLiveDispatchModal}
            onHide={() => setShowLiveDispatchModal(false)}
            routes={activePlan.routes}
            currentDepot={currentDepot}
            currentArea={currentArea}
            onApplyEmergency={handleApplyEmergency}
            onApplyCancel={handleApplyCancel}
            onApplyEngineerUnavailable={handleApplyEngineerUnavailable}
          />

          <DiffViewerModal
            show={showDiffModal}
            onHide={() => setShowDiffModal(false)}
            diffs={lastDiffs}
          />

          <RouteSheetModal
            show={showRouteSheetModal}
            onHide={() => setShowRouteSheetModal(false)}
            routes={activePlan.routes}
            selectedDate={selectedDate}
          />
        </>
      )}

      <InstructionModal
        show={showInstructionModal}
        onHide={() => setShowInstructionModal(false)}
      />

      <OptimizerSettingsModal
        show={showOptimizerSettingsModal}
        onHide={() => setShowOptimizerSettingsModal(false)}
        settings={optimizerSettings}
        onSaveSettings={(newSettings) => {
          setOptimizerSettings(newSettings);
          setIsSimulated(false);
          setSimulatedPlan(null);
        }}
      />
    </div>
  );
};

export default App;
