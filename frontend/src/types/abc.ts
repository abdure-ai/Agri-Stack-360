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
