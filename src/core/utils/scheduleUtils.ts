import { Engineer, WorkPeriod, EngineerSchedule, SchedulePattern } from "../types";
import { timeToMinutes, minutesToTime } from "./timeUtils";

/**
 * Выполняет разбор строки с датой в популярных форматах:
 * - "29.09.2026" или "29.09.2026 14:00"
 * - "2026-09-29" или "2026-09-29 14:00"
 * - "29/09/2026"
 */
export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Сопоставление с форматом ДД.ММ.ГГГГ
  const ruMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Сопоставление с форматом ГГГГ-ММ-ДД
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Сопоставление с форматом ДД/ММ/ГГГГ
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Форматирует объект даты в стандартную строку "ДД.ММ.ГГГГ"
 */
export function formatDateRu(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Нормализует любую распознаваемую строку даты в канонический формат "ДД.ММ.ГГГГ"
 */
export function normalizeDateString(dateStr: string): string {
  const parsed = parseDateString(dateStr);
  return parsed ? formatDateRu(parsed) : dateStr;
}

/**
 * Возвращает порядковый номер дня недели: 1 = Понедельник, ..., 7 = Воскресенье
 */
export function getDayOfWeekNumber(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function getDayOfWeekRuName(date: Date): string {
  const names = [
    "",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
  ];
  return names[getDayOfWeekNumber(date)] || "";
}

export function getDayOfWeekRuShort(date: Date): string {
  const shorts = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return shorts[getDayOfWeekNumber(date)] || "";
}

/**
 * Проверяет, запланирован ли рабочий день у инженера на указанную календарную дату
 */
export function isEngineerWorkingOnDate(engineer: Engineer, targetDateStr?: string): boolean {
  if (!engineer.isActive) return false;
  if (!targetDateStr || targetDateStr === "all") return true;

  // Проверка персональных исключений (внеочередной выходной)
  if (engineer.schedule?.daysOffDates?.includes(targetDateStr)) {
    return false;
  }

  const date = parseDateString(targetDateStr);
  if (!date) return engineer.isActive;

  const schedule = engineer.schedule;
  if (!schedule) {
    // По умолчанию без индивидуального графика инженер работает все дни
    return true;
  }

  const dow = getDayOfWeekNumber(date);

  switch (schedule.pattern) {
    case "5/2":
      return dow >= 1 && dow <= 5;
    case "everyday":
      return true;
    case "custom":
      return schedule.workDaysOfWeek.includes(dow);
    case "2/2": {
      // 2 дня работы, 2 дня отдыха относительно фиксированной точки отсчета
      const epoch = new Date(2026, 0, 1).getTime();
      const diffDays = Math.floor((date.getTime() - epoch) / (1000 * 60 * 60 * 24));
      const cycle = ((diffDays + (schedule.shiftOffset || 0)) % 4 + 4) % 4;
      return cycle < 2;
    }
    default:
      return true;
  }
}

/**
 * Возвращает фактический список разрешенных периодов работы бригады
 */
export function getEffectiveWorkPeriods(engineer: Engineer): WorkPeriod[] {
  if (engineer.workPeriods && engineer.workPeriods.length > 0) {
    return engineer.workPeriods;
  }
  if (engineer.schedule?.workPeriods && engineer.schedule.workPeriods.length > 0) {
    return engineer.schedule.workPeriods;
  }
  const s = engineer.shiftStart || "08:00";
  const e = engineer.shiftEnd || "20:00";
  return [{ start: s, end: e }];
}

/**
 * Рассчитывает общее допустимое рабочее время инженера за смену в минутах
 */
export function getTotalAllowedWorkingMinutes(engineer: Engineer): number {
  const periods = getEffectiveWorkPeriods(engineer);
  return periods.reduce((sum, p) => {
    const s = timeToMinutes(p.start);
    const e = timeToMinutes(p.end);
    return sum + Math.max(0, e - s);
  }, 0);
}

export interface ValidStartResult {
  valid: boolean;
  startWorkMin: number;
  endWorkMin: number;
  waitMin: number;
  period?: WorkPeriod;
  reason?: string;
}

/**
 * Проверяет возможность выполнения наряда с учетом допустимых периодов работы бригады,
 * времени прибытия, длительности работ и временного окна клиента.
 */
export function findEarliestValidStartTime(
  arrivalMin: number,
  windowStartMin: number,
  windowEndMin: number,
  durationMinutes: number,
  workPeriods: WorkPeriod[]
): ValidStartResult {
  if (workPeriods.length === 0) {
    return {
      valid: false,
      startWorkMin: 0,
      endWorkMin: 0,
      waitMin: 0,
      reason: "У бригады не заданы допустимые периоды работы"
    };
  }

  let bestCandidate: ValidStartResult | null = null;
  const failureReasons: string[] = [];

  for (const period of workPeriods) {
    const pStartMin = timeToMinutes(period.start);
    const pEndMin = timeToMinutes(period.end);

    // Если временное окно клиента закрывается раньше начала этого периода, его нельзя использовать
    if (windowEndMin < pStartMin) {
      failureReasons.push(`Окно клиента до ${minutesToTime(windowEndMin)}, период начинается в ${period.start}`);
      continue;
    }

    // Самое раннее возможное время начала внутри текущего периода
    const candidateStart = Math.max(arrivalMin, windowStartMin, pStartMin);
    const candidateEnd = candidateStart + durationMinutes;

    // Работа должна начаться до окончания временного окна клиента
    if (candidateStart > windowEndMin) {
      failureReasons.push(`Начало ${minutesToTime(candidateStart)} позже закрытия окна клиента (${minutesToTime(windowEndMin)})`);
      continue;
    }

    // Работа должна завершиться до окончания текущего рабочего периода бригады
    if (candidateEnd > pEndMin) {
      failureReasons.push(`Окончание ${minutesToTime(candidateEnd)} превышает период смены ${period.end}`);
      continue;
    }

    const waitMin = Math.max(0, candidateStart - arrivalMin);

    if (!bestCandidate || candidateStart < bestCandidate.startWorkMin) {
      bestCandidate = {
        valid: true,
        startWorkMin: candidateStart,
        endWorkMin: candidateEnd,
        waitMin,
        period
      };
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  return {
    valid: false,
    startWorkMin: 0,
    endWorkMin: 0,
    waitMin: 0,
    reason: failureReasons.length > 0 ? failureReasons[0] : "Работа не укладывается в доступные интервалы смены бригады"
  };
}

/**
 * Создает типовое расписание для новой или существующей бригады
 */
export function createDefaultEngineerSchedule(
  pattern: SchedulePattern = "5/2",
  workPeriods: WorkPeriod[] = [{ start: "10:00", end: "22:00" }],
  shiftOffset: number = 0
): EngineerSchedule {
  return {
    pattern,
    workDaysOfWeek: pattern === "5/2" ? [1, 2, 3, 4, 5] : pattern === "everyday" ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5],
    workPeriods,
    daysOffDates: [],
    shiftOffset
  };
}
