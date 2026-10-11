import Card from "@/components/common/Card";
import Button from "@/components/ui/button/Button";
import { tr } from "@/i18n/core";
import { listSavedChecks, OUTBOX_EVENT, type SavedCheck } from "@/offline/outbox";
import { formatDateTime } from "@/utils/formatters";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { PhotoDiagnosisResult } from "./PhotoDiagnosis";

/** Recent photo-check results saved on this phone, readable without a connection. */
export default function SavedChecks() {
  const [checks, setChecks] = useState<SavedCheck[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => void listSavedChecks().then((c) => live && setChecks(c));
    load();
    window.addEventListener(OUTBOX_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(OUTBOX_EVENT, load);
    };
  }, []);

  if (!checks.length) return null;
  return (
    <Card
      className="mt-6"
      accent="sky"
      icon={<History className="size-5" />}
      title={tr("offline.savedChecks")}
      description={tr("offline.savedChecksHint")}
    >
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {checks.map((c) => (
          <li key={c.diagnosisId} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 dark:text-white/90">
                  {c.result.disease ?? tr("offline.noDisease")}
                </p>
                <p className="text-theme-xs text-gray-500">{formatDateTime(c.savedAt)}</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => setOpen(open === c.diagnosisId ? null : c.diagnosisId)}>
                {tr(open === c.diagnosisId ? "credit.hide" : "offline.open")}
              </Button>
            </div>
            {open === c.diagnosisId && (
              <div className="mt-3">
                <PhotoDiagnosisResult result={c.result} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
