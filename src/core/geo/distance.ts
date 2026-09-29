/**
 * Модуль георасчетов: вычисление расстояний, времен в пути и симуляция маршрутов
 * с учетом специфики дорожной сети, станций метрополитена и различных видов транспорта.
 */

import { TransportType } from "../types";

/**
 * Станция метрополитена
 */
export interface MetroStation {
  name: string; // Название станции
  line: string; // Линия метро
  lat: number;  // Широта
  lon: number;  // Долгота
}

/**
 * Ключевые станции метрополитена Москвы для расчета перемещений на общественном транспорте
 */
export const MOSCOW_METRO_STATIONS: MetroStation[] = [
  // Таганско-Краснопресненская линия (Линия 7)
  { name: "Выхино", line: "Таганско-Краснопресненская", lat: 55.7157, lon: 37.8183 },
  { name: "Рязанский проспект", line: "Таганско-Краснопресненская", lat: 55.7169, lon: 37.7925 },
  { name: "Кузьминки", line: "Таганско-Краснопресненская", lat: 55.7053, lon: 37.7661 },
  { name: "Текстильщики", line: "Таганско-Краснопресненская", lat: 55.7092, lon: 37.7327 },
  { name: "Волгоградский проспект", line: "Таганско-Краснопресненская", lat: 55.7253, lon: 37.6865 },
  { name: "Пролетарская", line: "Таганско-Краснопресненская", lat: 55.7314, lon: 37.6669 },
  { name: "Таганская", line: "Таганско-Краснопресненская", lat: 55.7426, lon: 37.6531 },
  { name: "Китай-город", line: "Таганско-Краснопресненская", lat: 55.7548, lon: 37.6327 },

  // Калининская линия (Линия 8)
  { name: "Новокосино", line: "Калининская", lat: 55.7451, lon: 37.8643 },
  { name: "Новогиреево", line: "Калининская", lat: 55.7519, lon: 37.8173 },
  { name: "Перово", line: "Калининская", lat: 55.7508, lon: 37.7845 },
  { name: "Шоссе Энтузиастов", line: "Калининская", lat: 55.7583, lon: 37.7508 },
  { name: "Авиамоторная", line: "Калининская", lat: 55.7519, lon: 37.7169 },
  { name: "Площадь Ильича", line: "Калининская", lat: 55.7475, lon: 37.6811 },
  { name: "Марксистская", line: "Калининская", lat: 55.7417, lon: 37.6561 },

  // Люблинско-Дмитровская линия (Линия 10)
  { name: "Зябликово", line: "Люблинско-Дмитровская", lat: 55.6192, lon: 37.7461 },
  { name: "Марьино", line: "Люблинско-Дмитровская", lat: 55.6500, lon: 37.7442 },
  { name: "Братиславская", line: "Люблинско-Дмитровская", lat: 55.6592, lon: 37.7506 },
  { name: "Люблино", line: "Люблинско-Дмитровская", lat: 55.6761, lon: 37.7628 },
  { name: "Волжская", line: "Люблинско-Дмитровская", lat: 55.6908, lon: 37.7542 },
  { name: "Печатники", line: "Люблинско-Дмитровская", lat: 55.6931, lon: 37.7289 },
  { name: "Кожуховская", line: "Люблинско-Дмитровская", lat: 55.7058, lon: 37.6853 },
  { name: "Дубровка", line: "Люблинско-Дмитровская", lat: 55.7178, lon: 37.6767 },

  // Замоскворецкая и Серпуховско-Тимирязевская линии (Линии 2 и 9)
  { name: "Царицыно", line: "Замоскворецкая", lat: 55.6214, lon: 37.6692 },
  { name: "Кантемировская", line: "Замоскворецкая", lat: 55.6358, lon: 37.6564 },
  { name: "Каширская", line: "Замоскворецкая", lat: 55.6553, lon: 37.6492 },
  { name: "Коломенская", line: "Замоскворецкая", lat: 55.6781, lon: 37.6644 },
  { name: "Технопарк", line: "Замоскворецкая", lat: 55.6939, lon: 37.6642 },
  { name: "Автозаводская", line: "Замоскворецкая", lat: 55.7067, lon: 37.6569 },
  { name: "Павелецкая", line: "Замоскворецкая", lat: 55.7314, lon: 37.6361 },
  { name: "Нагатинская", line: "Серпуховско-Тимирязевская", lat: 55.6828, lon: 37.6222 },
  { name: "Нагорная", line: "Серпуховско-Тимирязевская", lat: 55.6728, lon: 37.6106 },
  { name: "Тульская", line: "Серпуховско-Тимирязевская", lat: 55.7092, lon: 37.6222 },
  { name: "Серпуховская", line: "Серпуховско-Тимирязевская", lat: 55.7275, lon: 37.6253 }
];

/**
 * Вычисляет расстояние по формуле гаверсинусов (по прямой сфере Земли) в километрах
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в километрах
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Находит ближайшую станцию московского метрополитена к заданной координате
 */
export function findNearestMetroStation(lat: number, lon: number): { station: MetroStation; distKm: number } {
  let nearest = MOSCOW_METRO_STATIONS[0];
  let minDist = Infinity;

  for (const st of MOSCOW_METRO_STATIONS) {
    const d = haversineDistanceKm(lat, lon, st.lat, st.lon);
    if (d < minDist) {
      minDist = d;
      nearest = st;
    }
  }

  return { station: nearest, distKm: minDist };
}

/**
 * Результат детального логистического расчета перемещения между двумя точками
 */
export interface TransitLegInfo {
  distanceKm: number;                     // Фактический километраж (км)
  durationMinutes: number;                // Время в пути с учетом заторов и посадки (мин)
  transitType: "car" | "metro" | "bike" | "walk"; // Преобладающий тип передвижения
  routeCoords: [number, number][];        // Координаты траектории [долгота, широта] для отрисовки на карте
  description: string;                    // Понятное описание маршрута
}

/**
 * Вычисляет точное расстояние и время в пути с учетом типа транспорта:
 * - Автомобиль: коэффициент извилистости УДС (1.32) + средняя скорость в потоке (30 км/ч) + буфер парковки
 * - Общественный транспорт: модель метрополитена (пешком до метро -> поезд -> пешком до дома)
 * - Пешеход: прямое перемещение пешком со скоростью 5 км/ч
 * - Велосипед: скорость 16 км/ч с коэффициентом тротуаров
 */
export function getDetailedTransitInfo(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  transport: TransportType,
  useMetro: boolean = true
): TransitLegInfo {
  const straightKm = haversineDistanceKm(lat1, lon1, lat2, lon2);

  // Минимальное расстояние (тот же дом или соседний подъезд)
  if (straightKm < 0.12) {
    return {
      distanceKm: 0.15,
      durationMinutes: 4,
      transitType: "walk",
      routeCoords: [[lon1, lat1], [lon2, lat2]],
      description: "Пеший переход в соседнее здание (4 мин)"
    };
  }

  // 1. АВТОМОБИЛЬ
  if (transport === "Автомобиль") {
    const roadDist = Math.round(straightKm * 1.32 * 10) / 10;
    // Средняя скорость 30 км/ч в условиях городской застройки + 4 мин на парковку и подъем к клиенту
    const duration = Math.max(5, Math.round((roadDist / 30) * 60 + 4));

    // Построение плавной траектории дороги
    const midLat = (lat1 + lat2) / 2 + (lon2 - lon1) * 0.04;
    const midLon = (lon1 + lon2) / 2 - (lat2 - lat1) * 0.04;

    return {
      distanceKm: roadDist,
      durationMinutes: duration,
      transitType: "car",
      routeCoords: [
        [lon1, lat1],
        [midLon, midLat],
        [lon2, lat2]
      ],
      description: `Автомобиль по дорожной сети: ${roadDist} км (~${duration} мин)`
    };
  }

  // 2. ОБЩЕСТВЕННЫЙ ТРАНСПОРТ (с учетом линий и станций метро)
  if (transport === "Общественный транспорт") {
    // На коротких дистанциях (<= 1.2 км) инженер идет пешком без спуска в метро
    if (straightKm <= 1.2 || !useMetro) {
      const walkDist = Math.round(straightKm * 1.2 * 10) / 10;
      const walkTime = Math.max(4, Math.round((walkDist / 5) * 60 + 2));
      return {
        distanceKm: walkDist,
        durationMinutes: walkTime,
        transitType: "walk",
        routeCoords: [[lon1, lat1], [lon2, lat2]],
        description: `Пешком до объекта: ${walkDist} км (${walkTime} мин)`
      };
    }

    // Длинные дистанции: пешком до метро -> поезд -> пешком до адреса
    const stOrigin = findNearestMetroStation(lat1, lon1);
    const stDest = findNearestMetroStation(lat2, lon2);

    const walkToMetroKm = Math.round(stOrigin.distKm * 1.22 * 10) / 10;
    const walkToMetroMin = Math.round((walkToMetroKm / 5) * 60);

    const walkFromMetroKm = Math.round(stDest.distKm * 1.22 * 10) / 10;
    const walkFromMetroMin = Math.round((walkFromMetroKm / 5) * 60);

    // Движение на метропоезде
    const metroDistKm = Math.round(haversineDistanceKm(stOrigin.station.lat, stOrigin.station.lon, stDest.station.lat, stDest.station.lon) * 1.15 * 10) / 10;
    // Средняя скорость поезда ~40 км/ч + 3.5 мин ожидание на платформе
    const metroRideMin = Math.max(3, Math.round((metroDistKm / 40) * 60 + 3.5));

    const totalDistance = Math.round((walkToMetroKm + metroDistKm + walkFromMetroKm) * 10) / 10;
    const totalDuration = walkToMetroMin + metroRideMin + walkFromMetroMin;

    const routeCoords: [number, number][] = [
      [lon1, lat1],
      [stOrigin.station.lon, stOrigin.station.lat],
      [stDest.station.lon, stDest.station.lat],
      [lon2, lat2]
    ];

    const description = stOrigin.station.name === stDest.station.name
      ? `ОТ/Пешком через м. ${stOrigin.station.name}: ${totalDistance} км (${totalDuration} мин)`
      : `Метро: м. ${stOrigin.station.name} 🚇 м. ${stDest.station.name} (${totalDuration} мин)`;

    return {
      distanceKm: totalDistance,
      durationMinutes: totalDuration,
      transitType: "metro",
      routeCoords,
      description
    };
  }

  // 3. ВЕЛОСИПЕД / СИМ
  if (transport === "Велосипед") {
    const bikeDist = Math.round(straightKm * 1.22 * 10) / 10;
    const duration = Math.max(4, Math.round((bikeDist / 16) * 60 + 3));
    return {
      distanceKm: bikeDist,
      durationMinutes: duration,
      transitType: "bike",
      routeCoords: [[lon1, lat1], [lon2, lat2]],
      description: `Велосипед: ${bikeDist} км (${duration} мин)`
    };
  }

  // 4. ПЕШЕХОД
  const walkDist = Math.round(straightKm * 1.18 * 10) / 10;
  const duration = Math.max(4, Math.round((walkDist / 5) * 60 + 2));
  return {
    distanceKm: walkDist,
    durationMinutes: duration,
    transitType: "walk",
    routeCoords: [[lon1, lat1], [lon2, lat2]],
    description: `Пешком: ${walkDist} км (${duration} мин)`
  };
}

/**
 * Расчет реального дорожного расстояния с коэффициентом извилистости УДС Москвы (~1.32)
 */
export function getRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const straight = haversineDistanceKm(lat1, lon1, lat2, lon2);
  if (straight < 0.1) return 0.2;
  return Math.round(straight * 1.32 * 10) / 10;
}

/**
 * Оценка времени в пути в минутах с учетом вида транспорта и городских условий
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  transport: TransportType
): number {
  if (distanceKm <= 0.2) return 5;

  let speedKmh = 30;
  let bufferMinutes = 4;

  switch (transport) {
    case "Автомобиль":
      speedKmh = 30;
      bufferMinutes = 5;
      break;
    case "Общественный транспорт":
      speedKmh = 22;
      bufferMinutes = 6;
      break;
    case "Велосипед":
      speedKmh = 16;
      bufferMinutes = 3;
      break;
    case "Пешеход":
      speedKmh = 5;
      bufferMinutes = 2;
      break;
  }

  const travelMins = (distanceKm / speedKmh) * 60 + bufferMinutes;
  return Math.max(5, Math.round(travelMins));
}
