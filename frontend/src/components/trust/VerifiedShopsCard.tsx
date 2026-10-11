import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { LoadingState } from "@/components/common/States";
import Badge from "@/components/ui/badge/Badge";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { BadgeCheck, Phone } from "lucide-react";

/** Shops with the verified-seller badge, nearest first; with `productId`, only shops that have it in stock. */
export default function VerifiedShopsCard({
  productId,
  compact,
}: {
  productId?: number | null;
  compact?: boolean;
}) {
  const shops = useAsync(() => api.trustShops(productId), [productId]);
  if (compact && !shops.loading && !shops.data?.length) return null;
  return (
    <Card
      accent="teal"
      icon={<BadgeCheck className="size-5" />}
      title={productId ? tr("shops.withProduct") : tr("shops.title")}
      description={tr("shops.hint")}
    >
      {shops.loading ? (
        <LoadingState />
      ) : !shops.data?.length ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {tr("shops.none")}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {shops.data.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <div>
                <p className="flex items-center gap-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {s.name}
                  <Badge
                    size="sm"
                    color="success"
                    startIcon={<BadgeCheck className="size-3" />}
                  >
                    {tr("shops.badge")}
                  </Badge>
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {[s.woreda, s.zone].filter(Boolean).join(", ")}
                </p>
              </div>
              {s.phone && (
                <a
                  href={`tel:${s.phone}`}
                  className="inline-flex items-center gap-1 text-theme-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {s.phone}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
