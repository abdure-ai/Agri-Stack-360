// api/client.ts — Agri-Stack 360 API client.
//
// Three backend services, each overridable with a Vite env variable:
//   platform API  (port 8000)  VITE_API_URL
//   forecast API  (port 8001)  VITE_FORECAST_URL
//   data sync     (port 8002)  VITE_SYNC_URL

import type { LivestockImportResult, LivestockPrices, LivestockSummary } from "@/types/livestock";
import type {
  AdminArea,
  AiKey,
  AiKeyList,
  AiEngine,
  AiProvider,
  AdminStats,
  AdvisoryAlert,
  AdvisoryDiagnosis,
  AdvisoryLanguage,
  AlertCycleReport,
  AskResult,
  Conversation,
  DiagnosisOutcome,
  KnowledgeDocument,
  KnowledgeHit,
  KnowledgeUploadResult,
  AdminUser,
  AdminUserUpdate,
  ChatMessage,
  ChatResponse,
  CreditProfile,
  Diagnosis,
  AbcContribution,
  AbcInvitation,
  AbcOverview,
  AbcPlanning,
  AdvisorySetting,
  BuyRequest,
  AdvisoryTexts,
  Correction,
  ReviewCase,
  TranslationReviewRow,
  CodeBatch,
  NgoProject,
  CreditReport,
  DatasetImage,
  DailyTip,
  ReviewTip,
  TipInput,
  DatasetSummary,
  FarmerCreditRequest,
  LenderCreditRequest,
  CounterfeitMap,
  IssuanceRow,
  RegistryResponse,
  EstateBlock,
  EstateOverview,
  DealerCheck,
  DealerShop,
  OrgType,
  VerifiedShop,
  FakeReportInput,
  Organisation,
  RegistryProduct,
  SupplierDemand,
  SupplierReport,
  SupplyOutlook,
  TrustResult,
  AreaSummary,
  Hotspot,
  ReportScope,
  AuditEntry,
  ConsentState,
  ErasureRequest,
  MonitoringReport,
  CropCalendar,
  CropSeason,
  DaDisease,
  DaEscalation,
  DaFarmer,
  DaRegisterFarmer,
  DaVisit,
  EscalationStatus,
  SeasonInput,
  Farm,
  FarmInput,
  ForecastResponse,
  HealthReport,
  LoanProducts,
  MetaResponse,
  PermissionInfo,
  PricesResponse,
  RegionalResponse,
  RegisterRequest,
  Role,
  RoleInfo,
  SpreadResponse,
  StartSyncRequest,
  SummaryResponse,
  Supplier,
  SyncOverview,
  SyncRun,
  SyncRunDetail,
  SyncSchedule,
  SyncSettings,
  SyncStatusResponse,
  TokenResponse,
  User,
} from "@/types/api";

import { tr } from "@/i18n/core";

// By default the services are on the same machine that served the page, so the app also
// works from a phone on the same network (http://<pc-address>:5173).
const HOST = typeof window !== "undefined" ? window.location.hostname : "localhost";
const BASE = import.meta.env.VITE_API_URL ?? `http://${HOST}:8000/api`;
const FORECAST_BASE = import.meta.env.VITE_FORECAST_URL ?? `http://${HOST}:8001`;
const SYNC_BASE = import.meta.env.VITE_SYNC_URL ?? `http://${HOST}:8002/sync`;

export const TOKEN_KEY = "as360_token";
export const USER_KEY = "as360_user";

/** Fired when the platform rejects the stored token; AuthContext signs the user out. */
export const AUTH_EXPIRED_EVENT = "as360:auth-expired";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** True when the request never reached the server (service down, CORS, offline). */
export function isNetworkError(e: unknown): boolean {
  return !(e instanceof ApiError);
}

type Params = Record<string, string | number | boolean | null | undefined>;

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function withParams(url: string, params?: Params): string {
  if (!params) return url;
  const u = new URL(url, window.location.href);   // base URLs may be relative (/api) in the Docker build
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function detailMessage(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join("; ");
  return tr("error.requestFailed", { status });
}

async function request<T>(
  base: string,
  method: string,
  path: string,
  { params, body, form, auth = true }: { params?: Params; body?: unknown; form?: FormData; auth?: boolean } = {},
): Promise<T> {
  const res = await fetch(withParams(base + path, params), {
    method,
    headers: {
      // FormData sets its own multipart Content-Type (with the boundary).
      ...(body !== undefined && !form ? { "Content-Type": "application/json" } : {}),
      ...(auth ? authHeaders() : {}),
    },
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth && sessionStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(detailMessage(data, res.status), res.status);
  }
  return data as T;
}

/** GET returning binary data (e.g. a printable SVG label). */
async function getBlob(base: string, path: string, params?: Params): Promise<Blob> {
  const res = await fetch(withParams(base + path, params), { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && sessionStorage.getItem(TOKEN_KEY)) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new ApiError(detailMessage(data, res.status), res.status);
  }
  return res.blob();
}

/** POST returning binary data (audio). Errors carry the server's message like request(). */
async function requestBlob(base: string, path: string, body: unknown): Promise<Blob> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && sessionStorage.getItem(TOKEN_KEY)) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new ApiError(detailMessage(data, res.status), res.status);
  }
  return res.blob();
}

const platform = {
  get: <T>(path: string, params?: Params) => request<T>(BASE, "GET", path, { params }),
  post: <T>(path: string, body: unknown = {}) => request<T>(BASE, "POST", path, { body }),
  put: <T>(path: string, body: unknown = {}) => request<T>(BASE, "PUT", path, { body }),
  del: <T>(path: string) => request<T>(BASE, "DELETE", path),
  patch: <T>(path: string, body: unknown) => request<T>(BASE, "PATCH", path, { body }),
  upload: <T>(path: string, form: FormData) => request<T>(BASE, "POST", path, { form }),
};

function formOf(fields: Record<string, string | number | Blob | null | undefined>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === "") continue;
    f.append(k, v instanceof Blob ? v : String(v));
  }
  return f;
}

const sync = {
  get: <T>(path: string) => request<T>(SYNC_BASE, "GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>(SYNC_BASE, "POST", path, { body }),
  put: <T>(path: string, body: unknown) => request<T>(SYNC_BASE, "PUT", path, { body }),
};

export const api = {
  // ── Market price data ─────────────────────────────────────────────────────
  meta: () => platform.get<MetaResponse>("/meta"),
  prices: (params: Params) => platform.get<PricesResponse>("/prices", params),
  summary: (params: Params) => platform.get<SummaryResponse>("/summary", params),
  regional: (params: Params) => platform.get<RegionalResponse>("/regional", params),
  spread: (params: Params) => platform.get<SpreadResponse>("/spread", params),
  livestockSummary: () => platform.get<LivestockSummary>("/livestock/summary"),
  livestockPrices: (animal: string, region?: string | null) =>
    platform.get<LivestockPrices>("/livestock/prices", { animal, region: region || undefined }),
  livestockTemplate: () => getBlob(BASE, "/admin/livestock/template.csv"),
  livestockImport: (file: File) => platform.upload<LivestockImportResult>("/admin/livestock/import", formOf({ file })),
  livestockTrain: () => platform.post<{ trained: number; forecasts: number }>("/admin/livestock/train"),

  // ── Forecasts ─────────────────────────────────────────────────────────────
  forecastHealth: () => request<{ status: string }>(FORECAST_BASE, "GET", "/health", { auth: false }),
  forecast: (crop: string, region: string, weeks_ahead: number) =>
    request<ForecastResponse>(FORECAST_BASE, "GET", "/predict", {
      params: { crop, region, weeks_ahead },
      auth: false,
    }),

  // ── AI chat ───────────────────────────────────────────────────────────────
  chat: (message: string, history: ChatMessage[]) =>
    platform.post<ChatResponse>("/chat", { message, history }),

  // ── AI Advisory (cited answers from MoA guidelines) ───────────────────────
  advisoryAsk: (data: {
    question: string;
    language?: AdvisoryLanguage | null;
    conversation_id?: number | null;
    farmer_id?: number | null;
  }) => platform.post<AskResult>("/advisory/ask", { ...data, channel: "app" }),
  advisoryFeedback: (message_id: number, rating: "helpful" | "not_helpful", comment?: string) =>
    platform.post<{ message_id: number; rating: string }>("/advisory/feedback", { message_id, rating, comment }),
  /** WAV audio of the text, read in the given language (Gemini TTS or the local voice). */
  advisoryTts: (text: string, language: AdvisoryLanguage) => requestBlob(BASE, "/advisory/tts", { text, language }),
  /** Spoken question -> text (the recording is not stored). */
  advisoryStt: (audio: Blob, language: AdvisoryLanguage) =>
    platform.upload<{ text: string; language: string; engine: string; quality_verified: boolean }>(
      "/advisory/stt",
      formOf({ audio: new File([audio], "question.webm", { type: audio.type || "audio/webm" }), language }),
    ),
  advisoryConversation: (id: number) => platform.get<Conversation>(`/advisory/conversations/${id}`),

  // Photo diagnosis: the server adds the farm's altitude and past-week weather.
  advisoryDiagnose: (
    image: File,
    opts: { farm_id?: number | null; language?: AdvisoryLanguage | null; capture_source?: "camera" | "gallery" | null } = {},
  ) =>
    platform.upload<AdvisoryDiagnosis>("/advisory/diagnose", formOf({ image, ...opts })),
  diagnosisOutcome: (id: number, outcome: DiagnosisOutcome) =>
    platform.post<{ diagnosis_id: number; outcome: string; escalated: boolean }>(`/advisory/diagnoses/${id}/outcome`, {
      outcome,
    }),
  advisoryAlerts: (language?: AdvisoryLanguage | null) =>
    platform.get<AdvisoryAlert[]>("/advisory/alerts", { language }),
  markAlertRead: (id: number) => platform.post<{ id: number; status: string }>(`/advisory/alerts/${id}/read`),
  runAlertCycle: () => platform.post<AlertCycleReport>("/advisory/admin/run-alerts"),

  // ── Advisory administration ───────────────────────────────────────────────
  advisorySettings: () => platform.get<AdvisorySetting[]>("/admin/advisory-settings"),
  updateAdvisorySetting: (key: string, value: string | number | boolean) =>
    platform.put<AdvisorySetting>(`/admin/advisory-settings/${key}`, { value }),
  monitoring: (days: number) => platform.get<MonitoringReport>("/admin/monitoring", { days }),
  auditLog: (params: { action?: string; actor_id?: number; target_id?: string; before_id?: number; limit?: number } = {}) =>
    platform.get<AuditEntry[]>("/admin/audit-log", params),

  // ── Area reports (reports:read) ───────────────────────────────────────────
  reportScope: () => platform.get<ReportScope>("/reports/scope"),
  reportSummary: (days: number, area?: string | null, language?: string | null) =>
    platform.get<AreaSummary>("/reports/summary", { days, area, language }),
  reportOutbreaks: (days: number, opts: { area?: string | null; include_simulated?: boolean; language?: string | null } = {}) =>
    platform.get<{ days: number; hotspots: Hotspot[] }>("/reports/outbreaks", { days, ...opts }),

  // ── Input Trust ───────────────────────────────────────────────────────────
  trustVerify: (code: string) => platform.post<TrustResult>("/trust/verify", { code }),
  trustProducts: () => platform.get<RegistryProduct[]>("/trust/products"),
  trustFakeReport: (data: FakeReportInput) => platform.post<{ id: number; status: string }>("/trust/fake-reports", data),
  supplierOrg: (orgId?: number | null) =>
    platform.get<{ org: Organisation; catalogue: RegistryProduct[]; registry: RegistryProduct[] }>("/supplier/org", { org_id: orgId }),
  supplierAddProduct: (productId: number, orgId?: number | null) =>
    request<unknown>(BASE, "POST", `/supplier/catalogue/${productId}`, { params: { org_id: orgId }, body: {} }),
  supplierRemoveProduct: (productId: number, orgId?: number | null) =>
    request<unknown>(BASE, "DELETE", `/supplier/catalogue/${productId}`, { params: { org_id: orgId } }),
  supplierBatches: (orgId?: number | null) => platform.get<CodeBatch[]>("/supplier/batches", { org_id: orgId }),
  supplierCreateBatch: (
    data: { product_id: number; batch_number: string; units: number; manufactured_on?: string | null; expires_on?: string | null },
    orgId?: number | null,
  ) => request<CodeBatch>(BASE, "POST", "/supplier/batches", { params: { org_id: orgId }, body: data }),
  supplierRecall: (batchId: number, orgId?: number | null) =>
    request<unknown>(BASE, "POST", `/supplier/batches/${batchId}/recall`, { params: { org_id: orgId }, body: {} }),
  supplierLabel: (batchId: number, orgId?: number | null) => getBlob(BASE, `/supplier/batches/${batchId}/label.svg`, { org_id: orgId }),
  supplierDemand: (days: number, orgId?: number | null) => platform.get<SupplierDemand>("/supplier/demand", { days, org_id: orgId }),
  supplyOutlook: (crop?: string | null, area?: string | null) => platform.get<SupplyOutlook>("/reports/supply-outlook", { crop, area }),
  supplierReport: (days: number, orgId?: number | null) => platform.get<SupplierReport>("/supplier/report", { days, org_id: orgId }),
  adminOrgs: (type?: OrgType) => platform.get<Organisation[]>("/admin/orgs", { type }),
  adminCreateOrg: (name: string, note?: string, type: OrgType = "supplier") =>
    platform.post<Organisation>("/admin/orgs", { name, note: note || null, type }),
  adminUpdateOrg: (id: number, data: Partial<Pick<Organisation, "status" | "name" | "note">> & { verified?: boolean }) =>
    platform.patch<Organisation>(`/admin/orgs/${id}`, data),
  adminAddOrgMember: (id: number, phone: string, member_role: "owner" | "staff") =>
    platform.post<unknown>(`/admin/orgs/${id}/members`, { phone, member_role }),
  adminRemoveOrgMember: (id: number, userId: number) => platform.del<unknown>(`/admin/orgs/${id}/members/${userId}`),

  // ── Agronomist review (content:review) ────────────────────────────────────
  reviewQueue: (status = "forwarded") => platform.get<ReviewCase[]>("/review/escalations", { status }),
  reviewAnswer: (id: number, data: { text: string; kb_question?: string | null; kb_crop?: string | null }) =>
    platform.post<{ id: number; status: string; knowledge_document_id: number | null }>(`/review/escalations/${id}/answer`, data),
  reviewTableCsv: (table: "calendar" | "protocols" | "dosage") => getBlob(BASE, `/review/content/${table}.csv`),
  reviewUploadTable: (table: "calendar" | "protocols" | "dosage", file: File) =>
    platform.upload<{ loaded: number; placeholders: number }>(`/review/content/${table}`, formOf({ file })),
  reviewCorrections: () => platform.get<Correction[]>("/review/corrections"),
  reviewDiseases: (language?: string | null) => platform.get<{ key: string; name: string }[]>("/review/diseases", { language }),
  reviewImage: (diagnosisId: number) => getBlob(BASE, `/review/diagnoses/${diagnosisId}/image`),
  tipsToday: (language?: string | null) => platform.get<DailyTip[]>("/tips/today", { language }),
  tips: (days: number, language?: string | null) => platform.get<DailyTip[]>("/tips", { days, language }),
  reviewTips: (status?: "draft" | "approved" | "rejected") => platform.get<ReviewTip[]>("/review/tips", { status }),
  reviewDraftTips: (tip_date?: string | null, count?: number | null) =>
    platform.post<{ tip_date: string; created: number; tips: ReviewTip[] }>("/review/tips/draft", { tip_date: tip_date || null, count: count ?? null }),
  reviewCreateTip: (data: TipInput, publish = false) => platform.post<ReviewTip>("/review/tips", { ...data, publish }),
  reviewUpdateTip: (id: number, data: TipInput, publish = false) =>
    platform.put<ReviewTip>(`/review/tips/${id}`, { ...data, publish }),
  reviewDecideTip: (id: number, decision: "approve" | "reject", note?: string | null) =>
    platform.post<ReviewTip>(`/review/tips/${id}/${decision}`, { note: note ?? null }),
  datasetSummary: () => platform.get<DatasetSummary>("/review/dataset/summary"),
  datasetImages: (q: { status?: "included" | "excluded"; labelled?: boolean }) =>
    platform.get<DatasetImage[]>("/review/dataset/images", { status: q.status, labelled: q.labelled }),
  datasetImage: (id: number) => getBlob(BASE, `/review/dataset/images/${id}/file`),
  datasetSetStatus: (id: number, status: "included" | "excluded", reason: string | null) =>
    platform.post<{ id: number; status: string }>(`/review/dataset/images/${id}/status`, { status, reason }),
  datasetExport: (labelledOnly: boolean) => getBlob(BASE, "/review/dataset/export.zip", { labelled_only: labelledOnly }),
  reviewLabel: (diagnosisId: number, label: string) =>
    platform.post<{ diagnosis_id: number; label: string }>(`/review/corrections/${diagnosisId}/label`, { label }),
  reviewTrainingCsv: () => getBlob(BASE, "/review/training-labels.csv"),
  reviewAdvisoryTexts: () => platform.get<AdvisoryTexts>("/review/translations/advisory"),
  reviewTranslations: () => platform.get<TranslationReviewRow[]>("/review/translations/reviews"),
  reviewTranslation: (data: { source: "ui" | "advisory"; lang: "am" | "om" | "ti"; key: string; status: "approved" | "changes"; suggestion?: string | null }) =>
    platform.put<{ ok: boolean }>("/review/translations", data),
  reviewTranslationsCsv: () => getBlob(BASE, "/review/translations.csv"),

  // ── Agro-dealer shops ─────────────────────────────────────────────────────
  dealerShop: () => platform.get<DealerShop>("/dealer/shop"),
  dealerUpdateShop: (data: { area_pcode?: string | null; phone?: string | null; note?: string | null }) =>
    platform.put<Organisation>("/dealer/shop", data),
  dealerSetProduct: (productId: number, in_stock: boolean) => platform.put<unknown>(`/dealer/products/${productId}`, { in_stock }),
  dealerRemoveProduct: (productId: number) => platform.del<unknown>(`/dealer/products/${productId}`),
  dealerCheck: (code: string) => platform.post<TrustResult>("/dealer/check", { code }),
  dealerChecks: () => platform.get<DealerCheck[]>("/dealer/checks"),
  trustShops: (productId?: number | null) => platform.get<VerifiedShop[]>("/trust/shops", { product_id: productId }),

  // ── ABC (abc:manage) and buy requests (trade:request) ─────────────────────
  abcOverview: () => platform.get<AbcOverview>("/abc/overview"),
  abcInvite: (phone: string) => platform.post<{ farmer_id: number; status: string }>("/abc/members", { phone }),
  abcRemoveMember: (farmerId: number) => platform.del<unknown>(`/abc/members/${farmerId}`),
  abcContributions: () => platform.get<AbcContribution[]>("/abc/contributions"),
  abcAddContribution: (data: { farmer_id: number; kind: string; description?: string | null; quantity?: number | null; unit?: string | null }) =>
    platform.post<AbcContribution>("/abc/contributions", data),
  abcPlanning: () => platform.get<AbcPlanning>("/abc/planning"),
  abcBroadcast: (text: string) => platform.post<{ sent: number; suppressed: number; no_consent: number }>("/abc/broadcast", { text }),
  abcReportCsv: () => getBlob(BASE, "/abc/report.csv"),
  abcBuyRequests: () => platform.get<BuyRequest[]>("/abc/buy-requests"),
  abcRespond: (id: number, message: string, quantity_qt?: number | null) =>
    platform.post<unknown>(`/abc/buy-requests/${id}/respond`, { message, quantity_qt: quantity_qt ?? null }),
  creditRequests: () => platform.get<LenderCreditRequest[]>("/credit/requests"),
  createCreditRequest: (phone: string, purpose: string) =>
    platform.post<{ ok: boolean; message: string }>("/credit/requests", { phone, purpose }),
  creditReport: (id: number) => platform.get<CreditReport>(`/credit/requests/${id}/report`),
  myCreditRequests: () => platform.get<FarmerCreditRequest[]>("/users/credit-requests"),
  decideCreditRequest: (id: number, decision: "approve" | "decline" | "revoke") =>
    platform.post<{ status: string }>(`/users/credit-requests/${id}/${decision}`),
  myAbcInvitations: () => platform.get<AbcInvitation[]>("/users/abc-invitations"),
  decideAbcInvitation: (orgId: number, decision: "accept" | "decline" | "leave") =>
    platform.post<{ status: string }>(`/users/abc-invitations/${orgId}/${decision}`),
  myBuyRequests: () => platform.get<BuyRequest[]>("/trade/buy-requests"),
  createBuyRequest: (data: { crop: string; quantity_qt: number; region_pcode?: string | null; needed_by?: string | null; note?: string | null }) =>
    platform.post<BuyRequest>("/trade/buy-requests", data),
  closeBuyRequest: (id: number) => platform.post<unknown>(`/trade/buy-requests/${id}/close`),

  // ── Commercial farm (estate:manage) ───────────────────────────────────────
  estateOverview: () => platform.get<EstateOverview>("/estate/overview"),
  estateDiseases: (language?: string | null) => platform.get<DaDisease[]>("/estate/diseases", { language }),
  estateAddBlock: (data: Record<string, unknown>) => platform.post<EstateBlock>("/estate/blocks", data),
  estateUpdateBlock: (id: number, data: Record<string, unknown>) => platform.put<EstateBlock>(`/estate/blocks/${id}`, data),
  estateDeleteBlock: (id: number) => platform.del<unknown>(`/estate/blocks/${id}`),
  estateScout: (id: number, data: { disease_key?: string | null; severity: string; incidence_pct?: number | null; note?: string | null }) =>
    platform.post<unknown>(`/estate/blocks/${id}/scouting`, data),
  estateReportCsv: () => getBlob(BASE, "/estate/report.csv"),

  // ── Regulator (registry:manage) ───────────────────────────────────────────
  regulatorRegistry: () => platform.get<RegistryResponse>("/regulator/registry"),
  regulatorRegistryCsv: () => getBlob(BASE, "/regulator/registry.csv"),
  regulatorImport: (file: File) =>
    platform.upload<{ loaded: number; placeholders: number }>("/regulator/registry", formOf({ file })),
  regulatorCounterfeits: (days: number) => platform.get<CounterfeitMap>("/regulator/counterfeits", { days }),
  regulatorIssuance: () => platform.get<IssuanceRow[]>("/regulator/issuance"),

  // ── NGO projects (ngo:manage) ─────────────────────────────────────────────
  ngoProjects: () => platform.get<{ org: Organisation; projects: NgoProject[] }>("/ngo/projects"),
  ngoCreateProject: (data: { name: string; start_date: string; description?: string | null; end_date?: string | null }) =>
    platform.post<NgoProject>("/ngo/projects", data),
  ngoAddArea: (id: number, woreda_pcode: string) => platform.post<unknown>(`/ngo/projects/${id}/areas`, { woreda_pcode }),
  ngoRemoveArea: (id: number, woreda: string) => platform.del<unknown>(`/ngo/projects/${id}/areas/${woreda}`),
  ngoBroadcast: (id: number, text: string) =>
    platform.post<{ sent: number | string; farmers_in_area: number | string; not_sent: number | string }>(`/ngo/projects/${id}/broadcast`, { text }),
  ngoImpact: (id: number) => platform.get<{ project: NgoProject; areas: NgoProject["areas"]; summary: AreaSummary | null }>(`/ngo/projects/${id}/impact`),
  ngoImpactCsv: (id: number) => getBlob(BASE, `/ngo/projects/${id}/impact.csv`),

  // ── DA Copilot (da:work) ──────────────────────────────────────────────────
  daFarmers: (language?: string | null) => platform.get<DaFarmer[]>("/da/farmers", { language }),
  daPriorities: () => platform.get<DaVisit[]>("/da/priorities"),
  daEscalations: (status: EscalationStatus, language?: string | null) =>
    platform.get<DaEscalation[]>("/da/escalations", { status, language }),
  daAnswer: (id: number, text: string) => platform.post<{ id: number; status: string }>(`/da/escalations/${id}/answer`, { text }),
  daForward: (id: number, note?: string) =>
    platform.post<{ id: number; status: string }>(`/da/escalations/${id}/forward`, { note: note || null }),
  daClose: (id: number, note?: string) =>
    platform.post<{ id: number; status: string }>(`/da/escalations/${id}/close`, { note: note || null }),
  daVerify: (diagnosisId: number, disease_key: string) =>
    platform.post<{ id: number; verified_disease: string }>(`/da/diagnoses/${diagnosisId}/verify`, { disease_key }),
  daDiseases: (language?: string | null) => platform.get<DaDisease[]>("/da/diseases", { language }),
  daRegisterFarmer: (data: DaRegisterFarmer) => platform.post<{ id: number; name: string }>("/da/farmers", data),
  /** Admin: set a farmer's Development Agent (null removes it). */
  assignDa: (userId: number, da_id: number | null) =>
    platform.put<{ user_id: number; assigned_da_id: number | null }>(`/admin/users/${userId}/da`, { da_id }),

  // ── Knowledge base (admin) ────────────────────────────────────────────────
  knowledgeDocuments: () => platform.get<KnowledgeDocument[]>("/admin/knowledge"),
  knowledgeUpload: (data: {
    file: File;
    title: string;
    crops: string;
    language?: string;
    version_label?: string;
    source_url?: string;
  }) => platform.upload<KnowledgeUploadResult>("/admin/knowledge/upload", formOf(data)),
  knowledgeUpdate: (id: number, patch: Partial<Pick<KnowledgeDocument, "title" | "crops" | "language" | "version_label" | "source_url" | "status">>) =>
    platform.patch<KnowledgeDocument>(`/admin/knowledge/${id}`, patch),
  knowledgeReindex: () =>
    platform.post<{ embedded: number; remaining: number; warning: string | null }>("/admin/knowledge/reindex"),
  knowledgeSearch: (q: string, crop?: string) => platform.get<KnowledgeHit[]>("/admin/knowledge/search", { q, crop }),

  // ── AI API keys (admin) ──────────────────────────────────────────────────
  aiKeys: () => platform.get<AiKeyList>("/admin/ai-keys"),
  aiKeyAdd: (data: { provider: AiProvider; label: string; api_key: string; priority?: number }) =>
    platform.post<AiKey>("/admin/ai-keys", data),
  aiSetEngine: (llm_provider: AiProvider) =>
    platform.put<AiEngine & { warning: "no_key" | null }>("/admin/ai-keys/engine", { llm_provider }),
  aiKeyUpdate: (id: number, patch: Partial<Pick<AiKey, "label" | "enabled" | "priority">>) =>
    platform.patch<AiKey>(`/admin/ai-keys/${id}`, patch),
  aiKeyTest: (id: number) =>
    platform.post<{ ok: boolean; status: string; message: string | null; key: AiKey }>(`/admin/ai-keys/${id}/test`),
  aiKeyReset: (id: number) => platform.post<AiKey>(`/admin/ai-keys/${id}/reset`),
  aiKeyResetEnv: (provider: AiProvider = "gemini") =>
    platform.post<AiKeyList["env_key"]>(`/admin/ai-keys/env/reset?provider=${provider}`),
  aiKeyDelete: (id: number) => platform.del<unknown>(`/admin/ai-keys/${id}`),

  // ── Ethiopian administrative areas (public) ───────────────────────────────
  geoAreas: (parent?: string | null) =>
    request<AdminArea[]>(BASE, "GET", "/geo/areas", { params: { parent }, auth: false }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (data: { phone: string; password: string }) =>
    request<TokenResponse>(BASE, "POST", "/auth/login", { body: data, auth: false }),
  register: (data: RegisterRequest) =>
    request<TokenResponse>(BASE, "POST", "/auth/register", { body: data, auth: false }),
  /** Current user with fresh role and permissions. */
  me: () => platform.get<User>("/auth/me"),
  demoAccounts: () =>
    request<{ enabled: boolean; accounts: { role: string; phone: string; password: string; note?: string }[] }>(
      BASE, "GET", "/auth/demo-accounts", { auth: false }),

  // ── Profile & farms ───────────────────────────────────────────────────────
  /** `area_pcode` (woreda, zone or region) sets the address; the server fills the names. */
  updateProfile: (data: Partial<User> & { area_pcode?: string }) => platform.put<User>("/users/profile", data),
  getConsent: () => platform.get<ConsentState>("/users/consent"),
  updateConsent: (data: { data?: boolean; alerts?: boolean; training?: boolean }) => platform.put<ConsentState>("/users/consent", data),
  /** Everything stored about the signed-in person (data-subject access). */
  myData: () => platform.get<Record<string, unknown>>("/users/my-data"),
  myErasureRequest: () => platform.get<ErasureRequest | null>("/users/my-data/erase-request"),
  requestErasure: (reason: string) => platform.post<ErasureRequest>("/users/my-data/erase-request", { reason: reason || null }),
  cancelErasure: () => platform.post<{ status: string }>("/users/my-data/erase-request/cancel"),
  adminErasureRequests: (status = "pending") => platform.get<ErasureRequest[]>("/admin/erasure-requests", { status }),
  approveErasure: (id: number, note: string) => platform.post<ErasureRequest>(`/admin/erasure-requests/${id}/approve`, { note: note || null }),
  rejectErasure: (id: number, note: string) => platform.post<ErasureRequest>(`/admin/erasure-requests/${id}/reject`, { note: note || null }),
  getFarms: () => platform.get<Farm[]>("/users/farms"),
  getSeasons: (farmId: number) => platform.get<CropSeason[]>(`/users/farms/${farmId}/seasons`),
  addSeason: (farmId: number, data: SeasonInput) => platform.post<CropSeason>(`/users/farms/${farmId}/seasons`, data),
  updateSeason: (farmId: number, id: number, data: SeasonInput) =>
    platform.put<CropSeason>(`/users/farms/${farmId}/seasons/${id}`, data),
  deleteSeason: (farmId: number, id: number) => platform.del<unknown>(`/users/farms/${farmId}/seasons/${id}`),
  /** Crop calendar for each active season (own, or a farmer's for a DA). */
  cropCalendar: (farmerId?: number | null) => platform.get<CropCalendar[]>("/advisory/calendar", { farmer_id: farmerId }),
  addFarm: (data: FarmInput) => platform.post<Farm>("/users/farms", data),
  updateFarm: (id: number, data: FarmInput) => platform.put<Farm>(`/users/farms/${id}`, data),
  deleteFarm: (id: number) => platform.del<unknown>(`/users/farms/${id}`),

  // ── Crop health ───────────────────────────────────────────────────────────
  diagnose: (data: { farm_id: number; description: string; crop: string }) =>
    platform.post<Diagnosis>("/crop-health/diagnose", data),
  getHealthReports: (farm_id?: number) =>
    platform.get<HealthReport[]>("/crop-health/reports", farm_id ? { farm_id } : undefined),
  saveHealthReport: (data: Omit<Diagnosis, "farm_id"> & { farm_id: number }) =>
    platform.post<HealthReport>("/crop-health/reports", data),
  resolveReport: (id: number) => platform.put<unknown>(`/crop-health/reports/${id}/resolve`),

  // ── Input suppliers ───────────────────────────────────────────────────────
  getSuppliers: (params: Params = {}) => platform.get<Supplier[]>("/suppliers", params),
  compareSuppliers: (data: { supplier_ids: number[]; context: string | null }) =>
    platform.post<{ comparison: string }>("/suppliers/compare", data),

  // ── Financial ─────────────────────────────────────────────────────────────
  creditProfile: () => platform.get<CreditProfile>("/financial/profile"),
  loanProducts: () => platform.get<LoanProducts>("/financial/loan-products"),

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminStats: () => platform.get<AdminStats>("/admin/stats"),
  adminUsers: () => platform.get<AdminUser[]>("/admin/users"),
  setUserRole: (id: number, role: Role) => platform.put<unknown>(`/admin/users/${id}/role`, { role }),
  setUserActive: (id: number, is_active: boolean) =>
    platform.put<unknown>(`/admin/users/${id}/active`, { is_active }),
  setUserRegion: (id: number, region: string | null) =>
    platform.put<unknown>(`/admin/users/${id}/region`, { region }),
  adminUpdateUser: (id: number, patch: AdminUserUpdate) => platform.put<AdminUser>(`/admin/users/${id}`, patch),
  adminResetPassword: (id: number, new_password: string) =>
    platform.post<{ password_reset: boolean }>(`/admin/users/${id}/password`, { new_password }),
  adminRoles: () => platform.get<RoleInfo[]>("/admin/roles"),
  adminPermissions: () => platform.get<PermissionInfo[]>("/admin/permissions"),

  // ── Data sync (admin only) ────────────────────────────────────────────────
  syncStatus: () => sync.get<SyncStatusResponse>("/status"),
  syncOverview: () => sync.get<SyncOverview>("/overview"),
  syncRuns: (limit = 20) => sync.get<SyncRun[]>(`/runs?limit=${limit}`),
  syncRun: (id: number) => sync.get<SyncRunDetail>(`/runs/${id}`),
  syncRunLog: (id: number, tail = 200) => sync.get<{ lines: string[] }>(`/runs/${id}/log?tail=${tail}`),
  syncStart: (opts: StartSyncRequest) => sync.post<SyncRun>("/runs", opts),
  syncResume: (id: number) => sync.post<SyncRun>(`/runs/${id}/resume`),
  syncStop: () => sync.post<{ status: string }>("/stop"),
  saveSyncSchedule: (settings: Omit<SyncSettings, "last_scheduled_date">) =>
    sync.put<SyncSchedule>("/schedule", settings),
};
