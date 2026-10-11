import Alert from "@/components/ui/alert/Alert";
import { tr, type MessageKey } from "@/i18n/core";

/**
 * Shown wherever the app displays example product names, doses or prices that
 * were never verified (the original Crop Health library, supplier and loan seed data).
 */
export default function DemoDataNotice({
  subject = "demo.subject.products",
  message,
}: {
  subject?: MessageKey;
  /** A complete message instead of the generic product/chemical one. */
  message?: MessageKey;
}) {
  return (
    <Alert
      variant="warning"
      title={tr("demo.title")}
      message={message ? tr(message) : tr("demo.message", { subject: tr(subject) })}
    />
  );
}
