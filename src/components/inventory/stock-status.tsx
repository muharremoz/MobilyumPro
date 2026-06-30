"use client";

import * as React from "react";
import { Search, AlertTriangle, Boxes, AlertOctagon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Model } from "@/lib/data";

function durum(stok: number) {
  if (stok === 0)
    return { etiket: "Tükendi", renk: "bg-rose-100 text-rose-800" };
  if (stok <= 5)
    return { etiket: "Kritik", renk: "bg-amber-100 text-amber-800" };
  return { etiket: "Yeterli", renk: "bg-emerald-100 text-emerald-800" };
}

export function StockStatus({ urunler }: { urunler: Model[] }) {
  const [arama, setArama] = React.useState("");
  const [filt, setFilt] = React.useState("Tümü");

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    return urunler
      .filter((u) => {
        const ara =
          u.ad.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
        let dur = true;
        if (filt === "Tükendi") dur = u.stok === 0;
        else if (filt === "Kritik") dur = u.stok > 0 && u.stok <= 5;
        else if (filt === "Yeterli") dur = u.stok > 5;
        return ara && dur;
      })
      .sort((a, b) => a.stok - b.stok);
  }, [arama, filt]);

  const kritik = urunler.filter((u) => u.stok > 0 && u.stok <= 5).length;
  const tukenen = urunler.filter((u) => u.stok === 0).length;
  const toplamAdet = urunler.reduce((t, u) => t + u.stok, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<Boxes className="size-4" />}
          label="Toplam Stok"
          value={toplamAdet}
        />
        <MetricCard
          icon={<AlertTriangle className="size-4 text-amber-600" />}
          label="Kritik Stok"
          value={kritik}
          tone="amber"
        />
        <MetricCard
          icon={<AlertOctagon className="size-4 text-rose-600" />}
          label="Tükenen"
          value={tukenen}
          tone="rose"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Model veya kod ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-36">
          <SearchSelect
            items={["Tümü", "Yeterli", "Kritik", "Tükendi"]}
            value={filt}
            onValueChange={(v) => setFilt(v ?? "Tümü")}
            placeholder="Stok Durumu"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((u) => {
              const d = durum(u.stok);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.id}
                  </TableCell>
                  <TableCell className="font-medium">{u.ad}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.kategori}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {u.stok}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={d.renk}>
                      {d.etiket}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} model
      </span>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "amber" | "rose";
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1.5">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "amber" && "text-amber-600",
            tone === "rose" && "text-rose-600",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
