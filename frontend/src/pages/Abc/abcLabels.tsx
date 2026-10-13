// Display helpers for ABC roles and legal rules (shared by the ABC portal and the admin rules page).
import Badge from "@/components/ui/badge/Badge";
import { tr, type MessageKey } from "@/i18n/core";
import type { AbcRule } from "@/types/abc";
import { formatETB } from "@/utils/formatters";

export const roleName = (r: string) => tr(`abc.role.${r}` as MessageKey);
export const ruleName = (k: string) => tr(`abc.rule.${k}` as MessageKey);

export function ruleValue(r: AbcRule): string {
  if (r.unit === "fraction") return `${(r.value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  if (r.unit === "ETB") return formatETB(r.value);
  return `${r.value.toLocaleString()} ${r.unit ? tr(`abc.unit.${r.unit}` as MessageKey) : ""}`.trim();
}

export function RuleStatus({ status }: { status: AbcRule["verification_status"] }) {
  return status === "verified" ? (
    <Badge size="sm" color="success">{tr("abc.ruleVerified")}</Badge>
  ) : status === "platform_default" ? (
    <Badge size="sm" color="info">{tr("abc.rulePlatform")}</Badge>
  ) : (
    <Badge size="sm" color="warning">{tr("abc.ruleDraft")}</Badge>
  );
}

