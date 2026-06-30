"use client";

import * as React from "react";
import { Printer, Hammer, Layers, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { type Model, type Parca, type Malzeme } from "@/lib/data";
import { flattenParca, modelMalzemeIhtiyaci } from "@/lib/bom";

export function RecipePage({
  urunler,
  parcalar,
  malzemeler,
}: {
  urunler: Model[];
  parcalar: Parca[];
  malzemeler: Malzeme[];
}) {
  const PARCALAR = parcalar;
  const MALZEMELER = malzemeler;
  // Sadece parçalı modeller (BOM'u olanlar) seçilebilir.
  const modeller = urunler.filter((u) => u.parcalar && u.parcalar.length > 0);
  const [modelId, setModelId] = React.useState<string>(
    modeller[0]?.id ?? "",
  );
  const [adet, setAdet] = React.useState("1");

  const model: Model | undefined = modeller.find((m) => m.id === modelId);
  const carpan = Math.max(1, Number(adet) || 1);

  // Çarpılmış parça satırları (üretilecek adet kadar).
  const parcaSatirlari =
    model?.parcalar?.map((p) => ({
      parcaId: p.parcaId,
      miktar: p.miktar * carpan,
    })) ?? [];

  // Toplam malzeme ihtiyacı (recursive).
  const ihtiyac = React.useMemo(
    () => modelMalzemeIhtiyaci(parcaSatirlari, PARCALAR, MALZEMELER),
    [parcaSatirlari],
  );

  // Stok karşılaştırma: yeter mi?
  const eksik = ihtiyac.filter((m) => m.toplamMiktar > m.malzeme.stok);

  // Tahmini toplam malzeme maliyeti.
  const toplamMaliyet = ihtiyac.reduce((t, m) => t + m.toplamFiyat, 0);

  // Parça başına ayrı malzeme dökümü (gruplu görünüm için).
  const parcaAcilim = parcaSatirlari.map((ps) => {
    const p = PARCALAR.find((x) => x.id === ps.parcaId);
    const malzemeMap = flattenParca(ps.parcaId, ps.miktar, PARCALAR);
    return {
      parca: p,
      miktar: ps.miktar,
      malzemeler: [...malzemeMap.entries()]
        .map(([id, qty]) => {
          const m = MALZEMELER.find((x) => x.id === id);
          return m
            ? {
                ad: m.ad,
                miktar: qty,
                birim: m.birim,
                stok: m.stok,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
    };
  });

  if (modeller.length === 0) {
    return (
      <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
        Henüz parçalı (BOM'u olan) model yok. Önce Modeller sayfasından bir
        modele parça ekleyin.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Üst seçim çubuğu */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="grid min-w-64 flex-1 gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <SearchSelect
            items={modeller.map((m) => m.ad)}
            value={model?.ad ?? null}
            onValueChange={(v) => {
              const m = modeller.find((x) => x.ad === v);
              if (m) setModelId(m.id);
            }}
            placeholder="Model seç"
            searchPlaceholder="Model ara..."
          />
        </div>
        <div className="grid w-32 gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Üretilecek Adet
          </label>
          <Input
            type="number"
            value={adet}
            min={1}
            onChange={(e) => setAdet(e.target.value)}
            className="h-9 text-right tabular-nums"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Yazdır
          </Button>
          <Button
            onClick={() => toast.success("Üretim emri oluşturuldu (demo)")}
          >
            <Hammer className="size-4" />
            Üretime Gönder
          </Button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">{model?.ad}</div>
            <div className="text-xs text-muted-foreground">{model?.id}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Parça Sayısı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {parcaSatirlari.reduce((t, p) => t + p.miktar, 0)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Malzeme Çeşidi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {ihtiyac.length}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tahmini Maliyet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              ₺
              {toplamMaliyet.toLocaleString("tr-TR", {
                maximumFractionDigits: 0,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {eksik.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span>
            <strong>{eksik.length} malzeme</strong> stoğu yetersiz. Üretime
            başlamadan önce satın alma planlanmalı.
          </span>
        </div>
      )}

      {/* Parça başına döküm */}
      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Hammer className="size-4 text-muted-foreground" /> Parça Listesi
          </span>
          <span className="text-xs text-muted-foreground">
            {parcaAcilim.length} parça
          </span>
        </div>
        <div className="divide-y">
          {parcaAcilim.map((pa, i) => (
            <div key={i} className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="bg-violet-100 text-violet-800">
                  {pa.parca?.kategori}
                </Badge>
                <span className="text-sm font-medium">
                  {pa.parca?.ad}
                </span>
                <span className="text-xs text-muted-foreground">
                  × {pa.miktar} adet
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2 text-xs sm:grid-cols-3">
                {pa.malzemeler.map((m) => (
                  <div
                    key={m.ad}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-muted-foreground">
                      • {m.ad}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        m.miktar > m.stok && "text-rose-600",
                      )}
                    >
                      {m.miktar.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {m.birim}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplam malzeme ihtiyacı */}
      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Layers className="size-4 text-muted-foreground" /> Toplam Malzeme
            İhtiyacı
          </span>
          <Badge variant="secondary" className="text-xs">
            {carpan}× model için
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Kod</TableHead>
              <TableHead>Malzeme</TableHead>
              <TableHead className="text-right">Gerekli</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Mevcut Stok</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ihtiyac.map((m) => {
              const yetersiz = m.toplamMiktar > m.malzeme.stok;
              return (
                <TableRow key={m.malzeme.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.malzeme.id}
                  </TableCell>
                  <TableCell className="font-medium">{m.malzeme.ad}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      yetersiz && "font-medium text-rose-600",
                    )}
                  >
                    {m.toplamMiktar.toLocaleString("tr-TR", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.malzeme.birim}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {m.malzeme.stok}
                  </TableCell>
                  <TableCell>
                    {yetersiz ? (
                      <Badge variant="secondary" className="bg-rose-100 text-rose-800">
                        Eksik
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                        Yeterli
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₺
                    {m.toplamFiyat.toLocaleString("tr-TR", {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2.5 text-sm">
          <span className="font-medium">Tahmini Toplam Maliyet</span>
          <span className="text-lg font-semibold tabular-nums">
            ₺
            {toplamMaliyet.toLocaleString("tr-TR", {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
