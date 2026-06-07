import { Badge } from "@/components/ui/badge";
import type { SiparisDurum } from "@/lib/data";

const renkler: Record<SiparisDurum, string> = {
  Beklemede: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Hazırlanıyor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Kargoda:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "Teslim Edildi":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  İptal: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function StatusBadge({ durum }: { durum: SiparisDurum }) {
  return (
    <Badge variant="secondary" className={renkler[durum]}>
      {durum}
    </Badge>
  );
}
