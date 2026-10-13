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
