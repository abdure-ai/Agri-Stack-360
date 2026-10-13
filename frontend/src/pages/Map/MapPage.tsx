// Interactive map: official boundaries on OpenStreetMap, with the layers this user may see
// (disease hotspots, NMIS crop markets, agro-dealer shops, farms). Rules: backend/maps.py.
import "leaflet/dist/leaflet.css";
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { MapFarmCount, MapFarmer, MapLayerName, MapLayers } from "@/types/map";
import { formatETB, formatFullDate } from "@/utils/formatters";
import type { FeatureCollection } from "geojson";
import type { LatLngExpression, PathOptions } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

const ETHIOPIA: LatLngExpression = [9.1, 40.4];
const ZOOM_BY_LEVEL = [6, 7, 8, 10];
const DISEASE_COLORS = ["#f04438", "#f79009", "#7a5af8", "#ee46bc", "#0ba5ec"];
const BAND_RADIUS = { low: 7, medium: 11, high: 16 } as const;
const LAYER_ORDER: MapLayerName[] = ["disease", "markets", "shops", "farms", "abcs"];
const LAYER_COLOR: Record<MapLayerName, string> = {
  disease: "#f04438",
  markets: "#12b76a",
  shops: "#2e90fa",
  farms: "#7a5af8",
  abcs: "#0e9384",
};

type Level = 1 | 2 | 3;
const boundaryCache = new Map<Level, Promise<FeatureCollection>>();
function loadBoundaries(level: Level): Promise<FeatureCollection> {
  if (!boundaryCache.has(level)) {
    boundaryCache.set(level, fetch(`/geo/eth_adm${level}.json`).then((r) => {
      if (!r.ok) throw new Error(`boundaries ${level}: ${r.status}`);
      return r.json();
    }));
  }
  return boundaryCache.get(level)!;
}

/** Region outlines always; zones from zoom 7, woredas from zoom 9 (loaded only when needed). */
function Boundaries() {
  const [zoom, setZoom] = useState(6);
  const [shapes, setShapes] = useState<Partial<Record<Level, FeatureCollection>>>({});
  useMapEvents({ zoomend: (e) => setZoom(e.target.getZoom()) });
  const wanted: Level[] = [1, ...(zoom >= 7 ? [2 as Level] : []), ...(zoom >= 9 ? [3 as Level] : [])];
  const key = wanted.join(",");
  useEffect(() => {
    let alive = true;
    for (const level of key.split(",").map(Number) as Level[]) {
      loadBoundaries(level)
        .then((fc) => alive && setShapes((s) => (s[level] ? s : { ...s, [level]: fc })))
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [key]);
  const style = (level: Level): PathOptions => ({
    color: level === 1 ? "#344054" : level === 2 ? "#667085" : "#98a2b3",
    weight: level === 1 ? 1.6 : level === 2 ? 1 : 0.6,
    dashArray: level === 3 ? "2 3" : undefined,
    fill: false,
  });
  return (
    <>
      {wanted.map((level) =>
        shapes[level] ? (
          <GeoJSON
            key={level}
            data={shapes[level]!}
            style={() => style(level)}
            interactive={level === 3}
            onEachFeature={(f, layer) => level === 3 && layer.bindTooltip(String(f.properties?.name ?? ""), { sticky: true })}
          />
        ) : null,
      )}
    </>
  );
}

function FlyTo({ center, zoom }: { center: LatLngExpression | null; zoom: number }) {
  const map = useMap();
  const target = center ? JSON.stringify(center) : null;
  useEffect(() => {
    if (target) map.setView(JSON.parse(target), zoom);
  }, [map, target, zoom]);
  return null;
}

function priceColor(price: number, min: number, max: number): string {
  const t = max > min ? Math.min(1, Math.max(0, (price - min) / (max - min))) : 0.5;
  const hue = 120 - 120 * t; // green (cheap) to red (dear)
  return `hsl(${hue.toFixed(0)} 70% 42%)`;
}

const PopupTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="!m-0 text-sm font-semibold text-gray-900">{children}</p>
);
const PopupLine = ({ children }: { children: React.ReactNode }) => <p className="!m-0 !mt-0.5 text-xs text-gray-600">{children}</p>;

function FarmerMarker({ f, own }: { f: MapFarmer; own: boolean }) {
  const urgent = (f.priority ?? 0) >= 3;
  const color = own ? "#7a5af8" : urgent ? "#f04438" : (f.priority ?? 0) > 0 ? "#f79009" : "#7a5af8";
  return (
    <CircleMarker
      center={[f.latitude, f.longitude]}
      radius={own ? 10 : 8}
      pathOptions={{ color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95, dashArray: f.approximate ? "3 3" : undefined }}
    >
      <Popup>
        <PopupTitle>{own ? tr("map.farms.mine") : f.name}</PopupTitle>
        {f.kebele && <PopupLine>{tr("map.kebele", { kebele: f.kebele })}</PopupLine>}
        {f.woreda && <PopupLine>{f.woreda}</PopupLine>}
        {f.farms.map((x) => (
          <PopupLine key={x.field_name}>
            {x.field_name}: {x.crop_name ? trTerm("crop", x.crop_name) : "—"}
            {x.area_ha ? ` · ${x.area_ha} ha` : ""}
            {x.status ? ` · ${trTerm("status", x.status)}` : ""}
          </PopupLine>
        ))}
        {!!f.reasons?.length && (
          <PopupLine>
            <strong>{tr("map.farms.visit")}</strong> {f.reasons.map((r) => tr(`da.reason.${r}` as MessageKey)).join(", ")}
          </PopupLine>
        )}
        {f.phone && !own && (
          <PopupLine>
            <a href={`tel:${f.phone}`}>{f.phone}</a>
          </PopupLine>
        )}
        {f.approximate && <PopupLine>{tr("map.approxWoreda")}</PopupLine>}
      </Popup>
    </CircleMarker>
  );
}

function CountMarker({ w }: { w: MapFarmCount }) {
  return (
    <CircleMarker
      center={[w.latitude, w.longitude]}
      radius={BAND_RADIUS[w.band]}
      pathOptions={{ color: "#7a5af8", weight: 1.5, fillColor: "#7a5af8", fillOpacity: 0.35 }}
    >
      <Popup>
        <PopupTitle>{w.woreda}</PopupTitle>
        <PopupLine>{tr("map.farms.count", { farmers: w.farmers, farms: w.farms })}</PopupLine>
        {w.hectares != null && <PopupLine>{tr("map.farms.hectares", { ha: w.hectares })}</PopupLine>}
        <PopupLine>{tr("map.small")}</PopupLine>
      </Popup>
    </CircleMarker>
  );
}

function Layers({ data, on }: { data: MapLayers; on: Record<MapLayerName, boolean> }) {
  const { disease, markets, shops, farms, abcs } = data.layers;
  const diseaseKeys = useMemo(() => [...new Set((disease?.hotspots ?? []).map((h) => h.disease_key))], [disease]);
  return (
    <>
      {on.farms && farms?.mode === "counts" && farms.woredas.map((w) => <CountMarker key={w.pcode} w={w} />)}
      {on.farms && farms && farms.mode !== "counts" &&
        farms.farmers.map((f) => <FarmerMarker key={f.id} f={f} own={farms.mode === "own"} />)}

      {on.markets && markets &&
        markets.markets.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.latitude, m.longitude]}
            radius={m.price_etb ? 7 : 4}
            pathOptions={{
              color: m.price_etb ? "#fff" : "#98a2b3",
              weight: 1.5,
              fillColor: m.price_per_quintal && markets.price_min != null && markets.price_max != null
                ? priceColor(m.price_per_quintal, markets.price_min, markets.price_max)
                : "#d0d5dd",
              fillOpacity: m.price_etb ? 0.95 : 0.6,
              dashArray: m.approximate ? "2 2" : undefined,
            }}
          >
            <Popup>
              <PopupTitle>{m.name}</PopupTitle>
              <PopupLine>{trTerm("region", m.region)}</PopupLine>
              {m.price_etb ? (
                <PopupLine>
                  <strong>{trTerm("crop", markets.crop)}: {formatETB(m.price_etb, m.unit ?? "")}</strong>
                  {m.date && ` · ${formatFullDate(m.date)}`}
                </PopupLine>
              ) : (
                <PopupLine>{tr("map.markets.noPrice", { crop: trTerm("crop", markets.crop) })}</PopupLine>
              )}
              {m.approximate && <PopupLine>{tr("map.markets.approx")}</PopupLine>}
            </Popup>
          </CircleMarker>
        ))}

      {on.shops && shops?.counterfeits?.map((c) => (
        <CircleMarker
          key={`cf-${c.pcode}`}
          center={[c.latitude, c.longitude]}
          radius={Math.min(18, 6 + 2 * (c.warnings + c.fake_reports))}
          pathOptions={{ color: "#b42318", weight: 2, fillColor: "#f04438", fillOpacity: 0.25 }}
        >
          <Popup>
            <PopupTitle>{c.woreda}</PopupTitle>
            <PopupLine>{tr("map.shops.counterfeit", { warnings: c.warnings, fakes: c.fake_reports })}</PopupLine>
          </Popup>
        </CircleMarker>
      ))}
      {on.shops && shops?.shops.map((s) => (
        <CircleMarker
          key={`shop-${s.id}`}
          center={[s.latitude, s.longitude]}
          radius={7}
          pathOptions={{ color: s.verified ? "#12b76a" : "#fff", weight: s.verified ? 3 : 1.5, fillColor: "#2e90fa", fillOpacity: 0.95 }}
        >
          <Popup>
            <PopupTitle>{s.name}</PopupTitle>
            <PopupLine>
              {s.woreda}
              {s.verified && ` · ✓ ${tr("photo.shop.verified")}`}
            </PopupLine>
            {s.products.length ? (
              s.products.map((p) => (
                <PopupLine key={p.product_name}>
                  {p.product_name}
                  {p.price_etb != null
                    ? `: ${formatETB(p.price_etb)}${p.pack_size ? ` / ${p.pack_size}` : ""}${p.price_is_sample ? ` (${tr("photo.shop.samplePrice")})` : ""}`
                    : ""}
                </PopupLine>
              ))
            ) : (
              <PopupLine>{tr("map.shops.noStock")}</PopupLine>
            )}
            {s.phone && (
              <PopupLine>
                <a href={`tel:${s.phone}`}>{s.phone}</a>
              </PopupLine>
            )}
            <PopupLine>{tr("map.approxWoreda")}</PopupLine>
          </Popup>
        </CircleMarker>
      ))}

      {on.abcs && abcs?.abcs.map((a) => (
        <CircleMarker key={`abc-${a.org_id}`} center={[a.latitude, a.longitude]} radius={11}
          pathOptions={{ color: a.alerts.length ? "#f79009" : "#0e9384", weight: 3, fillColor: "#0e9384", fillOpacity: 0.85 }}>
          <Popup>
            <PopupTitle>{a.name}</PopupTitle>
            <PopupLine>{a.woreda ?? "—"} · {tr(`abc.status.${a.status}` as MessageKey)}</PopupLine>
            <PopupLine>{tr("pf.membersShort", { n: a.members })} · {tr("pf.capitalShort", { paid: formatETB(a.capital_paid_etb) })}</PopupLine>
            {!!a.alerts.length && <PopupLine>{a.alerts.map((x) => tr(`pf.alert.${x}` as MessageKey)).join(", ")}</PopupLine>}
          </Popup>
        </CircleMarker>
      ))}
      {on.disease && disease?.hotspots.map((h) => (
        <CircleMarker
          key={`${h.pcode}-${h.disease_key}`}
          center={[h.latitude, h.longitude]}
          radius={BAND_RADIUS[h.scans_band]}
          pathOptions={{
            color: DISEASE_COLORS[diseaseKeys.indexOf(h.disease_key) % DISEASE_COLORS.length],
            weight: 2,
            fillColor: DISEASE_COLORS[diseaseKeys.indexOf(h.disease_key) % DISEASE_COLORS.length],
            fillOpacity: 0.35,
          }}
        >
          <Popup>
            <PopupTitle>{h.disease}</PopupTitle>
            <PopupLine>{[h.woreda, h.zone].filter(Boolean).join(", ")}</PopupLine>
            <PopupLine>{tr("map.disease.scans", { n: h.scans, date: formatFullDate(h.latest) })}</PopupLine>
            <PopupLine>{tr("map.disease.note")}</PopupLine>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function Legend({ data, on }: { data: MapLayers; on: Record<MapLayerName, boolean> }) {
  const { disease, markets, farms } = data.layers;
  const diseases = [...new Map((disease?.hotspots ?? []).map((h) => [h.disease_key, h.disease])).entries()];
  return (
    <div className="space-y-3 text-theme-xs text-gray-600 dark:text-gray-400">
      {on.disease && !!diseases.length && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {diseases.map(([key, name], i) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full" style={{ background: DISEASE_COLORS[i % DISEASE_COLORS.length] }} /> {name}
            </span>
          ))}
        </div>
      )}
      {on.markets && markets?.price_min != null && (
        <div className="flex items-center gap-2">
          <span>{formatETB(markets.price_min)}</span>
          <span className="h-2 w-24 rounded" style={{ background: "linear-gradient(90deg, hsl(120 70% 42%), hsl(60 70% 42%), hsl(0 70% 42%))" }} />
          <span>{formatETB(markets.price_max, "Quintal")}</span>
          <span>· {tr("map.markets.legend")}</span>
        </div>
      )}
      {on.shops && data.layers.shops && (
        <p className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full border-2 border-success-500 bg-blue-light-500" /> {tr("map.shops.legend")}
        </p>
      )}
      {on.farms && farms && (
        <p>{farms.mode === "counts" ? tr("map.farms.legendCounts") : farms.mode === "farmers" ? tr("map.farms.legendDa") : tr("map.farms.legendOwn")}</p>
      )}
      <p>{tr("map.legend.dashed")}</p>
    </div>
  );
}

export default function MapPage() {
  const { lang } = useI18n();
  const [crop, setCrop] = useState("Wheat");
  const [days, setDays] = useState("30");
  const [on, setOn] = useState<Record<MapLayerName, boolean>>({ disease: true, markets: true, shops: true, farms: true, abcs: true });
  const crops = useAsync(() => api.mapCrops(), []);
  const data = useAsync(
    () => api.mapLayers({ layers: LAYER_ORDER.join(","), crop, days: Number(days), language: lang }),
    [crop, days, lang],
  );
  const available = data.data?.available ?? [];
  const scope = data.data?.scope;
  const own = data.data?.layers.farms;
  const ownPoint = own && own.mode === "own" && own.farmers[0];
  const center: LatLngExpression | null = ownPoint
    ? [ownPoint.latitude, ownPoint.longitude]
    : scope?.latitude != null && scope.longitude != null
      ? [scope.latitude, scope.longitude]
      : null;
  const zoom = ownPoint ? 9 : ZOOM_BY_LEVEL[scope?.level ?? 0] ?? 6;

  const counts: Partial<Record<MapLayerName, number>> = {
    disease: data.data?.layers.disease?.hotspots.length,
    markets: data.data?.layers.markets?.markets.filter((m) => m.price_etb).length,
    shops: data.data?.layers.shops?.shops.length,
    farms: own ? (own.mode === "counts" ? own.woredas.length : own.farmers.length) : undefined,
    abcs: data.data?.layers.abcs?.abcs.length,
  };

  return (
    <>
      <PageMeta title={`${tr("nav.map")} | ${tr("app.name")}`} description={tr("map.description")} />
      <PageHeader title={tr("nav.map")} description={tr("map.description")} />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="order-2 col-span-12 space-y-4 lg:order-1 lg:col-span-3">
          <Card title={tr("map.layers")}>
            <ul className="space-y-2">
              {LAYER_ORDER.filter((l) => available.includes(l)).map((l) => (
                <li key={l}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-500"
                      checked={on[l]}
                      onChange={(e) => setOn((s) => ({ ...s, [l]: e.target.checked }))}
                    />
                    <span className="size-2.5 rounded-full" style={{ background: LAYER_COLOR[l] }} />
                    <span className="flex-1">{tr(`map.layer.${l}` as MessageKey)}</span>
                    {counts[l] != null && <span className="text-theme-xs text-gray-400">{counts[l]}</span>}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3">
              {available.includes("markets") && (
                <div>
                  <Label htmlFor="map-crop">{tr("map.crop")}</Label>
                  <Select
                    id="map-crop"
                    value={crop}
                    onChange={setCrop}
                    options={(crops.data ?? ["Wheat"]).map((c) => ({ value: c, label: trTerm("crop", c) }))}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="map-days">{tr("map.period")}</Label>
                <Select
                  id="map-days"
                  value={days}
                  onChange={setDays}
                  options={[7, 30, 90].map((d) => ({ value: String(d), label: tr("map.lastDays", { n: d }) }))}
                />
              </div>
            </div>
          </Card>
          {data.data && (
            <Card title={tr("map.legend")}>
              <Legend data={data.data} on={on} />
            </Card>
          )}
          {scope?.names.length ? (
            <p className="text-theme-xs text-gray-500">{tr("map.scope", { area: scope.names.join(" › ") })}</p>
          ) : null}
        </div>
        <div className="order-1 col-span-12 lg:order-2 lg:col-span-9">
          {data.error ? (
            <ErrorState message={data.error} onRetry={data.reload} />
          ) : (
            <div className="relative h-[60vh] min-h-[360px] lg:h-[70vh] lg:min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
              <MapContainer center={ETHIOPIA} zoom={6} minZoom={5} maxZoom={16} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries &copy; OCHA (CC BY-IGO)'
                  maxZoom={19}
                />
                <Boundaries />
                <FlyTo center={center} zoom={zoom} />
                {data.data && <Layers data={data.data} on={on} />}
              </MapContainer>
              {data.loading && (
                <div className="absolute end-3 top-3 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-theme-xs text-gray-600 shadow">
                  {tr("common.loading")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
