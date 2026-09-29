import { Order, Skill, TransportType, OrderPriority, Depot, Engineer, AreaDataset } from "../types";
import { parseDateString, formatDateRu, getDayOfWeekRuName, normalizeDateString, createDefaultEngineerSchedule } from "../utils/scheduleUtils";

/**
 * Надежный декодер бинарных буферов с автоматическим определением кодировки (UTF-8 vs Windows-1251 / CP1251)
 * Использует строгое декодирование UTF-8: если обнаружены некорректные байты, переключается на CP1251
 */
export function decodeFileBuffer(buffer: ArrayBuffer): string {
  // 1. Попытка строгого декодирования в UTF-8
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    // 2. При обнаружении невалидных последовательностей UTF-8 переключаемся на Windows-1251 (русский экспорт Excel / Beekeeper)
    try {
      const cp1251Decoder = new TextDecoder("windows-1251");
      return cp1251Decoder.decode(buffer);
    } catch {
      return new TextDecoder("utf-8").decode(buffer);
    }
  }
}

/**
 * Опорные региональные центры и базы участков в городах России
 */
const KNOWN_REGION_CENTERS: Record<string, { lat: number; lon: number; district: string; address: string }> = {
  "восток": { lat: 55.7877, lon: 37.7756, district: "Измайлово", address: "г. Москва, ул. Первомайская, д. 42" },
  "юго-восток": { lat: 55.7011, lon: 37.7601, district: "Кузьминки", address: "г. Москва, Волгоградский пр-т, д. 112" },
  "югоцентр": { lat: 55.6723, lon: 37.5812, district: "Черёмушки", address: "г. Москва, ул. Профсоюзная, д. 56" },
  "север": { lat: 55.8452, lon: 37.5218, district: "Головинский", address: "г. Москва, Ленинградское ш., д. 70" },
  "северо-запад": { lat: 55.8285, lon: 37.4421, district: "Тушино", address: "г. Москва, ул. Свободы, д. 35" },
  "запад": { lat: 55.7314, lon: 37.4729, district: "Фили-Давыдково", address: "г. Москва, Кутузовский пр-т, д. 88" },
  "санкт-петербург": { lat: 59.9343, lon: 30.3351, district: "Центральный СПб", address: "г. Санкт-Петербург, Невский пр-т, д. 100" },
  "казань": { lat: 55.7961, lon: 49.1064, district: "Вахитовский", address: "г. Казань, ул. Баумана, д. 50" },
  "нижний новгород": { lat: 56.3269, lon: 44.0059, district: "Нижегородский", address: "г. Нижний Новгород, ул. Большая Покровская, д. 20" },
  "екатеринбург": { lat: 56.8389, lon: 60.6057, district: "Ленинский", address: "г. Екатеринбург, ул. Ленина, д. 40" }
};

/**
 * Извлекает понятное наименование сектора или района из имени файла
 */
export function extractAreaNameFromFilename(filename: string): string {
  let clean = filename.replace(/\.(csv|txt|json)$/i, "");
  clean = clean.replace(/контрольное распределение\.*/gi, "");
  clean = clean.replace(/синтетические данные\.*/gi, "");
  clean = clean.replace(/выгрузка|наряды|заявки|orders|tasks|data|export/gi, "");
  clean = clean.replace(/[_\-.]+/g, " ").trim();
  
  if (!clean || clean.length < 2) {
    return "Основной сектор";
  }
  
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Создает или подбирает склад/опорный пункт для указанного региона
 */
export function getOrCreateDepotForArea(areaName: string): Depot {
  const lower = areaName.toLowerCase();
  for (const [key, center] of Object.entries(KNOWN_REGION_CENTERS)) {
    if (lower.includes(key)) {
      return {
        lat: center.lat,
        lon: center.lon,
        district: center.district,
        address: center.address
      };
    }
  }

  // Детерминированный генератор координат базы на случай любого нового города или региона
  let h = 0;
  for (let i = 0; i < areaName.length; i++) h = (h * 31 + areaName.charCodeAt(i)) | 0;
  const latOffset = (Math.abs(h % 500) - 250) / 10000;
  const lonOffset = (Math.abs((h >> 3) % 500) - 250) / 10000;

  return {
    lat: Math.round((55.7558 + latOffset) * 10000) / 10000,
    lon: Math.round((37.6173 + lonOffset) * 10000) / 10000,
    district: `${areaName} (Опорный пункт)`,
    address: `Региональный офис билайн, сектор ${areaName}`
  };
}

/**
 * Парсит текст CSV (с разделителем точка с запятой, запятая или табуляция) в массив заявок Order[]
 */
export function parseOrdersCSV(csvText: string, areaName: string, depot?: Depot): Order[] {
  const currentDepot = depot || getOrCreateDepotForArea(areaName);
  // Удаляем BOM метку при наличии
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 1) return [];

  // Автоматическое определение разделителя по первой строке
  const firstLine = lines[0];
  let delimiter = ";";
  if (firstLine.includes(";")) {
    delimiter = ";";
  } else if (firstLine.includes(",")) {
    delimiter = ",";
  } else if (firstLine.includes("\t")) {
    delimiter = "\t";
  }

  // Проверяем, является ли первая строка заголовком таблицы
  const line0Parts = firstLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
  const isLine0Header = !/^\d{5,}$/.test(line0Parts[0]);

  const colMap: Record<string, number> = {};
  if (isLine0Header) {
    line0Parts.forEach((h, idx) => {
      colMap[h.toLowerCase()] = idx;
    });
  }

  const getCol = (row: string[], nameSubstrings: string[]): string => {
    for (const sub of nameSubstrings) {
      for (const [header, idx] of Object.entries(colMap)) {
        if (header.includes(sub)) {
          return row[idx]?.trim().replace(/^["']|["']$/g, "") || "";
        }
      }
    }
    return "";
  };

  const orders: Order[] = [];
  const seenIds = new Set<string>();
  const startIndex = isLine0Header ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("Точка старта") || !line.trim()) continue;

    // Проверка: является ли строка повторным заголовком таблицы
    if (line.toLowerCase().includes("заявка") && (line.toLowerCase().includes("начало") || line.toLowerCase().includes("адрес"))) {
      continue;
    }

    const row = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (row.length < 3) continue;

    let id = getCol(row, ["заявка", "id", "номер", "order", "код"]);
    // Позиционный поиск ID, если заголовок не распознан
    if (!id && /^\d+$/.test(row[0])) {
      id = row[0];
    }
    if (!id) {
      id = String(1000000 + i);
    }
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    let bkType = getCol(row, ["вид услуги bk", "вид услуги", "тип заявки bk", "тип заявки", "bk"]);
    let hdType = getCol(row, ["услуга bk", "тип заявки hd", "услуга", "hd"]);
    let startRaw = getCol(row, ["начало", "start", "окно от", "время"]);
    let endRaw = getCol(row, ["окончание", "конец", "end", "окно до"]);
    let district = getCol(row, ["подокруг", "район", "округ", "участок", "город", "district"]);
    let address = getCol(row, ["адрес", "address", "улица"]);
    const gigabitRaw = getCol(row, ["гигабит", "переделка", "gigabit"]);

    // Позиционный фолбек для стандартных выгрузок Билайн / HelpDesk (от 8 до 11 колонок):
    // колонка 0: ID
    // колонка 1: Вид услуги BK
    // колонка 2: Услуга BK
    // колонка 3: Тип заявки HD
    // колонка 4: Начало (DD.MM.YYYY HH:MM)
    // колонка 5: Окончание (DD.MM.YYYY HH:MM)
    // колонка 6: Подокруг / Район
    // колонка 7: Адрес
    if (!startRaw && row.length >= 6) {
      // Ищем колонку с шаблоном времени/даты
      for (let c = 1; c < row.length; c++) {
        if (/(\d{1,2}:\d{2})/.test(row[c])) {
          startRaw = row[c];
          if (c + 1 < row.length && /(\d{1,2}:\d{2})/.test(row[c + 1])) {
            endRaw = row[c + 1];
            if (!district && row[c + 2]) district = row[c + 2];
            if (!address && row[c + 3]) address = row[c + 3];
          }
          break;
        }
      }
      if (!bkType && row[1]) bkType = row[1];
      if (!hdType && row[2]) hdType = row[3] || row[2];
    }

    if (!district) district = "Центральный";
    if (!address) address = `ул. Сервисная, д. ${id}`;

    // Извлечение даты и временного интервала клиента из колонок начала и окончания
    let orderDate = "";
    let windowStart = "10:00";
    let windowEnd = "12:00";

    const parseDateTime = (raw: string, fallbackTime: string): { dateStr: string; timeStr: string } => {
      if (!raw) return { dateStr: "", timeStr: fallbackTime };
      const parts = raw.split(" ").filter(Boolean);
      let d = "";
      let t = fallbackTime;

      for (const p of parts) {
        if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(p) || /^\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(p)) {
          d = normalizeDateString(p);
        } else if (/^\d{1,2}:\d{2}/.test(p)) {
          t = p.length === 4 ? `0${p}` : p;
        }
      }
      return { dateStr: d, timeStr: t };
    };

    const startParsed = parseDateTime(startRaw, "10:00");
    const endParsed = parseDateTime(endRaw, "12:00");

    orderDate = startParsed.dateStr || endParsed.dateStr || "";
    windowStart = startParsed.timeStr;
    windowEnd = endParsed.timeStr;

    // День недели на русском языке
    let dayOfWeekRu = "";
    if (orderDate) {
      const parsedD = parseDateString(orderDate);
      if (parsedD) {
        dayOfWeekRu = getDayOfWeekRuName(parsedD);
      }
    }

    // Определение квалификации, приоритета и нормативной длительности согласно ТЗ хакатона
    let requiredSkill: Skill = "Локальные работы";
    let priority: OrderPriority = "normal";
    let duration = 50;
    let workMin = 30;
    let docMin = 0;

    const lowerBk = (bkType || "").toLowerCase();
    const lowerHd = (hdType || "").toLowerCase();

    if (
      lowerBk.includes("проблема") ||
      lowerHd.includes("авария") ||
      lowerBk.includes("авария") ||
      lowerHd.includes("повреждение") ||
      lowerBk.includes("инцидент")
    ) {
      requiredSkill = "Аварийные работы";
      priority = "urgent";
      duration = 100;
      workMin = 80;
      docMin = 0;
    } else if (
      lowerBk.includes("подключение") ||
      lowerHd.includes("подключение") ||
      lowerHd.includes("конвергенция")
    ) {
      requiredSkill = "Работы на подключение и дозаказы";
      duration = 90;
      workMin = 60;
      docMin = 10;
    } else if (
      lowerBk.includes("дозаказ") ||
      lowerHd.includes("дозаказ") ||
      lowerHd.includes("оборудован")
    ) {
      requiredSkill = "Работы на подключение и дозаказы";
      duration = 40;
      workMin = 10;
      docMin = 10;
    }

    // Требование к транспорту (автомобиль для загородных и удаленных районов)
    let reqTransport: TransportType | "Любой" = "Любой";
    if (
      district.includes("Домодедово") ||
      district.includes("Кашира") ||
      district.includes("Ступино") ||
      district.includes("Область") ||
      district.includes("Пригород")
    ) {
      reqTransport = "Автомобиль";
    }

    // Генерация детерминированных координат адреса относительно базы участка
    let hash = 0;
    const coordKey = `${district}_${address}`;
    for (let c = 0; c < coordKey.length; c++) {
      hash = (hash << 5) - hash + coordKey.charCodeAt(c);
      hash |= 0;
    }

    const offsetLat = ((Math.abs(hash) % 2400) - 1200) / 100000;
    const offsetLon = ((Math.abs(hash >> 3) % 2400) - 1200) / 70000;

    orders.push({
      id,
      area: areaName,
      date: orderDate || undefined,
      dayOfWeekRu: dayOfWeekRu || undefined,
      bkType: bkType || "Подключение",
      hdType: hdType || "Конвергенция абонента",
      windowStart,
      windowEnd,
      district,
      address,
      isGigabit: gigabitRaw.toLowerCase().includes("да"),
      priority,
      requiredSkill,
      requiredTransport: reqTransport,
      durationMinutes: duration,
      workMinutes: workMin,
      docMinutes: docMin,
      lat: roundNum(currentDepot.lat + offsetLat, 5),
      lon: roundNum(currentDepot.lon + offsetLon, 5)
    });
  }

  return orders;
}

/**
 * Создает типовой пул выездных бригад для любого района или города
 */
export function createDefaultEngineersForArea(areaName: string, depot?: Depot): Engineer[] {
  const currentDepot = depot || getOrCreateDepotForArea(areaName);

  const configs: Array<{
    name: string;
    transport: TransportType;
    skills: Skill[];
    shiftStart: string;
    shiftEnd: string;
    pattern: "5/2" | "2/2" | "everyday";
    shiftOffset?: number;
  }> = [
    {
      name: "Бригада 1 — Соколов А.С.",
      transport: "Автомобиль",
      skills: ["Локальные работы", "Работы на подключение и дозаказы", "Аварийные работы"],
      shiftStart: "08:00",
      shiftEnd: "17:00",
      pattern: "5/2"
    },
    {
      name: "Бригада 2 — Мельников М.В.",
      transport: "Автомобиль",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      shiftStart: "10:00",
      shiftEnd: "22:00",
      pattern: "5/2"
    },
    {
      name: "Бригада 3 — Матвеев Д.И.",
      transport: "Автомобиль",
      skills: ["Локальные работы", "Аварийные работы"],
      shiftStart: "10:00",
      shiftEnd: "22:00",
      pattern: "2/2",
      shiftOffset: 0
    },
    {
      name: "Бригада 4 — Попов Е.А.",
      transport: "Общественный транспорт",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      shiftStart: "09:00",
      shiftEnd: "21:00",
      pattern: "2/2",
      shiftOffset: 1
    },
    {
      name: "Бригада 5 — Арташкин П.Н.",
      transport: "Пешеход",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      shiftStart: "08:00",
      shiftEnd: "17:00",
      pattern: "5/2"
    },
    {
      name: "Бригада 6 — Комарь С.К.",
      transport: "Велосипед",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      shiftStart: "10:00",
      shiftEnd: "22:00",
      pattern: "2/2",
      shiftOffset: 2
    },
    {
      name: "Бригада 7 — Васильев Т.О.",
      transport: "Автомобиль",
      skills: ["Локальные работы", "Работы на подключение и дозаказы", "Аварийные работы"],
      shiftStart: "12:00",
      shiftEnd: "22:00",
      pattern: "everyday"
    },
    {
      name: "Бригада 8 — Козлов Р.Г.",
      transport: "Общественный транспорт",
      skills: ["Локальные работы", "Работы на подключение и дозаказы"],
      shiftStart: "10:00",
      shiftEnd: "20:00",
      pattern: "5/2"
    }
  ];

  return configs.map((c, idx) => ({
    id: `eng_${areaName.toLowerCase().replace(/[^a-zа-я0-9]/gi, "")}_${idx + 1}`,
    name: c.name,
    area: areaName,
    skills: c.skills,
    transport: c.transport,
    shiftStart: c.shiftStart,
    shiftEnd: c.shiftEnd,
    workPeriods: [{ start: c.shiftStart, end: c.shiftEnd }],
    schedule: createDefaultEngineerSchedule(c.pattern, [{ start: c.shiftStart, end: c.shiftEnd }], c.shiftOffset || 0),
    startDepot: currentDepot,
    maxCapacityUnits: 6,
    isActive: true
  }));
}

/**
 * Парсит несколько загруженных CSV файлов одновременно и формирует словарь датасетов по регионам
 */
export function parseMultipleCSVFiles(
  files: Array<{ name: string; content: string }>,
  existingDatasets: Record<string, AreaDataset> = {},
  fallbackArea?: string
): Record<string, AreaDataset> {
  const result: Record<string, AreaDataset> = { ...existingDatasets };

  for (const file of files) {
    let areaName = extractAreaNameFromFilename(file.name);
    // Если имя файла общее, но передан фолбек-сектор, используем его
    if (
      (areaName === "Основной сектор" || areaName.startsWith("Data") || areaName.startsWith("Orders")) &&
      fallbackArea &&
      fallbackArea.trim().length > 0
    ) {
      areaName = fallbackArea;
    }

    const existing = result[areaName];
    const depot = existing?.depot || getOrCreateDepotForArea(areaName);

    const parsedOrders = parseOrdersCSV(file.content, areaName, depot);
    if (parsedOrders.length === 0) continue;

    // Автоматическое определение названия участка по колонкам подокругов/районов
    if (areaName === "Основной сектор") {
      const distinctDistricts = Array.from(new Set(parsedOrders.map((o) => o.district))).filter(
        (d) => d && d !== "Центральный"
      );
      if (distinctDistricts.length > 0) {
        areaName = distinctDistricts[0];
      }
    }

    const mergedOrders: Order[] = existing ? [...existing.orders] : [];
    const seenIds = new Set(mergedOrders.map((o) => o.id));

    for (const order of parsedOrders) {
      if (!seenIds.has(order.id)) {
        seenIds.add(order.id);
        mergedOrders.push({ ...order, area: areaName });
      }
    }

    // Выделение уникальных дат в данном датасете для фильтрации и календаря
    const dateSet = new Set<string>();
    mergedOrders.forEach((o) => {
      if (o.date) dateSet.add(o.date);
    });

    const availableDates = Array.from(dateSet).sort((a, b) => {
      const da = parseDateString(a)?.getTime() || 0;
      const db = parseDateString(b)?.getTime() || 0;
      return da - db;
    });

    const engineers = existing?.engineers?.length
      ? existing.engineers
      : createDefaultEngineersForArea(areaName, depot);

    result[areaName] = {
      area: areaName,
      depot,
      orders: mergedOrders,
      engineers,
      availableDates
    };
  }

  return result;
}

function roundNum(num: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(num * f) / f;
}
