"use client";

import * as React from "react";
import { Search, ArrowDownToLine, ArrowUpFromLine, Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
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
  malzemeler,
  stokHareketleri,
  urunler,
  type StokHareketTuru,
} from "@/lib/data";

const TUR_RENK: Record<StokHareketTuru, string> = {
  Giriş: "bg-emerald-100 text-emerald-800",
  Çıkış: "bg-rose-100 text-rose-800",
  Transfer: "bg-blue-100 text-blue-800",
};

const TUR_ICON: Record<StokHareketTuru, React.ReactNode> = {
  Giriş: <ArrowDownToLine className="size-3.5" />,
  Çıkış: <ArrowUpFromLine className="size-3.5" />,
  Transfer: <Repeat className="size-3.5" />,
};

function refAd(ref: { tip: "urun" | "malzeme"; id: string }) {
  if (ref.tip === "urun") return urunler.find((u) => u.id === ref.id)?.ad ?? ref.id;
  return malzemeler.find((m) => m.id === ref.id)?.ad ?? ref.id;
}

export function StockMovements() {
  const [arama, setArama] = React.useState("");
  const [tur, setTur] = React.useState("Tümü");

  const filtreli = stokHareketleri.filter((h) => {
    const q = arama.toLowerCase();
    const ad = refAd(h.ref).toLowerCase();
    const ara = ad.includes(q) || h.id.toLowerCase().includes(q);
    const t = tur === "Tümü" || h.tur === tur;
    return ara && t;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hareket, ürün veya malzeme ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            items={["Tümü", "Giriş", "Çıkış", "Transfer"]}
            value={tur}
            onValueChange={(v) => setTur(v ?? "Tümü")}
            placeholder="Hareket Türü"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Belge</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Öğe</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {h.id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTarih(h.tarih)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={TUR_RENK[h.tur]}>
                    <span className="mr-1 inline-flex items-center">
                      {TUR_ICON[h.tur]}
                    </span>
                    {h.tur}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {refAd(h.ref)}
                  <span className="ml-2 text-[10px] text-muted-foreground/70">
                    {h.ref.tip === "urun" ? "Ürün" : "Malzeme"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {h.miktar}
                </TableCell>
                <TableCell className="text-muted-foreground">{h.birim}</TableCell>
                <TableCell className="text-muted-foreground">{h.depo}</TableCell>
                <TableCell className="text-muted-foreground">{h.aciklama}</TableCell>
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Hareket bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">{filtreli.length} hareket</span>
    </div>
  );
}
