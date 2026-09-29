/**
 * Основные типы данных и интерфейсы системы диспетчеризации FSM билайн бизнес
 */

/**
 * Категории квалификации и допусков выездных инженеров
 */
export type Skill = 
  | "Локальные работы" 
  | "Работы на подключение и дозаказы" 
  | "Аварийные работы";

/**
 * Допустимые виды транспорта инженеров для передвижения по участку
 */
export type TransportType = 
  | "Автомобиль" 
  | "Общественный транспорт" 
  | "Пешеход" 
  | "Велосипед";

/**
 * Приоритет выполнения наряда (аварийный / стандартный)
 */
export type OrderPriority = "urgent" | "normal";

/**
 * Статусы наряда в смене
 */
export type OrderStatus = 
  | "pending"      // Ожидает назначения
  | "assigned"     // Назначен инженеру
  | "in_progress"  // В процессе выполнения
  | "completed"    // Успешно завершен
  | "unassigned"   // Не включен в маршрут (нет окна/ресурса)
  | "cancelled";   // Аннулирован абонентом

/**
 * Временной интервал разрешенной работы бригады в течение суток
 */
export interface WorkPeriod {
  start: string; // Время начала периода (ЧЧ:ММ)
  end: string;   // Время окончания периода (ЧЧ:ММ)
}

/**
 * Шаблоны рабочих графиков бригад
 */
export type SchedulePattern = "5/2" | "2/2" | "everyday" | "custom";

/**
 * Параметры графика работы и дежурств бригады
 */
export interface EngineerSchedule {
  pattern: SchedulePattern;
  workDaysOfWeek: number[];   // Дни недели: 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб, 7=Вс
  workPeriods: WorkPeriod[]; // Разрешенные периоды смены / выездов в сутки
  daysOffDates?: string[];   // Исключения: конкретные даты выходных (напр. ["29.09.2026"])
  shiftOffset?: number;      // Смещение чередования смен для графика 2/2 (0 или 2)
}

/**
 * Опорный склад / базовый офис участка
 */
export interface Depot {
  address: string;  // Адрес склада/офиса
  lat: number;      // Географическая широта
  lon: number;      // Географическая долгота
  district: string; // Муниципальный район / подокруг
}

/**
 * Сервисный наряд (заявка абонента ШПД)
 */
export interface Order {
  id: string;                               // Уникальный номер наряда
  area: string;                             // Территориальный сектор / участок ответственности
  date?: string;                            // Дата выполнения (ДД.ММ.ГГГГ)
  dayOfWeekRu?: string;                     // День недели на русском (Вторник и т.д.)
  bkType: string;                           // Вид услуги в системе Beekeeper (ВК)
  hdType: string;                           // Тип заявки в системе HelpDesk (HD)
  windowStart: string;                      // Начало 2-часового слота клиента (ЧЧ:ММ)
  windowEnd: string;                        // Окончание слота клиента (ЧЧ:ММ)
  district: string;                         // Район / подокруг выполнения
  address: string;                          // Физический адрес абонента
  isGigabit: boolean;                       // Флаг гигабитного подключения (требует спец. ТМЦ)
  priority: OrderPriority;                  // Приоритет (аварийный / штатный)
  requiredSkill: Skill;                     // Необходимая квалификация специалиста
  requiredTransport: TransportType | "Любой"; // Требование к транспорту (напр. Авто для МО)
  durationMinutes: number;                  // Полная длительность работ (включая оформление)
  workMinutes: number;                      // Чистое время технических работ на объекте
  docMinutes: number;                       // Время подписания актов и сдачи работ
  lat: number;                              // Координата широты
  lon: number;                              // Координата долготы
  controlBrigade?: string;                  // Бригада из исходного контрольного файла (для аудита)
  status?: OrderStatus;                     // Текущий диспетчерский статус
}

/**
 * Выездной инженер / сервисная бригада
 */
export interface Engineer {
  id: string;                   // Идентификатор специалиста
  name: string;                 // Позывной / ФИО инженера
  area: string;                 // Прикрепленный сектор
  skills: Skill[];              // Допуски и квалификации сотрудника
  transport: TransportType;     // Транспортное средство
  shiftStart: string;           // Базовое начало смены (ЧЧ:ММ)
  shiftEnd: string;             // Базовое окончание смены (ЧЧ:ММ)
  workPeriods?: WorkPeriod[];   // Гибкие разрешенные интервалы работы (с учетом перерывов)
  schedule?: EngineerSchedule;  // График дежурств (5/2, 2/2, индивидуальный)
  startDepot: Depot;            // Базовый склад утренней загрузки оборудования
  maxCapacityUnits: number;     // Лимит оборудования в рюкзаке/багажнике
  isActive: boolean;            // Общий статус активности в штате
  avatarColor?: string;         // Фирменный цвет трека на карте
}

/**
 * Остановка (точка маршрута) выездного специалиста
 */
export interface RouteStop {
  id: string;
  isDepot: boolean;                                     // Флаг опорного пункта (склада)
  stopType: "depot_start" | "order" | "depot_end";     // Тип точки: выезд со склада, наряд, возврат
  order?: Order;                                        // Данные наряда (если это клиент)
  lat: number;
  lon: number;
  address: string;
  district: string;
  arrivalTime: string;                                  // Расчетное время прибытия (ЧЧ:ММ)
  startWorkTime: string;                                // Время фактического начала работ (ЧЧ:ММ)
  endWorkTime: string;                                  // Время завершения работ (ЧЧ:ММ)
  travelDurationMinutes: number;                        // Время в пути от предыдущей точки (мин)
  travelDistanceKm: number;                             // Пробег от предыдущей точки (км)
  waitMinutes: number;                                  // Время ожидания до открытия окна клиента (мин)
  explanation: string;                                  // Пояснение диспетчерского решения
  isViolatedWindow?: boolean;                           // Флаг нарушения окна клиента
  transitPath?: [number, number][];                     // Координаты траектории с учетом дорог и метро
  transitDescription?: string;                          // Описание логистического плеча
}

/**
 * Суточный маршрутный лист инженера
 */
export interface EngineerRoute {
  engineerId: string;
  engineer: Engineer;
  stops: RouteStop[];             // Последовательность точек маршрута
  orders: Order[];                // Назначенные наряды
  totalDistanceKm: number;        // Суммарный километраж смены (км)
  totalTravelTimeMin: number;     // Суммарное время в пути (мин)
  totalWorkTimeMin: number;       // Суммарное время работы на объектах (мин)
  totalWaitTimeMin: number;       // Время ожидания окон (мин)
  totalOrders: number;            // Количество выполненных нарядов
  shiftStart: string;             // Начало смены
  shiftEnd: string;               // Окончание смены
  finishTime: string;             // Фактическое время завершения последнего наряда
  isOvertime: boolean;            // Флаг переработки сверх графика смены
  color: string;                  // Цвет линии маршрута на карте
}

/**
 * Наряд, не вошедший в маршруты
 */
export interface UnassignedOrder {
  order: Order;
  reason: string;                 // Причина неназначения
  details?: string;               // Дополнительные логистические детали
}

/**
 * Профили целевой функции оптимизатора
 */
export type OptimizationProfile = "balanced" | "min_mileage" | "min_fleet" | "max_sla";

/**
 * Настройки математического оптимизатора маршрутов
 */
export interface OptimizerSettings {
  profile: OptimizationProfile;
  priorityMileage: number;       // 1 - 10: вес минимизации пробега и экономии топлива
  priorityCluster: number;       // 1 - 10: компактность кучности районов
  priorityFleet: number;         // 1 - 10: приоритет сокращения числа задействованных бригад
  priorityBalance: number;       // 1 - 10: равномерность нагрузки между сотрудниками
  useMetroTransit: boolean;      // учет линий и пересадок метрополитена
  useTrafficFactors: boolean;    // учет дорожных коэффициентов и заторов
}

/**
 * Базовые рекомендуемые параметры оптимизатора
 */
export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  profile: "balanced",
  priorityMileage: 8,
  priorityCluster: 9,
  priorityFleet: 6,
  priorityBalance: 5,
  useMetroTransit: true,
  useTrafficFactors: true
};

/**
 * Результат расчета суточного плана маршрутизации
 */
export interface PlanResult {
  planId: string;
  name: string;
  algorithmType: "baseline_fifo" | "advanced_optimizer"; // Тип алгоритма: базовый по очереди или оптимизатор
  area: string;                                          // Сектор обслуживания
  routes: EngineerRoute[];                               // Маршруты бригад
  unassignedOrders: UnassignedOrder[];                   // Невключенные наряды
  activeEngineersCount: number;                          // Количество инженеров на линии
  totalDistanceKm: number;                               // Суммарный пробег (км)
  totalTravelTimeMin: number;                            // Суммарное время в пути (мин)
  totalWorkTimeMin: number;                              // Время работ на объектах (мин)
  totalOrders: number;                                   // Всего нарядов в реестре
  assignedOrdersCount: number;                           // Успешно распределено нарядов
  onTimeOrdersCount: number;                             // Нарядов выполнено строго вовремя
  onTimeRatePercent: number;                             // Процент соблюдения SLA (%)
  generatedAt: string;                                   // Таймштамп формирования плана
  executionTimeMs: number;                               // Время вычисления алгоритма (мс)
  optimizerSettings?: OptimizerSettings;
}

/**
 * Сравнительная аналитика: базовый расчет (FIFO) против оптимизатора
 */
export interface PlanComparison {
  baseline: PlanResult;
  optimized: PlanResult;
  savedEngineers: number;               // Сэкономлено бригад
  savedEngineersPercent: number;        // Сокращение штата на смене (%)
  savedDistanceKm: number;              // Сэкономлено пробега (км)
  savedDistancePercent: number;         // Снижение холостого пробега (%)
  savedTravelTimeMin: number;           // Сэкономлено времени в пути (мин)
  savedTravelTimePercent: number;       // Снижение времени перемещений (%)
  resolvedOrdersDiff: number;           // Разница в числе выполненных нарядов

  // Нормализованные логистические метрики сравнения
  baselineKmPerOrder: number;           // Базовый пробег на 1 наряд (км)
  optimizedKmPerOrder: number;          // Оптимизированный пробег на 1 наряд (км)
  specificMileageSavingsPercent: number;// Удельная экономия пробега (%)

  baselineAvgTravelMinPerOrder: number; // Базовое время доезда на 1 наряд (мин)
  optimizedAvgTravelMinPerOrder: number;// Оптимизированное время доезда на 1 наряд (мин)
  specificTravelTimeSavingsPercent: number; // Удельная экономия времени доезда (%)

  slaImprovementPercent: number;        // Прирост точности попадания в окно клиента (%)
}

/**
 * Типы оперативных инцидентов в течение дня
 */
export type IncidentType = "emergency_order" | "cancel_order" | "engineer_unavailable";

/**
 * Событие оперативного перераспределения
 */
export interface IncidentEvent {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  time: string; // Время инцидента (ЧЧ:ММ)
  targetOrderId?: string;
  targetEngineerId?: string;
  newOrder?: Order;
}

/**
 * Запись журнала изменений плана при оперативном реагировании
 */
export interface PlanDiffItem {
  orderId: string;
  orderAddress: string;
  changeType: "added" | "reassigned" | "rescheduled" | "cancelled" | "unassigned";
  previousEngineer?: string;
  newEngineer?: string;
  previousTime?: string;
  newTime?: string;
  reason: string;
}

/**
 * Датасет территориального участка обслуживания
 */
export interface AreaDataset {
  area: string;              // Название сектора (Восток, Юго-восток, Казань и др.)
  depot: Depot;              // Базовый опорный склад
  orders: Order[];           // Реестр нарядов
  engineers: Engineer[];     // Пул специалистов
  availableDates?: string[]; // Список доступных рабочих дат в реестре
}
