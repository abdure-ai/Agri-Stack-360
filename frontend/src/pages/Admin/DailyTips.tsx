import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { tr } from "@/i18n/core";
import TipsTab from "@/pages/Review/TipsTab";

/** Admin entry to the daily tips: write and publish, or approve the morning's AI drafts (same screen as Review → Daily tips). */
export default function DailyTips() {
  return (
    <>
      <PageMeta title={`${tr("nav.adminTips")} | ${tr("app.name")}`} description={tr("tips.adminDescription")} />
      <PageHeader title={tr("nav.adminTips")} description={tr("tips.adminDescription")} />
      <TipsTab />
    </>
  );
}
