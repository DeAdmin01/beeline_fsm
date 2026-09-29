/**
 * Утилиты для работы со временем, длительностями и минутными интервалами
 */

/**
 * Преобразует строку времени формата "ЧЧ:ММ" в суммарное количество минут от начала суток
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Преобразует суммарное количество минут от начала суток в строку формата "ЧЧ:ММ"
 */
export function minutesToTime(totalMinutes: number): string {
  if (totalMinutes < 0) totalMinutes = 0;
  const normalized = totalMinutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Прибавляет указанное количество минут к строке времени "ЧЧ:ММ"
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const current = timeToMinutes(timeStr);
  return minutesToTime(current + minutesToAdd);
}

/**
 * Вычисляет разницу в минутах между двумя метками времени (endStr - startStr)
 */
export function diffMinutes(startStr: string, endStr: string): number {
  return timeToMinutes(endStr) - timeToMinutes(startStr);
}

/**
 * Проверяет, предшествует ли время timeA времени timeB
 */
export function isTimeBefore(timeA: string, timeB: string): boolean {
  return timeToMinutes(timeA) < timeToMinutes(timeB);
}

/**
 * Проверяет, наступает ли время timeA позже времени timeB
 */
export function isTimeAfter(timeA: string, timeB: string): boolean {
  return timeToMinutes(timeA) > timeToMinutes(timeB);
}

/**
 * Форматирует длительность в минутах в человекочитаемый вид (например: "1 ч 30 мин", "45 мин")
 */
export function formatDurationHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}
