"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTarih,
  type UretimEmri,
  type UretimDurum,
  type UretimOncelik,
} from "@/lib/data";

const DURUMLAR: UretimDurum[] = [
  "Planlandı",
  "Üretimde",
  "Tamamlandı",
  "İptal",
];

const DURUM_RENK: Record<UretimDurum, string> = {
  Planlandı: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Üretimde: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Tamamlandı:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  İptal: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const ONCELIK_RENK: Record<UretimOncelik, string> = {
  Düşük: "bg-muted text-muted-foreground",
  Normal: "bg-slate-100 text-slate-700",
  Yüksek: "bg-orange-100 text-orange-800",
  Acil: "bg-rose-100 text-rose-800",
};

function UretimBadge({ durum }: { durum: UretimDurum }) {
  return (
    <Badge variant="secondary" className={DURUM_RENK[durum]}>
      {durum}
    </Badge>
  );
}

export function ProductionOrders({ emirler }: { emirler: UretimEmri[] }) {
  const [arama, setArama] = React.useState("");
  const [durum, setDurum] = React.useState("Tümü");

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    return emirler.filter((e) => {
      const ara =
        e.urunAd.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
      const d = durum === "Tümü" || e.durum === durum;
      return ara && d;
    });
  }, [emirler, arama, durum]);

  return (
    <div>
      <PageHeader baslik="Üretim Emirleri">
        <Link
          href="/uretim/plan"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus className="size-4" /> Yeni Üretim Emri
        </Link>
      </PageHeader>

      {/* Filtreler */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Emir no / model ara..."
          className="h-9 w-60"
        />
        <SearchSelect
          items={["Tümü", ...DURUMLAR]}
          value={durum}
          onValueChange={(v) => setDurum(v ?? "Tümü")}
          placeholder="Durum"
          searchPlaceholder="Durum ara..."
          className="w-44"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {filtreli.length} emir
        </span>
      </div>

      {/* Liste */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Emir No</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Adet</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Oluşturma</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Hedef</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.id}
                  </TableCell>
                  <TableCell className="font-medium">{e.urunAd}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.adet}
                  </TableCell>
                  <TableCell>
                    <UretimBadge durum={e.durum} />
                  </TableCell>
                  <TableCell>
                    {e.oncelik ? (
                      <Badge
                        variant="secondary"
                        className={ONCELIK_RENK[e.oncelik]}
                      >
                        {e.oncelik}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTarih(e.olusturma)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.termin ? formatTarih(e.termin) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.musteri ?? e.hedefDepo ?? e.kaynakSiparis ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
