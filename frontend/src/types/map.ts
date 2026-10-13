// Map layers (backend/routers/maps.py).

export type MapLayerName = "disease" | "markets" | "shops" | "farms";

export interface MapHotspot {
  pcode: string;
  woreda: string;
  zone: string | null;
  latitude: number;
  longitude: number;
  disease_key: string;
  disease: string;
  /** "<5" when fewer than 5 (small numbers hidden). */
  scans: number | string;
  scans_band: "low" | "medium" | "high";
  latest: string;
}

export interface MapMarket {
  id: number;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  /** Placed at the region's centre: the market name could not be matched to a woreda. */
  approximate: boolean;
  price_etb: number | null;
  unit: string | null;
  date: string | null;
  /** The same price per quintal (kg prices × 100), to compare markets on one colour scale. */
  price_per_quintal: number | null;
}

export interface MapShop {
  id: number;
  name: string;
  phone: string | null;
  verified: boolean;
  woreda: string;
  latitude: number;
  longitude: number;
  approximate: boolean;
  products: { product_name: string; price_etb: number | null; pack_size: string | null; price_is_sample: boolean }[];
}

export interface MapCounterfeit {
  pcode: string;
  woreda: string;
  latitude: number;
  longitude: number;
  warnings: number;
  fake_reports: number;
}

export interface MapFarm {
  field_name: string;
  crop_name: string | null;
  area_ha: number | null;
  irrigated: number | null;
  status: string | null;
}

export interface MapFarmer {
  id: number;
  name: string;
  phone?: string;
  kebele?: string | null;
  latitude: number;
  longitude: number;
  approximate: boolean;
  woreda: string | null;
  farms: MapFarm[];
  assigned_to_me?: boolean;
  priority?: number;
  reasons?: string[];
}

export interface MapFarmCount {
  pcode: string;
  woreda: string;
  latitude: number;
  longitude: number;
  farmers: number | string;
  farms: number | string;
  hectares: number | null;
  band: "low" | "medium" | "high";
}

export interface MapLayers {
  available: MapLayerName[];
  scope: { pcode: string | null; names: string[]; latitude: number | null; longitude: number | null; level: number };
  layers: {
    disease?: { days: number; area: string | null; hotspots: MapHotspot[] };
    markets?: { crop: string; markets: MapMarket[]; price_min: number | null; price_max: number | null; source: string };
    shops?: { shops: MapShop[]; counterfeits?: MapCounterfeit[] };
    farms?:
      | { mode: "own" | "farmers"; farmers: MapFarmer[] }
      | { mode: "counts"; woredas: MapFarmCount[] };
  };
}
