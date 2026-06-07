"use client";

import * as React from "react";
import { Plus, Search, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { formatTarih } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SayimDurum = "Planlandı" | "Devam Ediyor" | "Tamamlandı";

type Sayim = {
  id: string;
  tarih: string;
  depo: string;
  sayilan: number;
  fark: number;
  durum: SayimDurum;
  sorumlu: string;
};

const ILK: Sayim[] = [
  { id: "SAY-2026-006", tarih: "2026-06-04", depo: "Ana Depo", sayilan: 312, fark: -3, durum: "Tamamlandı", sorumlu: "Ahmet Y." },
  { id: "SAY-2026-005", tarih: "2026-06-02", depo: "Yedek Depo", sayilan: 178, fark: 0, durum: "Tamamlandı", sorumlu: "Mehmet K." },
  { id: "SAY-2026-007", tarih: "2026-06-07", depo: "Showroom Merkez", sayilan: 0, fark: 0, durum: "Devam Ediyor", sorumlu: "Ayşe D." },
  { id: "SAY-2026-008", tarih: "2026-06-10", depo: "Ana Depo", sayilan: 0, fark: 0, durum: "Planlandı", sorumlu: "Ahmet Y." },
];

const DURUM_RENK: Record<SayimDurum, string> = {
  Planlandı: "bg-blue-100 text-blue-800",
  "Devam Ediyor": "bg-amber-100 text-amber-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
};

export function StockCount() {
  const [arama, setArama] = React.useState("");
  const [durum, setDurum] = React.useState("Tümü");

  const filtreli = ILK.filter((s) => {
    const q = arama.toLowerCase();
    const ara =
      s.id.toLowerCase().includes(q) ||
      s.depo.toLowerCase().includes(q) ||
      s.sorumlu.toLowerCase().includes(q);
    const d = durum === "Tümü" || s.durum === durum;
    return ara && d;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sayım, depo veya sorumlu ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            items={["Tümü", "Planlandı", "Devam Ediyor", "Tamamlandı"]}
            value={durum}
            onValueChange={(v) => setDurum(v ?? "Tümü")}
            placeholder="Durum"
          />
        </div>
        <Button
          className="ml-auto"
          onClick={() => toast.success("Yeni sayım planlandı (demo)")}
        >
          <Plus className="size-4" /> Yeni Sayım
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="size-3.5 text-muted-foreground" />
                  Sayım No
                </span>
              </TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead className="text-right">Sayılan</TableHead>
              <TableHead className="text-right">Fark</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Sorumlu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {s.id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTarih(s.tarih)}
                </TableCell>
                <TableCell className="font-medium">{s.depo}</TableCell>
                <TableCell className="text-right tabular-nums">{s.sayilan}</TableCell>
                <TableCell
                  className={
                    "text-right tabular-nums " +
                    (s.fark === 0
                      ? "text-muted-foreground"
                      : s.fark > 0
                        ? "text-emerald-600"
                        : "text-rose-600")
                  }
                >
                  {s.fark > 0 ? `+${s.fark}` : s.fark}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={DURUM_RENK[s.durum]}>
                    {s.durum}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.sorumlu}</TableCell>
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Sayım bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">{filtreli.length} sayım</span>
    </div>
  );
}
