"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, formatTarih, type Siparis, type SiparisDurum } from "@/lib/data";

const durumlar: SiparisDurum[] = [
  "Beklemede",
  "Hazırlanıyor",
  "Kargoda",
  "Teslim Edildi",
  "İptal",
];

export function SiparislerTable({ siparisler }: { siparisler: Siparis[] }) {
  const [durum, setDurum] = useState<string>("hepsi");

  const filtreli = useMemo(
    () =>
      durum === "hepsi"
        ? siparisler
        : siparisler.filter((s) => s.durum === durum),
    [siparisler, durum],
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center gap-3">
          <Select value={durum} onValueChange={(v) => setDurum(v ?? "hepsi")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hepsi">Tüm Durumlar</SelectItem>
              {durumlar.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtreli.length} sipariş
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sipariş No</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Adet</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.id}</TableCell>
                <TableCell>{s.musteri}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTarih(s.tarih)}
                </TableCell>
                <TableCell className="text-right">{s.urunAdedi}</TableCell>
                <TableCell className="text-right">{formatTL(s.tutar)}</TableCell>
                <TableCell>
                  <StatusBadge durum={s.durum} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
