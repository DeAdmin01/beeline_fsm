import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Depot, EngineerRoute, Order, RouteStop } from "../core/types";
import { X, Navigation, Clock, CheckCircle2, AlertTriangle, Printer } from "lucide-react";

// Подключение Web Worker для MapLibre GL через сборщик Vite
maplibregl.setWorkerUrl(maplibreWorkerUrl);

interface MapViewProps {
  depot: Depot;
  routes: EngineerRoute[];
  unassignedOrders: Order[];
  selectedEngineerId: string | null;
  onSelectEngineer: (engineerId: string | null) => void;
  onInspectOrder: (order: Order, stop?: RouteStop, engineerId?: string) => void;
  onOpenRouteSheet?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  depot,
  routes,
  unassignedOrders,
  selectedEngineerId,
  onSelectEngineer,
  onInspectOrder,
  onOpenRouteSheet
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const registeredRouteLayersRef = useRef<string[]>([]);

  // Объект выбранного маршрута для карточки информации
  const activeRoute = selectedEngineerId
    ? routes.find((r) => r.engineerId === selectedEngineerId) || null
    : null;

  // 1. Инициализация экземпляра карты MapLibre GL с подложкой 2ГИС
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "2gis-raster": {
              type: "raster",
              tiles: [
                "https://tile0.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.1",
                "https://tile1.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.1",
                "https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.1",
                "https://tile3.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.1"
              ],
              tileSize: 256,
              attribution: "© 2ГИС — Городская карта"
            }
          },
          layers: [
            {
              id: "2gis-base-layer",
              type: "raster",
              source: "2gis-raster",
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [depot.lon, depot.lat],
        zoom: 11.5,
        attributionControl: false
      });

      // Элементы управления масштабом и атрибуция
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: "2ГИС • Beeline FSM Router"
        }),
        "bottom-right"
      );

      mapInstanceRef.current = map;

      // Обработка изменения размера окна браузера
      const handleResize = () => {
        map.resize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        map.remove();
        mapInstanceRef.current = null;
      };
    }
  }, []);

  // 2. Обновление слоев, маркеров и положения камеры
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const renderLayersAndMarkers = () => {
      // Удаление предыдущих маркеров точек
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Удаление старых слоев и источников маршрутов
      const currentRouteIds = new Set(routes.map((r) => r.engineerId));
      
      // Шаг А: Удаление устаревших слоев визуализации
      registeredRouteLayersRef.current.forEach((layerId) => {
        const engId = layerId
          .replace("route-layer-", "")
          .replace("route-casing-", "")
          .replace("route-arrows-", "");
        if (!currentRouteIds.has(engId)) {
          try {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
          } catch {
            // игнорируем ошибку при отсутствии слоя
          }
        }
      });

      // Шаг Б: Удаление устаревших источников GeoJSON данных
      const activeSourceIds = new Set(routes.map((r) => `route-source-${r.engineerId}`));
      registeredRouteLayersRef.current.forEach((layerId) => {
        const engId = layerId
          .replace("route-layer-", "")
          .replace("route-casing-", "")
          .replace("route-arrows-", "");
        const sourceId = `route-source-${engId}`;
        if (!activeSourceIds.has(sourceId)) {
          try {
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          } catch {
            // игнорируем ошибку при отсутствии источника
          }
        }
      });
      registeredRouteLayersRef.current = [];

      // 1. Маркер базового склада/опорного пункта сектора
      const depotEl = document.createElement("div");
      depotEl.className = "depot-marker";
      depotEl.innerHTML = `
        <div style="
          background: #ffb800; 
          border: 2px solid #000; 
          border-radius: 50%; 
          width: 34px; 
          height: 34px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          font-size: 16px;
          cursor: pointer;
        ">🏢</div>
      `;

      const depotPopup = new maplibregl.Popup({ offset: 16 }).setHTML(`
        <div style="font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #ffb800; font-size: 13px;">Опорный склад / База сектора</div>
          <div><b>Адрес:</b> ${depot.address}</div>
          <div><b>Район:</b> ${depot.district}</div>
        </div>
      `);

      const depotMarker = new maplibregl.Marker({ element: depotEl })
        .setLngLat([depot.lon, depot.lat])
        .setPopup(depotPopup)
        .addTo(map);

      markersRef.current.push(depotMarker);

      // 2. Отрисовка полилиний маршрутов (подложка-контур + яркая цветная траектория)
      routes.forEach((route) => {
        const sourceId = `route-source-${route.engineerId}`;
        const casingId = `route-casing-${route.engineerId}`;
        const layerId = `route-layer-${route.engineerId}`;
        const arrowLayerId = `route-arrows-${route.engineerId}`;
        const arrowImgId = `arrow-icon-${route.engineerId}`;

        // Регистрация стрелок направления движения в корпоративный цвет бригады
        if (!map.hasImage(arrowImgId)) {
          const canvas = document.createElement("canvas");
          canvas.width = 24;
          canvas.height = 24;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, 24, 24);
            // Внешний контур для четкого контраста на любой карте
            ctx.beginPath();
            ctx.moveTo(3, 4);
            ctx.lineTo(20, 12);
            ctx.lineTo(3, 20);
            ctx.lineTo(8, 12);
            ctx.closePath();
            ctx.fillStyle = "#000000";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            // Внутреннее цветное ядро стрелки
            ctx.beginPath();
            ctx.moveTo(5, 6);
            ctx.lineTo(17, 12);
            ctx.lineTo(5, 18);
            ctx.lineTo(9, 12);
            ctx.closePath();
            ctx.fillStyle = route.color || "#ffb800";
            ctx.fill();

            const imgData = ctx.getImageData(0, 0, 24, 24);
            map.addImage(arrowImgId, imgData);
          }
        }

        const isSelected = selectedEngineerId === null || selectedEngineerId === route.engineerId;
        
        // Построение детальной геометрии пути (с учетом сегментов метро и дорожных перегонов)
        const coordinates: [number, number][] = [];
        route.stops.forEach((stop, idx) => {
          if (idx === 0) {
            coordinates.push([stop.lon, stop.lat]);
          } else if (stop.transitPath && stop.transitPath.length > 0) {
            for (const pt of stop.transitPath) {
              const last = coordinates[coordinates.length - 1];
              if (!last || Math.abs(last[0] - pt[0]) > 0.00001 || Math.abs(last[1] - pt[1]) > 0.00001) {
                coordinates.push(pt);
              }
            }
          } else {
            coordinates.push([stop.lon, stop.lat]);
          }
        });
        if (coordinates.length === 1) {
          coordinates.push([coordinates[0][0] + 0.00001, coordinates[0][1] + 0.00001]);
        }

        const geojsonData: any = {
          type: "Feature",
          properties: {
            engineerId: route.engineerId,
            engineerName: route.engineer.name,
            color: route.color
          },
          geometry: {
            type: "LineString",
            coordinates
          }
        };

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
        } else {
          try {
            map.addSource(sourceId, {
              type: "geojson",
              data: geojsonData
            });

            // Слой подложки (темная окантовка для читаемости на пестром фоне карты)
            map.addLayer({
              id: casingId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round"
              },
              paint: {
                "line-color": "#000000",
                "line-width": isSelected ? 6.5 : 2.5,
                "line-opacity": isSelected ? (selectedEngineerId ? 0.8 : 0.4) : 0.08
              }
            });

            // Основная цветная линия маршрута
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round"
              },
              paint: {
                "line-color": route.color,
                "line-width": isSelected ? (selectedEngineerId ? 5 : 3) : 1.5,
                "line-opacity": isSelected ? 0.95 : 0.15
              }
            });

            // Стрелки направления обхода адресов
            map.addLayer({
              id: arrowLayerId,
              type: "symbol",
              source: sourceId,
              layout: {
                "symbol-placement": "line",
                "symbol-spacing": 75,
                "icon-image": arrowImgId,
                "icon-size": isSelected ? 0.75 : 0.5,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true
              },
              paint: {
                "icon-opacity": isSelected ? (selectedEngineerId ? 1.0 : 0.85) : 0.2
              }
            });

            map.on("click", layerId, () => {
              onSelectEngineer(route.engineerId);
            });

            map.on("mouseenter", layerId, () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", layerId, () => {
              map.getCanvas().style.cursor = "";
            });
          } catch (err) {
            console.warn("Failed to register route layer:", err);
          }
        }

        registeredRouteLayersRef.current.push(casingId, layerId, arrowLayerId);

        // Обновление стилей при изменении выбранного инженера
        if (map.getLayer(casingId)) {
          map.setPaintProperty(casingId, "line-width", isSelected ? 6.5 : 2.5);
          map.setPaintProperty(casingId, "line-opacity", isSelected ? (selectedEngineerId ? 0.8 : 0.4) : 0.08);
        }

        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, "line-width", isSelected ? (selectedEngineerId ? 5 : 3) : 1.5);
          map.setPaintProperty(layerId, "line-opacity", isSelected ? 0.95 : 0.15);
        }

        if (map.getLayer(arrowLayerId)) {
          map.setPaintProperty(arrowLayerId, "icon-opacity", isSelected ? (selectedEngineerId ? 1.0 : 0.85) : 0.2);
          map.setLayoutProperty(arrowLayerId, "icon-size", isSelected ? 0.75 : 0.5);
        }

        // 3. Маркеры точек обслуживания нарядов
        route.stops.forEach((stop, idx) => {
          if (stop.isDepot) return;

          const isUrgent = stop.order?.priority === "urgent";
          const isStopSelected = selectedEngineerId === null || selectedEngineerId === route.engineerId;

          const pinBg = isUrgent ? "#f43f5e" : route.color;

          const el = document.createElement("div");
          el.className = "order-pin";
          el.style.display = isStopSelected ? "flex" : "none";
          el.innerHTML = `
            <div style="
              background: ${pinBg};
              border: 2px solid #ffffff;
              border-radius: 50%;
              width: ${selectedEngineerId ? "26px" : "22px"};
              height: ${selectedEngineerId ? "26px" : "22px"};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 800;
              font-size: ${selectedEngineerId ? "12px" : "11px"};
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              cursor: pointer;
              transition: transform 0.15s ease;
            ">${idx}</div>
          `;

          const transportBadge = route.engineer.transport === "Автомобиль" 
            ? "🚗 Автомобиль" 
            : route.engineer.transport === "Общественный транспорт" 
              ? "🚇 Общ. транспорт / Метро" 
              : route.engineer.transport === "Велосипед" 
                ? "🚲 Велотранспорт" 
                : "🚶 Пешком";

          const popupContent = document.createElement("div");
          popupContent.style.fontSize = "12px";
          popupContent.style.lineHeight = "1.4";
          popupContent.innerHTML = `
            <div style="font-weight: 800; font-size: 13px; color: ${pinBg}; margin-bottom: 3px;">
              ${isUrgent ? "⚠️ АВАРИЙНЫЙ НАРЯД" : "Наряд #" + stop.order?.id} (Точка ${idx})
            </div>
            <div><b>Специалист:</b> ${route.engineer.name} <span style="font-size: 11px; opacity: 0.85;">(${transportBadge})</span></div>
            <div><b>Адрес:</b> ${stop.address}</div>
            <div><b>Район:</b> ${stop.district}</div>
            <div><b>Окно клиента:</b> ${stop.order?.windowStart} – ${stop.order?.windowEnd}</div>
            <div><b>Расчетный визит:</b> ${stop.startWorkTime} – ${stop.endWorkTime}</div>
            <div><b>Доезд:</b> ${stop.travelDistanceKm} км (${stop.travelDurationMinutes} мин)</div>
            ${stop.transitDescription ? `
              <div style="
                background: rgba(255,184,0,0.12); 
                border-left: 3px solid #ffb800; 
                padding: 4px 6px; 
                border-radius: 3px; 
                margin-top: 5px; 
                font-size: 11px;
                color: var(--text-main);
              ">
                <b>Маршрут:</b> ${stop.transitDescription}
              </div>
            ` : ""}
            <button id="btn-popup-audit-${stop.order?.id}" style="
              margin-top: 8px;
              width: 100%;
              background: #ffb800;
              color: #000;
              border: none;
              padding: 5px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
            ">Логика назначения (XAI)</button>
          `;

          const auditBtn = popupContent.querySelector(`#btn-popup-audit-${stop.order?.id}`);
          if (auditBtn && stop.order) {
            auditBtn.addEventListener("click", () => {
              onInspectOrder(stop.order!, stop, route.engineerId);
            });
          }

          const popup = new maplibregl.Popup({ offset: 16 }).setDOMContent(popupContent);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lon, stop.lat])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      });

      // 4. Маркеры нераспределенных нарядов (в резерве)
      unassignedOrders.forEach((order) => {
        const el = document.createElement("div");
        el.style.display = selectedEngineerId === null ? "flex" : "none";
        el.innerHTML = `
          <div style="
            background: #64748b;
            border: 2px dashed #f43f5e;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
            cursor: pointer;
          ">!</div>
        `;

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
          <div style="font-size: 12px; line-height: 1.35;">
            <div style="color: #f43f5e; font-weight: 700;">Наряд в резерве #${order.id}</div>
            <div><b>Адрес:</b> ${order.address}</div>
            <div><b>Окно:</b> ${order.windowStart} – ${order.windowEnd}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Свободные бригады исчерпаны</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([order.lon, order.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 5. Автоматическое центрирование камеры на выбранном маршруте или секторе
      if (selectedEngineerId) {
        const selRoute = routes.find((r) => r.engineerId === selectedEngineerId);
        if (selRoute && selRoute.stops.length > 0) {
          const selBounds = new maplibregl.LngLatBounds();
          selRoute.stops.forEach((s) => selBounds.extend([s.lon, s.lat]));
          selBounds.extend([depot.lon, depot.lat]);

          map.fitBounds(selBounds, {
            padding: { top: 90, bottom: 80, left: 60, right: 60 },
            maxZoom: 14,
            duration: 800
          });
        }
      } else {
        const allBounds = new maplibregl.LngLatBounds();
        allBounds.extend([depot.lon, depot.lat]);
        routes.forEach((r) => r.stops.forEach((s) => allBounds.extend([s.lon, s.lat])));

        if (!allBounds.isEmpty()) {
          map.fitBounds(allBounds, {
            padding: { top: 70, bottom: 40, left: 50, right: 50 },
            maxZoom: 13.5,
            duration: 700
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      renderLayersAndMarkers();
    } else {
      map.once("load", renderLayersAndMarkers);
    }
  }, [depot, routes, unassignedOrders, selectedEngineerId]);

  return (
    <div
      className="fsm-card position-relative overflow-hidden"
      style={{ height: "calc(100vh - 145px)", minHeight: "540px" }}
    >
      {/* Верхняя панель фильтрации по бригадам над картой */}
      <div
        className="position-absolute top-0 start-0 end-0 p-2 d-flex align-items-center gap-1 overflow-auto"
        style={{
          zIndex: 10,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(8px)"
        }}
      >
        <button
          className={`btn btn-xs rounded-pill px-3 py-1 text-nowrap fw-semibold ${
            selectedEngineerId === null ? "btn-warning text-dark" : "btn-outline-secondary text-theme-muted"
          }`}
          style={{ fontSize: "0.78rem" }}
          onClick={() => onSelectEngineer(null)}
        >
          Все маршруты ({routes.length})
        </button>

        <div className="vr mx-1" style={{ height: 16, opacity: 0.2 }} />

        {routes.map((r) => {
          const isSelected = selectedEngineerId === r.engineerId;
          return (
            <button
              key={r.engineerId}
              className="btn btn-xs rounded-pill px-2 py-1 text-nowrap d-flex align-items-center gap-1.5 shadow-sm"
              style={{
                fontSize: "0.78rem",
                border: isSelected ? "2px solid var(--beeline-yellow)" : "1px solid var(--border-color)",
                background: isSelected ? "var(--nav-active-bg)" : "transparent",
                color: isSelected ? "var(--text-main)" : "var(--text-muted)",
                fontWeight: isSelected ? 700 : 500
              }}
              onClick={() => onSelectEngineer(isSelected ? null : r.engineerId)}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: r.color,
                  boxShadow: `0 0 4px ${r.color}`
                }}
              />
              <span>{r.engineer.name}</span>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.65rem",
                  background: isSelected ? "var(--beeline-yellow)" : "var(--border-strong)",
                  color: isSelected ? "#000" : "var(--text-muted)"
                }}
              >
                {r.totalOrders}
              </span>
            </button>
          );
        })}
      </div>

      {/* Информационная карточка выбранного маршрута в углу карты */}
      {activeRoute && (
        <div
          className="position-absolute bottom-0 start-0 m-3 p-3 fsm-card shadow-lg"
          style={{
            zIndex: 15,
            maxWidth: 360,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10
          }}
        >
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: activeRoute.color,
                  boxShadow: `0 0 6px ${activeRoute.color}`
                }}
              />
              <div>
                <div className="fw-bold text-theme-main" style={{ fontSize: "0.95rem" }}>
                  {activeRoute.engineer.name}
                </div>
                <div className="text-theme-muted small">
                  {activeRoute.engineer.transport} • {activeRoute.shiftStart} – {activeRoute.shiftEnd}
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectEngineer(null)}
              className="btn btn-sm btn-link p-0 text-muted"
              title="Сбросить выбор бригады"
            >
              <X size={16} />
            </button>
          </div>

          <div className="d-grid grid-template-columns-3 gap-2 py-2 border-top border-bottom border-theme mb-2 text-center" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>НАРЯДОВ</div>
              <div className="fw-bold text-theme-main">{activeRoute.totalOrders}</div>
            </div>
            <div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>ПРОБЕГ</div>
              <div className="fw-bold text-info">{activeRoute.totalDistanceKm} км</div>
            </div>
            <div>
              <div className="text-theme-muted" style={{ fontSize: "0.72rem" }}>В ПУТИ</div>
              <div className="fw-bold text-theme-main">{activeRoute.totalTravelTimeMin} мин</div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className="small text-theme-muted">
              Финиш: <b>{activeRoute.finishTime}</b>
            </span>
            {onOpenRouteSheet && (
              <button
                onClick={onOpenRouteSheet}
                className="btn btn-xs btn-outline-warning d-flex align-items-center gap-1 py-1 px-2"
                style={{ fontSize: "0.75rem" }}
              >
                <Printer size={13} />
                <span>Маршрутный лист</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* WebGL контейнер MapLibre */}
      <div ref={mapContainerRef} className="maplibre-container" />
    </div>
  );
};
