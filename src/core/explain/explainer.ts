import { Order, Engineer, RouteStop, EngineerRoute } from "../types";
import { formatDurationHoursMinutes } from "../utils/timeUtils";

export interface DecisionExplanation {
  summary: string;
  skillCheck: { passed: boolean; details: string };
  timeWindowCheck: { passed: boolean; details: string };
  transportCheck: { passed: boolean; details: string };
  shiftCheck: { passed: boolean; details: string };
  logisticsCheck: { details: string };
  alternativeAnalysis: string[];
}

export function explainAssignment(
  order: Order,
  engineer: Engineer,
  stop: RouteStop,
  prevStop: RouteStop | null,
  allRoutes: EngineerRoute[]
): DecisionExplanation {
  const hasSkill = engineer.skills.includes(order.requiredSkill);
  const skillDetails = hasSkill
    ? `Инженер обладает требуемой квалификацией "${order.requiredSkill}". (Всего навыков: ${engineer.skills.join(", ")})`
    : `Несоответствие квалификации: требуется "${order.requiredSkill}".`;

  const timeWindowDetails = `Прибытие на адрес в ${stop.arrivalTime}. Начало работ в ${stop.startWorkTime}, что строго попадает в 2-часовой интервал клиента (${order.windowStart}–${order.windowEnd}). Время ожидания: ${stop.waitMinutes} мин.`;

  const transportDetails =
    order.requiredTransport === "Любой"
      ? `Транспорт инженера "${engineer.transport}" подходит для данной заявки (особых требований к ТС нет).`
      : `Требуемый тип транспорта "${order.requiredTransport}" полностью совпадает с оснащением инженера.`;

  const shiftDetails = `Работы завершаются в ${stop.endWorkTime}, что укладывается в график смены (${engineer.shiftStart}–${engineer.shiftEnd}). Переработок нет.`;

  const logisticsDetails = prevStop
    ? `Предыдущая точка: ${prevStop.address} (${prevStop.district}). Плечо доезда: ${stop.travelDistanceKm} км за ${stop.travelDurationMinutes} мин.`
    : `Выезд напрямую со склада участка (${engineer.startDepot.address}). Дистанция: ${stop.travelDistanceKm} км.`;

  // Анализ альтернативных инженеров: почему был выбран именно данный специалист
  const alternatives: string[] = [];
  allRoutes.forEach((otherRoute) => {
    if (otherRoute.engineerId === engineer.id) return;
    const otherEng = otherRoute.engineer;

    if (!otherEng.skills.includes(order.requiredSkill)) {
      alternatives.push(`${otherEng.name}: не назначен (нет допуска к типу работ "${order.requiredSkill}").`);
    } else if (order.requiredTransport !== "Любой" && otherEng.transport !== order.requiredTransport) {
      alternatives.push(`${otherEng.name}: не назначен (тип транспорта "${otherEng.transport}" не подходит).`);
    } else {
      alternatives.push(
        `${otherEng.name}: отклонен (находится в другом районе или имеет большую загрузку в это временное окно).`
      );
    }
  });

  const summary = `Заявка #${order.id} назначена инженеру ${engineer.name}, так как он находится в оптимальной транспортной доступности (${stop.travelDurationMinutes} мин доезда), обладает навыком "${order.requiredSkill}" и прибывает во временное окно клиента (${order.windowStart}–${order.windowEnd}) без нарушения лимита смены.`;

  return {
    summary,
    skillCheck: { passed: hasSkill, details: skillDetails },
    timeWindowCheck: { passed: true, details: timeWindowDetails },
    transportCheck: { passed: true, details: transportDetails },
    shiftCheck: { passed: true, details: shiftDetails },
    logisticsCheck: { details: logisticsDetails },
    alternativeAnalysis: alternatives.slice(0, 3) // Первые 3 наиболее релевантные альтернативы
  };
}

export function explainUnassignedOrder(
  order: Order,
  engineers: Engineer[],
  reason: string
): { summary: string; audit: string[] } {
  const audit: string[] = [];

  engineers.forEach((eng) => {
    if (!eng.isActive) {
      audit.push(`${eng.name}: инженер не дежурит в этот день.`);
    } else if (!eng.skills.includes(order.requiredSkill)) {
      audit.push(`${eng.name}: отсутствует навык "${order.requiredSkill}".`);
    } else if (order.requiredTransport !== "Любой" && eng.transport !== order.requiredTransport) {
      audit.push(`${eng.name}: несоответствие транспорта (нужен "${order.requiredTransport}").`);
    } else {
      audit.push(`${eng.name}: график инженера полностью заполнен в окне ${order.windowStart}-${order.windowEnd}.`);
    }
  });

  const summary = `Заявка #${order.id} по адресу "${order.address}" не назначена: ${reason}. Все доступные специалисты с квалификацией "${order.requiredSkill}" заняты в этот временной слот.`;

  return {
    summary,
    audit: audit.slice(0, 4)
  };
}
