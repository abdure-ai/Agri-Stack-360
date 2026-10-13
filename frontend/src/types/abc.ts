// ABC company core (backend/routers/abc_company.py), milestone A1.

export type AbcType = "crop_grain" | "horticulture" | "fruit" | "livestock" | "mixed";
export type AbcStatus = "formation" | "registered" | "suspended" | "dissolved";
export type AbcRole =
  | "organizing_committee"
  | "general_manager"
  | "chair"
  | "board_member"
  | "secretary"
  | "accountant"
  | "store_keeper"
  | "machinery_coordinator"
  | "agronomist"
  | "auditor";
export const ABC_ROLES: AbcRole[] = [
  "general_manager", "chair", "board_member", "secretary", "accountant", "store_keeper",
  "machinery_coordinator", "agronomist", "auditor", "organizing_committee",
];
export const ABC_TYPES: AbcType[] = ["crop_grain", "horticulture", "fruit", "livestock", "mixed"];

export interface AbcCompanyRef {
  org_id: number;
  name: string;
  org_status: string;
  roles: AbcRole[];
}

export interface AbcRule {
  id: number;
  key: string;
  value: number;
  unit: string | null;
  abc_type: string;
  effective_from: string;
  source: string;
  verification_status: "verified" | "PLACEHOLDER_VERIFY" | "platform_default";
  note?: string | null;
  created_by_name?: string | null;
  created_at?: string;
}

export interface AbcProfile {
  org_id: number;
  abc_type: AbcType;
  status: AbcStatus;
  kebele: string | null;
  fiscal_year_start: "hamle" | "meskerem" | "january";
  declared_capital_etb: number | null;
  board_approval_limit_etb: number | null;
  exit_refund_policy: string | null;
  updated_at: string | null;
}

export interface AbcTeamMember {
  user_id: number;
  name: string;
  phone: string;
  platform_role: string;
  role: AbcRole;
  since: string;
}

export interface AbcCompany {
  org: { id: number; name: string; status: string; woreda_pcode: string | null; phone: string | null; note: string | null };
  profile: AbcProfile;
  my_roles: AbcRole[];
  capabilities: string[];
  rules: AbcRule[];
  team: AbcTeamMember[];
  official_record_note: string;
}

export interface AbcHistoryEntry {
  id: number;
  created_at: string;
  action: string;
  actor: string | null;
  detail: { before: Record<string, unknown> | null; after: Record<string, unknown> | null } | null;
}

// ── Formation and registration (A2) ──────────────────────────────────────────

export type AbcDocKind =
  | "recognition" | "founding_agreement" | "business_plan" | "capital_deposit" | "registration_certificate"
  | "minutes" | "other";
export const ABC_DOC_KINDS: AbcDocKind[] = [
  "recognition", "founding_agreement", "business_plan", "capital_deposit", "registration_certificate", "minutes", "other",
];

export interface AbcDocument {
  id: number;
  kind: AbcDocKind;
  title: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  version: number;
  plan_years: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  latest?: boolean;
}

export interface AbcReadinessItem {
  key: "committee" | "recognition" | "members" | "paid_capital" | "declared_paid" | "board" | "business_plan"
    | "capital_deposit" | "agreement";
  ok: boolean;
  have: number | string | null;
  need: number | string | null;
  rules: { key: string; value: number; source: string; verification_status: string }[];
}

export interface AbcSignatureRow {
  id: number;
  name: string;
  phone: string;
  signature: { method: "app" | "scan"; signed_at: string; scan_doc_id: number | null } | null;
}

export interface AbcFormation {
  org_id: number;
  status: AbcStatus;
  readiness: { ready: boolean; items: AbcReadinessItem[]; status: AbcStatus };
  formation: {
    recognition_authority: string | null;
    recognized_on: string | null;
    recognition_doc_id: number | null;
    registration_authority: string | null;
    registration_number: string | null;
    registered_on: string | null;
    certificate_doc_id: number | null;
    override_reason: string | null;
  };
  signatures: { document: { id: number; version: number } | null; members: AbcSignatureRow[]; signed: number; total: number };
  documents: AbcDocument[];
  can_edit: boolean;
  is_admin: boolean;
  official_record_note: string;
}

export interface MyAbcMembership {
  org_id: number;
  name: string;
  status: AbcStatus;
  agreement: { version: number } | null;
  agreement_document_id: number | null;
  signed: { method: string; signed_at: string } | null;
}

// ── Member registry (A3) ─────────────────────────────────────────────────────

export type Gender = "female" | "male";
export type AgeGroup = "15-29" | "30-44" | "45-59" | "60+";
export type IdType = "fayda" | "kebele_id" | "other";

export interface AbcRegistryMember {
  farmer_id: number;
  name: string;
  phone: string;
  woreda: string | null;
  kebele: string | null;
  status: "invited" | "active";
  member_no: number | null;
  gender: Gender | null;
  age_group: AgeGroup | null;
  id_type: IdType | null;
  id_masked: string | null;
  consent_method: "app" | "spoken" | "paper" | null;
  consent_recorded_at: string | null;
  consent_recorded_by: string | null;
  plots: number;
  area_ha: number;
  irrigated_plots: number;
}

export interface AbcImportReport {
  rows: number;
  ok: number;
  new_accounts: number;
  already_members: number;
  dry_run: boolean;
  errors: { line: number; phone: string; problems: string[] }[];
}

export interface AbcInclusion {
  total: number;
  gender: Partial<Record<Gender, number>>;
  age_group: Partial<Record<AgeGroup, number>>;
  unknown_gender: number;
  unknown_age: number;
}

// ── Shares (A4) ──────────────────────────────────────────────────────────────

export type ShareFlag = "overdue" | "due_soon" | "minimum_unpaid" | "no_minimum" | "over_cap";
export type PayMethod = "cash" | "bank" | "telebirr" | "mpesa" | "other";

export interface AbcPledge {
  id: number;
  kind: "minimum" | "extra";
  shares: number;
  pledged_on: string;
  due_on: string | null;
  status: "open" | "paid";
  paid_etb: number;
  owed_etb: number;
  due_in_days?: number;
}

export interface AbcShareMember {
  id: number;
  name: string;
  phone: string;
  member_no: number | null;
  held: number;
  pledged: number;
  paid_etb: number;
  owed_etb: number;
  pledges: AbcPledge[];
  flags: ShareFlag[];
}

export interface AbcSharesOverview {
  share_value_etb: number | null;
  shares_offered: number | null;
  min_shares: number;
  cap_percent: number;
  cap_shares: number | null;
  upfront_percent: number;
  deadline_years: number;
  totals: { pledged_shares: number; issued_shares: number; paid_etb: number; owed_etb: number; subscribed_percent: number | null };
  members: AbcShareMember[];
  pending_approvals: number;
  can_edit: boolean;
  can_finance: boolean;
  can_approve: boolean;
  official_record_note: string;
}

export interface AbcSharePayment {
  id: number;
  receipt_no: string;
  farmer_id: number;
  name: string;
  amount_etb: number;
  method: PayMethod;
  reference: string | null;
  paid_on: string;
  status: "confirmed" | "reversed";
  reverse_reason: string | null;
  recorded_by: string | null;
}

export interface AbcCertificate {
  id: number;
  certificate_no: string;
  farmer_id: number;
  name: string;
  member_no: number | null;
  shares: number;
  reason: "issue" | "transfer_in";
  created_at: string;
}

export interface AbcApproval {
  id: number;
  kind: "share_transfer" | string;
  ref_id: number;
  summary: Record<string, string | number>;
  amount_etb: number | null;
  status: "pending" | "approved" | "rejected";
  requested_by_name: string | null;
  requested_at: string;
  decided_by_name: string | null;
  decided_at: string | null;
  note: string | null;
}

// ── Voting and meetings (A5) ─────────────────────────────────────────────────

export interface AbcWeights {
  season: string | null;
  land_factor: number;
  production_factor: number;
  land_only: boolean;
  equal_weights: boolean;
  total_land_ha: number;
  total_production_qt: number;
  members: { farmer_id: number; name: string; member_no: number | null; land_ha: number; production_qt: number; weight: number }[];
  seasons: string[];
  snapshots: { id: number; label: string; season: string | null; land_only: number; created_at: string }[];
  can_record: boolean;
  can_meet: boolean;
}

export interface AbcMeetingRow {
  id: number;
  kind: "general_assembly" | "board";
  title: string;
  scheduled_at: string;
  location: string | null;
  status: "scheduled" | "held" | "cancelled";
  notice_sent_at: string | null;
  minutes_status: "none" | "draft" | "approved";
}

export interface AbcQuorum {
  eligible: number;
  present: number;
  present_weight: number;
  total_weight: number;
  fraction: number;
  need: number;
  met: boolean;
}

export interface AbcTally {
  motion_id: number;
  weights: { yes: number; no: number; abstain: number };
  counts: { yes: number; no: number; abstain: number };
  pass_fraction: number;
  would_pass: boolean;
  quorum: AbcQuorum;
  status: "open" | "closed";
  result: "passed" | "failed" | "no_quorum" | null;
}

export interface AbcMeeting extends AbcMeetingRow {
  agenda: string[];
  snapshot_id: number | null;
  minutes: string | null;
  minutes_approved_by_name: string | null;
  minutes_approved_at: string | null;
  voters: { user_id: number; name: string; weight: number; present: boolean }[];
  quorum: AbcQuorum;
  motions: { id: number; title: string; text: string | null; status: "open" | "closed"; result: AbcTally["result"]; tally: AbcTally;
    votes: Record<string, { choice: "yes" | "no" | "abstain"; confirmed_at: string | null; disputed: number }> }[];
  can_meet: boolean;
  can_approve: boolean;
  official_record_note: string;
}

export interface MyAbcVote {
  id: number;
  choice: "yes" | "no" | "abstain";
  weight: number;
  entered_at: string;
  confirmed_at: string | null;
  disputed: number;
  motion: string;
  meeting: string;
  scheduled_at: string;
  org: string;
}

// ── Finance (A6) ─────────────────────────────────────────────────────────────

export interface AbcFinanceSummary {
  share_capital_etb: number;
  income_etb: number;
  expense_etb: number;
  assets_bought_etb: number;
  loans_received_etb: number;
  loans_repaid_etb: number;
  result_etb: number;
  cash_estimate_etb: number;
  members_owe_etb: number;
  pending_approval_etb: number;
  by_category: { kind: string; category: string; amount_etb: number }[];
  can_edit: boolean;
  approval_limit_etb: number | null;
  official_record_note: string;
}

export interface AbcLedgerEntry {
  id: number;
  entry_date: string;
  kind: "income" | "expense" | "asset" | "liability";
  category: string;
  description: string | null;
  amount_etb: number;
  direction: "in" | "out";
  method: string | null;
  reference: string | null;
  counterparty: string | null;
  source: string;
  status: "posted" | "pending" | "rejected" | "void";
  void_reason: string | null;
  recorded_by_name: string | null;
}

export interface AbcMemberAccount {
  farmer_id: number;
  name: string;
  phone: string;
  member_no: number | null;
  balance_etb: number;
  input_credit_etb: number;
  services_etb: number;
  repaid_etb: number;
  last_txn: string | null;
}

export interface AbcMemberTxn {
  id: number;
  txn_date: string;
  kind: "input_credit" | "service_charge" | "repayment" | "produce_deduction" | "adjustment";
  amount_etb: number;
  balance_effect: number;
  description: string | null;
  method: string | null;
  reference: string | null;
  receipt_no: string | null;
  source: string;
  status: "posted" | "void";
  void_reason: string | null;
  running_balance_etb: number;
  recorded_by_name: string | null;
}

export interface AbcStatement {
  farmer_id: number;
  name: string | null;
  transactions: AbcMemberTxn[];
  balance_etb: number;
  shares_held: number;
  org: string | null;
  official_record_note: string;
}
