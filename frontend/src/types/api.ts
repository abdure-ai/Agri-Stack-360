// Response and request shapes for the three backend services.
// Market data mirrors backend/models.py; the rest mirrors the routers' JSON.

export type Role =
  | "farmer"
  | "agent"
  | "agronomist"
  | "trader"
  | "government"
  | "supplier"
  | "agro_dealer"
  | "abc_manager"
  | "farm_manager"
  | "regulator"
  | "ngo_staff"
  | "lender"
  | "admin";
export type PriceLevel = "retail" | "wholesale" | "producer";

// ── Auth / users ────────────────────────────────────────────────────────────

/**
 * Permission names granted by the server (backend/permissions.py is the
 * source of truth; the server sends each user's list on login and /auth/me).
 */
export type Permission =
  | "market:read"
  | "advisory:use"
  | "profile:manage"
  | "farms:manage:own"
  | "farms:read:region"
  | "farms:manage:all"
  | "crop_health:use"
  | "inputs:read"
  | "financial:read"
  | "users:manage"
  | "platform:stats"
  | "sync:manage"
  | "models:retrain"
  | "knowledge:manage"
  | "advisory:admin"
  | "da:work"
  | "audit:read"
  | "reports:read"
  | "inputs:verify"
  | "supplier:manage"
  | "orgs:manage"
  | "content:review"
  | "dealer:manage"
  | "abc:manage"
  | "trade:request"
  | "estate:manage"
  | "registry:manage"
  | "ngo:manage"
  | "credit:request";

export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  language?: string | null;
  /** Official P-codes (eth_admin_boundaries); null when the address was typed by hand. */
  region_pcode?: string | null;
  zone_pcode?: string | null;
  woreda_pcode?: string | null;
  /** Missing only on sessions stored before RBAC; refreshed from /auth/me. */
  permissions?: Permission[];
}

export interface RoleInfo {
  role: Role;
  description: string;
  /** True when the role can be chosen on the public sign-up form. */
  self_register: boolean;
  user_count: number;
  active_count: number;
  permissions: Permission[];
}

export interface PermissionInfo {
  name: Permission;
  /** Group heading, e.g. "Farms & crop health". */
  area: string;
  label: string;
  description: string;
  roles: Role[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  password: string;
  role: Role;
  region?: string;
  zone?: string;
  /** Woreda (or zone/region) P-code; the server fills region/zone/woreda names from it. */
  area_pcode?: string;
  /** Interface language chosen before signing up. */
  language?: string;
  /** Extension agents may see my data (off unless ticked). */
  consent_data?: boolean;
  /** Send me alerts and reminders (off unless ticked). */
  consent_alerts?: boolean;
  /** Keep my crop photos to improve the disease check (off unless ticked). */
  consent_training?: boolean;
}

export interface ConsentEvent {
  kind: "data" | "alerts" | "training";
  granted: boolean;
  method: "self" | "da_verbal" | "admin";
  text_version: string;
  created_at: string;
  /** Name of the DA/admin who recorded it; null when the person did it themself. */
  recorded_by: string | null;
}

export interface ConsentState {
  data: boolean;
  alerts: boolean;
  /** Crop photos may be kept to improve the disease check (separate opt-in). */
  training: boolean;
  recorded_at: string | null;
  text_version: string;
  history: ConsentEvent[];
}

export type FarmStatus = "healthy" | "warning" | "critical";

export interface Farm {
  id: number;
  user_id?: number;
  /** Present on every listing; shown to agents and admins. */
  owner_name?: string | null;
  owner_region?: string | null;
  field_name: string;
  crop_name: string;
  variety?: string | null;
  area_ha?: number | null;
  planted_date?: string | null;
  status: FarmStatus;
  notes?: string | null;
}

export type FarmInput = Omit<Farm, "id" | "user_id" | "owner_name" | "owner_region">;

export type SeasonKind = "meher" | "belg" | "irrigated";
export type SeasonStatus = "active" | "harvested" | "failed";

/** What is planted on a farm, and when (drives the crop calendar). */
export interface CropSeason {
  id: number;
  farm_id: number;
  crop: string;
  variety: string | null;
  planting_date: string;
  season: SeasonKind;
  expected_harvest_date: string | null;
  status: SeasonStatus;
  created_at?: string;
}

export interface SeasonInput {
  crop: string;
  variety?: string | null;
  planting_date: string;
  season: SeasonKind;
  expected_harvest_date?: string | null;
  status?: SeasonStatus;
}

export interface CalendarTask {
  text: string;
  /** Manual and page the task comes from. */
  source: string | null;
}

export interface CalendarStage {
  stage_key: string;
  stage_name: string;
  day_start: number;
  day_end: number;
  status: "past" | "current" | "upcoming";
  start_date: string;
  end_date: string;
  start_display: string;
  end_display: string;
}

export interface CropCalendar {
  season_id: number;
  farm_id: number;
  field_name: string | null;
  crop: string;
  variety: string | null;
  season: SeasonKind;
  planting_date: string;
  planting_date_display: string;
  days_after_planting: number;
  altitude_m: number | null;
  calendar_known: boolean;
  /** Stage day ranges are estimates from the manuals, not verified dates. */
  timing_estimated: boolean;
  current_stage:
    | (Partial<CalendarStage> & { stage_key: string; stage_name: string | null; tasks: CalendarTask[] })
    | null;
  next_stage: { stage_key: string; stage_name: string; in_days: number; start_date: string } | null;
  stages: CalendarStage[];
}

// ── Market data (port 8000) ─────────────────────────────────────────────────

export interface CropMeta {
  id: number;
  name: string;
  min_date: string;
  max_date: string;
  record_count: number;
}

export interface VarietyItem {
  id: number;
  crop_id: number;
  name: string;
  unit: string;
}

export interface MarketItem {
  id: number;
  name: string;
  region: string;
}

export interface MetaResponse {
  crops: CropMeta[];
  regions: string[];
  varieties: Record<string, VarietyItem[]>;
  markets: Record<string, MarketItem[]>;
  price_level_coverage: Record<PriceLevel, number>;
}

export interface MarketFilters {
  crop: string;
  variety: string;
  region: string;
  markets: number[];
  price_level: PriceLevel;
  start_date: string;
  end_date: string;
}

export interface PricePoint {
  date: string;
  market_id?: number | null;
  market_name?: string | null;
  region?: string | null;
  price_avg?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  volume?: string | null;
}

export interface PricesResponse {
  unit: string;
  price_level: PriceLevel;
  crop: string;
  data_start: string;
  data: PricePoint[];
  row_count: number;
  aggregated: boolean;
}

export interface SummaryResponse {
  latest_price: number | null;
  latest_date: string | null;
  wow_change_pct: number | null;
  avg_4week: number | null;
  avg_all: number | null;
  price_min_period: number | null;
  price_max_period: number | null;
  volume_signal: string | null;
  obs_count: number;
  data_start: string;
  unit: string;
  price_level: PriceLevel;
}

export interface RegionalPoint {
  date: string;
  region: string;
  price_avg: number | null;
  price_min: number | null;
  price_max: number | null;
  market_count: number;
}

export interface RegionalResponse {
  unit: string;
  price_level: PriceLevel;
  crop: string;
  data: RegionalPoint[];
}

export interface SpreadPoint {
  date: string;
  retail_avg: number | null;
  producer_avg: number | null;
  spread: number | null;
  spread_pct: number | null;
  market_name?: string | null;
  region?: string | null;
}

export interface SpreadResponse {
  unit: string;
  crop: string;
  data: SpreadPoint[];
  producer_coverage_pct: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  error?: string | null;
}

// ── Forecasts (port 8001) ───────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low" | "very_low";

export interface ForecastPoint {
  step_week: number;
  forecast_date: string;
  price_median_etb: number;
  price_low_etb: number;
  price_high_etb: number;
  unit: string;
}

export interface ForecastResponse {
  crop: string;
  region: string;
  weeks_ahead: number;
  price_level: PriceLevel;
  model_used?: string;
  data_history_weeks: number;
  history_start: string;
  markets_reporting_count: number;
  confidence: Confidence;
  confidence_note: string;
  predictions: ForecastPoint[];
}

// ── Crop health ─────────────────────────────────────────────────────────────

export type Severity = "low" | "moderate" | "high" | "critical";

export interface Diagnosis {
  farm_id: number;
  disease: string;
  pathogen?: string | null;
  severity: Severity;
  confidence: number;
  visual_cues?: string[];
  recommended_action?: string | null;
  follow_up_date?: string | null;
  ai_explanation?: string | null;
}

export interface HealthReport {
  id: number;
  farm_id: number;
  disease: string;
  severity: Severity;
  recommended_action?: string | null;
  created_at?: string | null;
  resolved: number;
}

// ── Input suppliers ─────────────────────────────────────────────────────────

export interface SupplierProduct {
  name: string;
  brand?: string;
  unit?: string;
  price?: number;
  stock?: string;
}

export interface Supplier {
  id: number;
  name: string;
  region: string;
  zone?: string | null;
  phone?: string | null;
  rating?: number | null;
  distance_km?: number | null;
  products?: SupplierProduct[];
}

// ── Financial ───────────────────────────────────────────────────────────────

export interface ScoreFactor {
  /** Stable id for translation, e.g. "farm_records"; `value` fills the detail sentence. */
  code?: string;
  value?: string | number | null;
  label: string;
  points: string | number;
  detail?: string | null;
}

export interface CreditProfile {
  score: number;
  positive_factors?: ScoreFactor[];
  risk_factors?: ScoreFactor[];
  ai_explanation?: string | null;
}

export interface LoanProduct {
  id: number;
  product_name: string;
  lender: string;
  max_amount?: number | null;
  interest_rate: number;
  term_months?: number | null;
  monthly_payment?: number | null;
  match_status?: string;
  score_gap?: number;
}

export interface LoanProducts {
  matched?: LoanProduct[];
  ineligible?: LoanProduct[];
  /** True while lenders and products are seeded examples, not real offers. */
  demo_data?: boolean;
  demo_note?: string;
}

// ── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_farms: number;
  open_health_reports: number;
  resolved_health_reports: number;
  users_by_role?: Record<string, number>;
}

export interface AdminUser {
  id: number;
  name: string;
  phone: string;
  role: Role;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  language?: string | null;
  region_pcode?: string | null;
  zone_pcode?: string | null;
  woreda_pcode?: string | null;
  farm_count?: number | null;
  created_at?: string | null;
  last_login?: string | null;
  is_active: number;
  /** Farmers only: their Development Agent. */
  assigned_da_id?: number | null;
}

/** Fields an admin can change with PUT /admin/users/{id}; omitted fields stay. */
export interface AdminUserUpdate {
  name?: string;
  role?: Role;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  language?: string;
  is_active?: boolean;
  /** Woreda (or zone/region) P-code; sets region/zone/woreda together. */
  area_pcode?: string;
}

// ── Data sync (port 8002) ───────────────────────────────────────────────────

export type SyncScope = "active" | "all";
export type SyncStatus = "running" | "success" | "partial" | "failed" | "cancelled" | "interrupted";
export type RetrainStatus = "running" | "success" | "skipped" | "failed" | "cancelled";

export interface SyncRun {
  id: number;
  trigger: "manual" | "schedule";
  triggered_by: string | null;
  scope: SyncScope;
  refresh_catalog: number;
  export_csv: number;
  retrain: number;
  retrain_status: RetrainStatus | null;
  retrain_message: string | null;
  status: SyncStatus;
  started_at: string;
  finished_at: string | null;
  cutoff: string;
  resumed_from: number | null;
  pairs_total: number;
  pairs_done: number;
  pairs_failed: number;
  rows_added: number;
  fetch_seconds: number | null;
  latest_date_before: string | null;
  latest_date_after: string | null;
  error: string | null;
}

export interface FailedPair {
  market_id: number;
  market_name: string;
  region: string;
  variety_id: number;
  variety_name: string;
  fetched_at: string;
  error_msg: string | null;
}

export interface SyncRunDetail extends SyncRun {
  failed_pairs: FailedPair[];
}

export interface SyncProgress {
  run_id: number;
  scope: SyncScope;
  phase: "starting" | "catalog" | "prices" | "export" | "retrain";
  started_at: string;
  pairs_total: number;
  pairs_done: number;
  pairs_failed: number;
  rows_added: number;
  current: string | null;
  eta_seconds: number | null;
  stop_requested: boolean;
}

export interface SyncSettings {
  enabled: boolean;
  time: string;
  full_sync_weekday: number | null;
  refresh_catalog_on_full: boolean;
  export_csv: boolean;
  retrain_after_sync: boolean;
  rate: number;
  last_scheduled_date?: string | null;
}

export interface SyncSchedule extends SyncSettings {
  next_run: { at: string; scope: SyncScope } | null;
}

export interface SyncStatusResponse {
  server_time: string;
  running: SyncProgress | null;
  live_log: string[];
  last_run: SyncRun | null;
  schedule: SyncSchedule;
}

export interface ModelInfo {
  last_retrained_at?: string;
  latest_data_date?: string;
  total_observations?: number;
  series_count?: number;
}

export interface SyncOverview {
  database: {
    price_rows: number;
    latest_date: string | null;
    earliest_date: string | null;
    markets: number;
    crops: number;
    varieties: number;
    pairs: Record<SyncScope, number>;
  };
  seconds_per_pair: number;
  estimates_minutes: Record<SyncScope, number>;
  active_days: number;
  models: ModelInfo | null;
}

export interface StartSyncRequest {
  scope: SyncScope;
  refresh_catalog: boolean;
  export_csv: boolean;
  retrain: boolean;
}

// ── Administrative areas (eth_admin_boundaries) ─────────────────────────────

export interface AdminArea {
  pcode: string;
  name: string;
  level: "region" | "zone" | "woreda";
  parent_pcode: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ── AI Advisory (spec F3) ───────────────────────────────────────────────────

export type AdvisoryLanguage = "am" | "om" | "en" | "ti";
export type AnswerKind = "answer" | "dont_know" | "poisoning" | "person" | "product_refusal" | "unavailable";
export type AnswerConfidence = "high" | "medium" | "low";

export interface AdvisorySource {
  /** "S1".. for guideline passages, "M" market data, "C" the farmer's own context. */
  ref: string;
  citation: string;
  section?: string | null;
  chunk_id?: number;
  document_id?: number;
  source_url?: string | null;
}

export interface AskResult {
  message_id: number;
  conversation_id: number;
  kind: AnswerKind;
  language: string;
  answer: string;
  sources: AdvisorySource[];
  confidence: AnswerConfidence;
  escalated: boolean;
  escalation_reason: string | null;
  guardrail_flags: string[];
}

export interface ConversationMessage {
  id: number;
  question: string;
  language: string;
  answer: string;
  sources: AdvisorySource[];
  confidence: number | null;
  guardrail_flags: string[];
  escalated: number;
  feedback: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  messages: ConversationMessage[];
}

// ── Photo diagnosis -> treatment plan (spec F5) ─────────────────────────────

export interface ModelPrediction {
  label: string;
  disease: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface EcologicalInput {
  altitude_m: number;
  temperature_C: number;
  humidity_pct: number;
  precipitation_mm_per_week: number;
}

/** A farm condition outside the range the disease model was trained on. */
export interface OutOfRange {
  feature: keyof EcologicalInput;
  value: number;
  training_min: number;
  training_max: number;
}

export interface ProductCard {
  product_id: number;
  product_name: string;
  active_ingredient: string;
  registration_number: string | null;
  dose_per_ha: string | null;
  dose_per_knapsack: string | null;
  water_volume_l_per_ha: string | null;
  max_applications: number | null;
  interval_days: number | null;
  pre_harvest_interval_days: number | null;
  re_entry_hours: number | null;
  rain_free_hours: number | null;
  ppe_required: string[];
  source: string | null;
  verified: boolean;
}

export interface InputOffer {
  product_id: number;
  product_name: string;
  supplier: string;
  distance_km: number | null;
  price_etb: number | null;
  unit: string | null;
  in_stock: boolean | null;
  sponsored: boolean;
}

export interface TreatmentPlan {
  disease_key: string;
  disease_name: string;
  pathogen: string | null;
  cultural_practices: string[];
  scouting_advice: string | null;
  recommended_active_ingredients: string[];
  products: ProductCard[];
  offers: InputOffer[];
  weather_advice: string | null;
  safety: string;
  sources: string[];
  verified: boolean;
  warnings: string[];
}

export type DiagnosisKind = "disease" | "healthy" | "uncertain" | "invalid_photo";

export interface AdvisoryDiagnosis {
  diagnosis_id: number;
  kind: DiagnosisKind;
  language: string;
  disease_key: string | null;
  disease: string | null;
  confidence: number;
  mode: "photo_only" | "photo_and_conditions" | string;
  reason: string | null;
  notes: string[];
  general_advice: string[];
  plan: TreatmentPlan | null;
  follow_up_date: string | null;
  escalated: boolean;
  model: {
    version: string | null;
    photo_only: ModelPrediction | null;
    with_conditions: ModelPrediction | null;
    ecological_input: EcologicalInput | null;
    out_of_range: OutOfRange[];
  };
}

export type DiagnosisOutcome = "improved" | "same" | "worse";

// ── Alerts (spec F7 / F5 follow-ups) ────────────────────────────────────────

export interface AdvisoryAlert {
  id: number;
  type: "neighborhood_disease" | "follow_up" | string;
  severity: string | null;
  status: string;
  created_at: string;
  scheduled_for: string | null;
  payload: Record<string, unknown>;
  message: string;
}

// ── DA Copilot ──────────────────────────────────────────────────────────────

export interface DaCrop {
  crop: string;
  season: string;
  planting_date: string;
  days_after_planting: number;
  stage_key: string | null;
  stage_name: string | null;
  next_stage_name: string | null;
  days_to_next_stage: number | null;
}

export interface DaFarmer {
  id: number;
  name: string;
  phone: string;
  language: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
  assigned_to_me: boolean;
  consent_alerts: number | null;
  crops: DaCrop[];
  latest_diagnosis: {
    id: number;
    disease_key: string | null;
    disease: string | null;
    confidence: number;
    verified_disease: string | null;
    outcome: string;
    created_at: string;
  } | null;
  open_escalations: number;
  overdue_follow_ups: number;
}

export type PriorityReason = "worse" | "uncertain_diagnosis" | "overdue_follow_up" | "outbreak_nearby" | "open_question";

export interface DaVisit {
  farmer: { id: number; name: string; phone: string; woreda: string | null; kebele: string | null };
  score: number;
  oldest: string;
  reasons: { reason: PriorityReason; weight: number; since: string; ref_id: number | null }[];
}

export type EscalationStatus = "open" | "answered" | "forwarded" | "closed";

export interface DaEscalation {
  id: number;
  reason: "low_confidence" | "no_knowledge" | "guardrail_block" | "advice_failed" | "asked_for_person";
  status: EscalationStatus;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  assigned_to: number | null;
  message_id: number | null;
  diagnosis_id: number | null;
  farmer_id: number;
  farmer_name: string;
  farmer_phone: string;
  farmer_woreda: string | null;
  question: string | null;
  answer: string | null;
  question_language: string | null;
  disease_key: string | null;
  disease_name: string | null;
  confidence: number | null;
  verified_disease: string | null;
  verified_disease_name: string | null;
  outcome: string | null;
  diagnosed_at: string | null;
}

export interface DaDisease {
  key: string;
  name: string;
  is_disease: boolean;
}

export interface DaRegisterFarmer {
  name: string;
  phone: string;
  pin: string;
  area_pcode: string;
  language: string;
  kebele?: string | null;
  consent_data: boolean;
  consent_alerts: boolean;
  consent_training?: boolean;
}

// ── Advisory administration (M4) ────────────────────────────────────────────

export interface AdvisorySetting {
  key: string;
  value: string;
  description: string | null;
  type: "float" | "int" | "bool" | "text";
  min: number | null;
  max: number | null;
  default: string | null;
}

export interface MonitoringReport {
  days: number;
  questions: {
    total: number;
    by_language: Record<string, number>;
    by_confidence: Record<string, number>;
    escalated: number;
    escalation_rate: number | null;
    guardrail_flags: Record<string, number>;
    feedback: Record<string, number>;
  };
  diagnoses: {
    total: number;
    by_disease: Record<string, number>;
    outcomes: Record<string, number>;
    verified: number;
    verified_agreement: number | null;
  };
  escalations: {
    total: number;
    by_reason: Record<string, number>;
    by_status: Record<string, number>;
    median_hours_to_resolve: number | null;
  };
  alerts: { by_type: Record<string, number>; by_status: Record<string, number> };
  consent: { farmers: number; data: number; alerts: number };
  daily: { day: string; questions: number; diagnoses: number }[];
}

export interface AuditEntry {
  id: number;
  actor_id: number | null;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  status: number | null;
  detail: string | null;
  created_at: string;
}

// ── Area reports (M5) ───────────────────────────────────────────────────────

/** A count, or "<5" when 1-4 (small numbers are hidden so no farmer can be singled out). */
export type ReportCount = number | "<5";

export interface ReportFigures {
  farmers: ReportCount;
  farmers_reached: ReportCount;
  questions: ReportCount;
  photo_checks: ReportCount;
  by_disease: Record<string, ReportCount>;
  outcome_improved: ReportCount;
  outcome_same: ReportCount;
  outcome_worse: ReportCount;
  outbreak_alerts: ReportCount;
  escalations: ReportCount;
}

export interface ReportWoreda extends ReportFigures {
  pcode: string;
  woreda: string;
  zone: string | null;
  region: string | null;
}

export interface AreaSummary {
  area: string | null;
  days: number;
  since: string;
  suppress_below: number;
  totals: ReportFigures;
  woredas: ReportWoreda[];
  disease_names: Record<string, string>;
}

export interface Hotspot {
  pcode: string;
  woreda: string;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
  disease_key: string;
  disease: string;
  scans: ReportCount;
  scans_band: "low" | "medium" | "high";
  includes_simulated: boolean;
  latest: string;
}

export interface ReportScope {
  area: string | null;
  names: string[];
  level: "country" | "region" | "zone" | "woreda";
}

// ── Input Trust (M6) ────────────────────────────────────────────────────────

export type TrustReason =
  | "ok"
  | "unknown_code"
  | "recalled"
  | "supplier_suspended"
  | "not_registered"
  | "expired"
  | "possible_copy";

export interface TrustResult {
  code: string;
  result: "genuine" | "warning";
  reason: TrustReason;
  product_name?: string;
  active_ingredient?: string | null;
  formulation?: string | null;
  registration_number?: string | null;
  verification_status?: string | null;
  org_name?: string;
  batch_number?: string;
  expires_on?: string | null;
  manufactured_on?: string | null;
  /** Product data not yet checked against the official registered list. */
  placeholder?: boolean;
  product_id?: number;
}

export interface VerifiedShop {
  id: number;
  name: string;
  phone: string | null;
  woreda: string | null;
  zone: string | null;
  verified_at: string | null;
}

export interface DealerShop {
  org: Organisation & { area: string[] };
  products: (RegistryProduct & { in_stock: number; updated_at: string | null })[];
  registry: RegistryProduct[];
}

export interface DealerCheck {
  id: number;
  created_at: string;
  code: string | null;
  result: "genuine" | "warning" | null;
  reason: string | null;
  product_name: string | null;
  batch_number: string | null;
}

export interface RegistryProduct {
  id: number;
  product_name: string;
  active_ingredient: string | null;
  formulation?: string | null;
  registration_number: string | null;
  category: string | null;
  status?: string;
  verification_status: string | null;
}

export interface FakeReportInput {
  code?: string | null;
  product_id?: number | null;
  product_text?: string | null;
  shop_text?: string | null;
  note?: string | null;
}

export type OrgType = "supplier" | "agro_dealer" | "abc" | "commercial_farm" | "ngo";

export interface Organisation {
  id: number;
  name: string;
  type: OrgType;
  status: "active" | "suspended";
  note: string | null;
  created_at: string;
  woreda_pcode?: string | null;
  woreda?: string | null;
  phone?: string | null;
  /** Verified-seller badge (agro-dealers). */
  verified?: number;
  verified_at?: string | null;
  members?: number;
  batches?: number;
  member_list?: { id: number; name: string; phone: string; role: Role; member_role: "owner" | "staff" }[];
}

export interface CodeBatch {
  id: number;
  org_id: number;
  product_id: number;
  product_name: string;
  batch_number: string;
  units: number;
  manufactured_on: string | null;
  expires_on: string | null;
  code: string;
  status: "active" | "recalled";
  created_at: string;
  checks: number;
  warnings: number;
}

export interface SupplierReport {
  days: number;
  checks: number;
  warnings: number;
  by_reason: Partial<Record<TrustReason, number>>;
  by_woreda: {
    pcode: string;
    woreda: string;
    zone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    checks: number;
    warnings: number;
  }[];
  batches: Record<string, { checks: number; warnings: number; woredas: number }>;
  fake_reports: {
    id: number;
    code: string | null;
    product_name: string;
    product_text: string | null;
    shop_text: string | null;
    note: string | null;
    woreda: string | null;
    status: string;
    created_at: string;
  }[];
}

// ── Agronomist review (M9) ──────────────────────────────────────────────────

export interface ReviewCase {
  id: number;
  reason: string;
  status: string;
  note: string | null;
  created_at: string;
  farmer_woreda: string | null;
  question: string | null;
  answer: string | null;
  question_language: string | null;
  disease_key: string | null;
  verified_disease: string | null;
}

export interface Correction {
  id: number;
  model_disease: string | null;
  da_disease: string;
  confidence: number;
  created_at: string;
  has_image: number;
  label: string | null;
  labelled_at: string | null;
}

export interface TranslationReviewRow {
  source: "ui" | "advisory";
  lang: "am" | "om" | "ti";
  key: string;
  status: "approved" | "changes";
  suggestion: string | null;
  reviewer: string | null;
  updated_at: string;
}

export type AdvisoryTexts = Record<"en" | "am" | "om" | "ti", { texts: Record<string, string>; status: string | null; draft_keys: string[] }>;

export interface SupplierDemand {
  days: number;
  diseases: string[];
  crops: string[];
  zones: {
    pcode: string;
    zone: string;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    photo_checks: Record<string, ReportCount>;
    photo_checks_total: ReportCount;
    farms_growing: ReportCount;
    /** null when fewer than 5 farms make up the total. */
    area_ha: number | null;
  }[];
}

export interface SupplyOutlook {
  rows: {
    pcode: string;
    zone: string;
    region: string | null;
    crop: string;
    farms: ReportCount;
    area_ha: number | null;
    harvest_months: Record<string, ReportCount>;
    harvest_estimated: boolean;
  }[];
  suppress_below: number;
}

// ── ABC + buy requests (M12) ────────────────────────────────────────────────

export interface AbcOverview {
  org: Organisation;
  members: { id: number; name: string; phone: string; woreda: string | null; joined_at: string | null }[];
  invited: { id: number; name: string; phone: string; invited_at: string }[];
  contributions: { kind: "land" | "livestock" | "labour"; n: number; quantity: number; unit: string | null }[];
  crops: { crop: string; farms: number; area_ha: number }[];
  contributions_note: string;
}

export interface AbcContribution {
  id: number;
  farmer_id: number;
  farmer_name: string;
  kind: "land" | "livestock" | "labour";
  description: string | null;
  quantity: number | null;
  unit: string | null;
  created_at: string;
}

export interface AbcPlanning {
  by_stage: { crop: string; stage_key: string; farms: number; area_ha: number }[];
  upcoming: { crop: string; stage_key: string; farms: number; area_ha: number; first_date: string | null }[];
  harvest: { crop: string; month: string; farms: number; area_ha: number }[];
  quantities_note: string;
}

export interface AbcInvitation {
  org_id: number;
  name: string;
  status: "invited" | "active";
  invited_at: string;
  joined_at: string | null;
}

export interface BuyRequest {
  id: number;
  crop: string;
  quantity_qt: number;
  region: string | null;
  region_pcode?: string | null;
  needed_by: string | null;
  note: string | null;
  status?: "open" | "closed";
  created_at: string;
  responded?: number;
  responses?: { quantity_qt: number | null; message: string; created_at: string; abc: string; phone: string | null }[];
}

// ── Commercial farm (M13) ───────────────────────────────────────────────────

export interface EstateBlock {
  id: number;
  name: string;
  area_ha: number;
  crop: string;
  variety: string | null;
  season: SeasonKind;
  planting_date: string | null;
  expected_harvest_date: string | null;
  woreda_pcode: string | null;
  woreda: string | null;
  status: "active" | "harvested" | "fallow";
  stage_key: string | null;
  days_after_planting: number | null;
  next_stage: { stage_key: string; in_days: number; start_date: string } | null;
  expected_harvest: string | null;
  harvest_estimated: boolean;
  last_scouting: { disease_key: string | null; severity: string; incidence_pct: number | null; created_at: string } | null;
  nearby: { disease_key: string; disease: string; farms: number; nearest_km: number }[];
}

export interface EstateOverview {
  org: Organisation;
  blocks: EstateBlock[];
  alerts: { block_id: number; block: string; kind: "scouting" | "nearby"; disease_key: string | null; disease?: string;
    severity?: string; farms?: number; nearest_km?: number; date?: string }[];
  team: { id: number; name: string; phone: string; member_role: string }[];
  totals: { blocks: number; area_ha: number };
}

export interface RegistryResponse {
  summary: { total: number; registered: number; banned: number; expired: number; placeholder: number };
  products: (RegistryProduct & { formulation: string | null; status: string })[];
}

export interface CounterfeitMap {
  days: number;
  woredas: {
    pcode: string;
    woreda: string | null;
    zone: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    warnings: number;
    by_reason: Record<string, number>;
    fake_reports: number;
  }[];
  totals: { warnings: number; fake_reports: number };
}

export interface IssuanceRow {
  id: number;
  name: string;
  status: string;
  batches: number;
  units: number;
  recalled: number | null;
  checks: number;
  warnings: number;
  products: number;
}

export interface NgoProject {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "closed";
  areas: { woreda_pcode: string; woreda: string | null; zone: string | null }[];
}

export interface TipSource {
  ref: string;
  citation: string;
  document_id: number | null;
}

/** An approved tip in one language (GET /tips/today, /tips). */
export interface DailyTip {
  id: number;
  tip_date: string;
  crop: string | null;
  region_pcode: string | null;
  title: string;
  body: string;
  sources: TipSource[];
  /** Language shown; "en" when no translation exists for the requested one. */
  language: string;
  translated: boolean;
  origin: "ai" | "calendar" | "expert";
}

export interface TipInput {
  tip_date: string;
  title: Partial<Record<"en" | "am" | "om" | "ti", string>>;
  body: Partial<Record<"en" | "am" | "om" | "ti", string>>;
  audience: string[];
  region_pcode: string | null;
  crop: string | null;
}

export interface ReviewTip extends TipInput {
  id: number;
  sources: TipSource[];
  topic: string | null;
  origin: "ai" | "calendar" | "expert";
  status: "draft" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
}

export interface DatasetImage {
  id: number;
  diagnosis_id: number | null;
  file: string;
  width: number | null;
  height: number | null;
  capture_source: "camera" | "gallery" | "telegram" | "unknown";
  crop: string | null;
  woreda_pcode: string | null;
  model_version: string | null;
  model_label: string | null;
  model_confidence: number | null;
  status: "included" | "excluded";
  excluded_reason: string | null;
  created_at: string;
  /** Agronomist label, else DA verification; null = not labelled yet. */
  label: string | null;
  label_source: "agronomist" | "da" | null;
  reviewed_label: string | null;
}

export interface DatasetSummary {
  total: number;
  included: number;
  excluded: number;
  labelled: number;
  by_label: Record<string, number>;
  by_model_label: Record<string, number>;
  by_source: Record<string, number>;
  farmers_consenting: number;
}

export type CreditRequestStatus = "not_shared" | "pending" | "declined" | "approved" | "expired" | "revoked";

export interface LenderCreditRequest {
  id: number;
  phone: string;
  purpose: string;
  status: CreditRequestStatus;
  requested_at: string;
  decided_at: string | null;
  expires_at: string | null;
  farmer_name: string | null;
}

export interface FarmerCreditRequest {
  id: number;
  lender: string;
  purpose: string;
  status: CreditRequestStatus;
  requested_at: string;
  expires_at: string | null;
}

export interface CreditReport {
  request_id: number;
  valid_until: string;
  purpose: string;
  farmer: { name: string; phone: string; region: string | null; zone: string | null; woreda: string | null };
  score: number;
  positive_factors: ScoreFactor[];
  risk_factors: ScoreFactor[];
  farms: { count: number; area_ha: number; crops: string[] };
  active_seasons: { crop: string; season: string; planting_date: string; expected_harvest_date: string | null }[];
  method: string;
}

export interface ErasureRequest {
  id: number;
  user_id?: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string | null;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  name?: string;
  phone?: string;
  role?: string;
  woreda?: string | null;
  decided_by_name?: string | null;
  summary?: string | null;
}

export interface AlertCycleReport {
  outbreak_alerts: number;
  suppressed: number;
  follow_ups_due: number;
  skipped_no_consent: number;
  details: string[];
}

// ── Knowledge base admin ────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: number;
  title: string;
  crops: string[];
  topics: string[];
  language: string | null;
  version_label: string | null;
  source_url: string | null;
  status: "active" | "archived";
  page_count: number | null;
  file_path?: string | null;
  created_at: string;
  chunk_count: number;
  embedded_count: number | null;
}

export interface KnowledgeUploadResult {
  document: KnowledgeDocument;
  pages: number;
  chunks: number;
  embedded: number;
  pages_needing_ocr: number[];
  warning: string | null;
}

export interface KnowledgeHit {
  citation: string;
  section: string | null;
  topic: string | null;
  language: string | null;
  score: number;
  keyword_rank: number | null;
  vector_rank: number | null;
  text: string;
}

// ── AI API keys (admin) ─────────────────────────────────────────────────────

export type AiKeyStatus = "unknown" | "ok" | "quota" | "rate_limited" | "invalid" | "error";

export interface AiKey {
  id: number;
  label: string;
  key_last4: string;
  priority: number;
  enabled: boolean;
  status: AiKeyStatus;
  cooldown_until: string | null;
  last_error: string | null;
  last_used_at: string | null;
  uses_today: number;
  created_at: string;
}

export interface AiKeyList {
  keys: AiKey[];
  env_key: { configured: boolean; key_last4?: string; status?: AiKeyStatus; cooldown_until?: string | null; last_error?: string | null };
  usable_now: number;
  next_available_at: string | null;
  model: string;
}
