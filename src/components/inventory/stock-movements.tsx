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
import { formatTarih } from "@/lib/data";

type Tur = "Giriş" | "Çıkış" | "Transfer";

type Hareket = {
  id: string;
  tarih: string;
  tur: Tur;
  urun: string;
  miktar: number;
  depo: string;
  aciklama: string;
};

const HAREKETLER: Hareket[] = [
  { id: "SH-1010", tarih: "2026-06-05", tur: "Giriş", urun: "Milano 3+2 Koltuk Takımı", miktar: 4, depo: "Ana Depo", aciklama: "Üretimden giriş" },
  { id: "SH-1009", tarih: "2026-06-05", tur: "Çıkış", urun: "Nordic TV Ünitesi", miktar: 2, depo: "Ana Depo", aciklama: "Sipariş SIP-5021" },
  { id: "SH-1008", tarih: "2026-06-04", tur: "Transfer", urun: "Comfort Berjer Koltuk", miktar: 1, depo: "Ana Depo → Showroom", aciklama: "Sergileme" },
  { id: "SH-1007", tarih: "2026-06-04", tur: "Çıkış", urun: "Elegance Şifonyer", miktar: 3, depo: "Ana Depo", aciklama: "Sipariş SIP-5019" },
  { id: "SH-1006", tarih: "2026-06-03", tur: "Giriş", urun: "Saten Halı 160×230", miktar: 10, depo: "Yedek Depo", aciklama: "Tedarikçi alımı" },
  { id: "SH-1005", tarih: "2026-06-02", tur: "Çıkış", urun: "Minimal Kitaplık", miktar: 1, depo: "Ana Depo", aciklama: "Hasarlı iade" },
  { id: "SH-1004", tarih: "2026-06-02", tur: "Transfer", urun: "Aurora Gardırop 4 Kapaklı", miktar: 2, depo: "Yedek Depo → Ana Depo", aciklama: "Bölgesel sevkiyat" },
  { id: "SH-1003", tarih: "2026-06-01", tur: "Giriş", urun: "Venüs Yatak Odası Takımı", miktar: 1, depo: "Ana Depo", aciklama: "Üretimden giriş" },
];

const TUR_RENK: Record<Tur, string> = {
  Giriş: "bg-emerald-100 text-emerald-800",
  Çıkış: "bg-rose-100 text-rose-800",
  Transfer: "bg-blue-100 text-blue-800",
};

const TUR_ICON: Record<Tur, React.ReactNode> = {
  Giriş: <ArrowDownToLine className="size-3.5" />,
  Çıkış: <ArrowUpFromLine className="size-3.5" />,
  Transfer: <Repeat className="size-3.5" />,
};

export function StockMovements() {
  const [arama, setArama] = React.useState("");
  const [tur, setTur] = React.useState("Tümü");

  const filtreli = HAREKETLER.filter((h) => {
    const q = arama.toLowerCase();
    const ara =
      h.urun.toLowerCase().includes(q) || h.id.toLowerCase().includes(q);
    const t = tur === "Tümü" || h.tur === tur;
    return ara && t;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hareket veya ürün ara..."
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

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Belge</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
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
                <TableCell className="font-medium">{h.urun}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {h.miktar}
                </TableCell>
                <TableCell className="text-muted-foreground">{h.depo}</TableCell>
                <TableCell className="text-muted-foreground">{h.aciklama}</TableCell>
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
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
