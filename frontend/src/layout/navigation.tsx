import {
  AiIcon,
  CartIcon,
  ChartAltIcon,
  DataBaseIcon,
  DollarLineIcon,
  GridIcon,
  MultiUserIcon,
  UserCircleIcon,
} from "@/icons";
import type { MessageKey } from "@/i18n/core";
import type { Permission } from "@/types/api";
import {
  Activity,
  Banknote,
  Beef,
  BookOpenText,
  Building2,
  Factory,
  Handshake,
  HeartHandshake,
  ClipboardList,
  Inbox,
  KeyRound,
  KeySquare,
  Lightbulb,
  Map as MapIcon,
  MessageSquareHeart,
  Microscope,
  Scale,
  ScrollText,
  ShieldCheck,
  ShieldUser,
  ShoppingBasket,
  SlidersHorizontal,
  Sprout,
  Tractor,
  UserX,
} from "lucide-react";
import type { ReactNode } from "react";

export interface NavItem {
  /** Message key of the label. */
  name: MessageKey;
  path: string;
  icon: ReactNode;
  /** Shown when the user holds any of these; omitted = every signed-in user. */
  permissions?: Permission[];
}

export interface NavGroup {
  title: MessageKey;
  items: NavItem[];
}

const ICON = "size-6";

// Keep `permissions` in step with the matching <RequirePermission> in App.tsx.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "nav.menu",
    items: [
      { name: "nav.dashboard", path: "/dashboard", icon: <GridIcon className={ICON} /> },
      { name: "nav.market", path: "/market", icon: <ChartAltIcon className={ICON} /> },
      { name: "nav.livestock", path: "/livestock", icon: <Beef className={ICON} strokeWidth={1.5} /> },
      { name: "nav.map", path: "/map", icon: <MapIcon className={ICON} strokeWidth={1.5} /> },
      { name: "nav.advisory", path: "/advisory", icon: <AiIcon className={ICON} /> },
      { name: "nav.tips", path: "/tips", icon: <Lightbulb className={ICON} strokeWidth={1.5} /> },
      { name: "nav.myAbc", path: "/my-abc", icon: <Handshake className={ICON} strokeWidth={1.5} />, permissions: ["abc:shareholder"] },
    ],
  },
  {
    title: "nav.group.farming",
    items: [
      { name: "nav.cropHealth", path: "/crop-health", icon: <Sprout className={ICON} strokeWidth={1.5} />, permissions: ["crop_health:use"] },
      { name: "nav.inputs", path: "/inputs", icon: <CartIcon className={ICON} />, permissions: ["inputs:read"] },
      { name: "nav.verify", path: "/verify", icon: <ShieldCheck className={ICON} strokeWidth={1.5} />, permissions: ["inputs:verify"] },
      { name: "nav.financial", path: "/financial", icon: <DollarLineIcon className={ICON} />, permissions: ["financial:read"] },
    ],
  },
  {
    title: "nav.group.extension",
    items: [
      { name: "nav.daCopilot", path: "/da", icon: <ClipboardList className={ICON} strokeWidth={1.5} />, permissions: ["da:work"] },
      { name: "nav.daInbox", path: "/da/escalations", icon: <Inbox className={ICON} strokeWidth={1.5} />, permissions: ["da:work"] },
      { name: "nav.reports", path: "/reports", icon: <MapIcon className={ICON} strokeWidth={1.5} />, permissions: ["reports:read"] },
    ],
  },
  {
    title: "nav.group.partners",
    items: [
      { name: "nav.supplier", path: "/supplier", icon: <Factory className={ICON} strokeWidth={1.5} />, permissions: ["supplier:manage"] },
      { name: "nav.dealer", path: "/dealer", icon: <ShoppingBasket className={ICON} strokeWidth={1.5} />, permissions: ["dealer:manage"] },
      { name: "nav.abc", path: "/abc", icon: <Handshake className={ICON} strokeWidth={1.5} />, permissions: ["abc:manage", "abc:member"] },
      { name: "nav.abcPortfolio", path: "/abc-portfolio", icon: <Building2 className={ICON} strokeWidth={1.5} />, permissions: ["abc:portfolio"] },
      { name: "nav.estate", path: "/estate", icon: <Tractor className={ICON} strokeWidth={1.5} />, permissions: ["estate:manage"] },
      { name: "nav.ngo", path: "/ngo", icon: <HeartHandshake className={ICON} strokeWidth={1.5} />, permissions: ["ngo:manage"] },
      { name: "nav.regulator", path: "/regulator", icon: <Scale className={ICON} strokeWidth={1.5} />, permissions: ["registry:manage"] },
      { name: "nav.lender", path: "/lender", icon: <Banknote className={ICON} strokeWidth={1.5} />, permissions: ["credit:request"] },
    ],
  },
  {
    title: "nav.account",
    items: [{ name: "nav.profile", path: "/profile", icon: <UserCircleIcon className={ICON} /> }],
  },
  {
    title: "nav.userManagement",
    items: [
      { name: "nav.users", path: "/admin/users", icon: <MultiUserIcon className={ICON} />, permissions: ["users:manage"] },
      { name: "nav.roles", path: "/admin/roles", icon: <ShieldUser className={ICON} strokeWidth={1.5} />, permissions: ["users:manage"] },
      { name: "nav.permissions", path: "/admin/permissions", icon: <KeyRound className={ICON} strokeWidth={1.5} />, permissions: ["users:manage"] },
      { name: "nav.erasure", path: "/admin/erasure-requests", icon: <UserX className={ICON} strokeWidth={1.5} />, permissions: ["users:manage"] },
    ],
  },
  {
    title: "nav.group.contentAi",
    items: [
      { name: "nav.review", path: "/review", icon: <Microscope className={ICON} strokeWidth={1.5} />, permissions: ["content:review"] },
      { name: "nav.adminTips", path: "/admin/tips", icon: <Lightbulb className={ICON} strokeWidth={1.5} />, permissions: ["content:review"] },
      { name: "nav.knowledge", path: "/admin/knowledge", icon: <BookOpenText className={ICON} />, permissions: ["knowledge:manage"] },
      { name: "nav.aiKeys", path: "/admin/ai-keys", icon: <KeySquare className={ICON} />, permissions: ["advisory:admin"] },
      { name: "nav.advisorySettings", path: "/admin/advisory-settings", icon: <SlidersHorizontal className={ICON} strokeWidth={1.5} />, permissions: ["advisory:admin"] },
      { name: "nav.monitoring", path: "/admin/monitoring", icon: <Activity className={ICON} strokeWidth={1.5} />, permissions: ["advisory:admin"] },
    ],
  },
  {
    title: "nav.group.system",
    items: [
      { name: "nav.dataSync", path: "/admin/data-sync", icon: <DataBaseIcon className={ICON} />, permissions: ["sync:manage"] },
      { name: "nav.orgs", path: "/admin/orgs", icon: <Building2 className={ICON} strokeWidth={1.5} />, permissions: ["orgs:manage"] },
      { name: "nav.abcRules", path: "/admin/abc-rules", icon: <Scale className={ICON} strokeWidth={1.5} />, permissions: ["orgs:manage"] },
      { name: "nav.auditLog", path: "/admin/audit-log", icon: <ScrollText className={ICON} strokeWidth={1.5} />, permissions: ["audit:read"] },
      { name: "nav.feedback", path: "/admin/feedback", icon: <MessageSquareHeart className={ICON} strokeWidth={1.5} />, permissions: ["feedback:manage"] },
      { name: "nav.websitePartners", path: "/admin/website-partners", icon: <Handshake className={ICON} strokeWidth={1.5} />, permissions: ["site:manage"] },
    ],
  },
];

/** Groups and items the user may open; empty groups are dropped. */
export function visibleNav(can: (...perms: Permission[]) => boolean): NavGroup[] {
  const allowed = (perms?: Permission[]) => !perms || can(...perms);
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.permissions)) })).filter(
    (g) => g.items.length > 0,
  );
}
