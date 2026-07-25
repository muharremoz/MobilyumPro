"use client";

import * as React from "react";
import { Box, Package, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { PaketIcerik, ParcaPaket } from "@/lib/data";

/**
 * Parça formundaki "Paketleme" sekmesi — koli dökümü.
 *
 * Paketleme istasyonundaki personelin ihtiyacı: bu iş kaç koliden çıkacak ve
 * her kolinin içine ne girecek. Pakete doğrudan MALZEME konmaz; malzemeler
 * poşette gruplanır, poşet pakete girer.
 */

type AdKaydi = { id: string; ad: string };

/** Sayı alanları formda metin tutulur; kayıtta sayıya çevrilir. */
function sayiyaCevir(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function PaketlemeTab({
  paketler,
  onDegis,
  parcalar,
  posetler,
}: {
  paketler: ParcaPaket[];
  onDegis: (yeni: ParcaPaket[]) => void;
  /** İçeriğe eklenebilecek alt parçalar (bu parçanın kendisi hariç). */
  parcalar: AdKaydi[];
  /** İçeriğe eklenebilecek malzeme poşetleri. */
  posetler: AdKaydi[];
}) {
  const parcaAd = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p.ad])),
    [parcalar],
  );
  const posetAd = React.useMemo(
    () => new Map(posetler.map((p) => [p.id, p.ad])),
    [posetler],
  );

  function paketGuncelle(i: number, degisim: Partial<ParcaPaket>) {
    onDegis(paketler.map((p, x) => (x === i ? { ...p, ...degisim } : p)));
  }

  function paketEkle() {
    onDegis([
      ...paketler,
      { sira: paketler.length + 1, icerik: [] },
    ]);
  }

  function paketSil(i: number) {
    // Sıra numaraları boşluksuz kalmalı: "Paket 1, Paket 3" personeli
    // eksik koli var sanmaya iter.
    onDegis(
      paketler
        .filter((_, x) => x !== i)
        .map((p, idx) => ({ ...p, sira: idx + 1 })),
    );
  }

  function icerikEkle(i: number, tip: "parca" | "poset") {
    const yeni: PaketIcerik =
      tip === "poset"
        ? { tip: "poset", posetId: "", miktar: 1 }
        : { tip: "parca", parcaId: "", miktar: 1 };
    paketGuncelle(i, { icerik: [...paketler[i].icerik, yeni] });
  }

  function icerikGuncelle(i: number, j: number, yeni: PaketIcerik) {
    paketGuncelle(i, {
      icerik: paketler[i].icerik.map((s, x) => (x === j ? yeni : s)),
    });
  }

  function icerikSil(i: number, j: number) {
    paketGuncelle(i, { icerik: paketler[i].icerik.filter((_, x) => x !== j) });
  }

  if (paketler.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-card p-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Package className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Koli dökümü tanımlanmamış</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Bu parça kaç koliden çıkacak ve her kolinin içine ne girecek?
            Paketleme istasyonundaki personel bu listeyi görür.
          </p>
        </div>
        <Button type="button" size="sm" onClick={paketEkle}>
          <Plus className="size-4" /> İlk paketi ekle
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {paketler.map((paket, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-md border bg-card"
        >
          {/* Paket başlığı: sıra + ad + ölçüler */}
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
              {paket.sira}
            </span>
            <Input
              value={paket.ad ?? ""}
              onChange={(e) => paketGuncelle(i, { ad: e.target.value })}
              placeholder={`Paket ${paket.sira} (ad opsiyonel)`}
              className="h-8 max-w-56"
            />
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <OlcuAlani
                etiket="En"
                deger={paket.genislik}
                onDeger={(v) => paketGuncelle(i, { genislik: v })}
                />
              <OlcuAlani
                etiket="Boy"
                deger={paket.uzunluk}
                onDeger={(v) => paketGuncelle(i, { uzunluk: v })}
                />
              <OlcuAlani
                etiket="Yük."
                deger={paket.yukseklik}
                onDeger={(v) => paketGuncelle(i, { yukseklik: v })}
                />
              <OlcuAlani
                etiket="Ağırlık"
                birim="kg"
                deger={paket.agirlik}
                onDeger={(v) => paketGuncelle(i, { agirlik: v })}
                />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => paketSil(i)}
                aria-label={`Paket ${paket.sira} sil`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* İçerik */}
          {paket.icerik.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Bu paketin içi boş. Alt parça ya da malzeme poşeti ekleyin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Tür</TableHead>
                  <TableHead>İçerik</TableHead>
                  <TableHead className="w-28 text-right">Miktar</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paket.icerik.map((satir, j) => {
                  const secili =
                    satir.tip === "poset"
                      ? (posetAd.get(satir.posetId) ?? null)
                      : (parcaAd.get(satir.parcaId) ?? null);
                  const secenekler =
                    satir.tip === "poset" ? posetler : parcalar;
                  return (
                    <TableRow key={j}>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            satir.tip === "poset"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700",
                          )}
                        >
                          {satir.tip === "poset" ? (
                            <Package className="size-3" />
                          ) : (
                            <Box className="size-3" />
                          )}
                          {satir.tip === "poset" ? "Poşet" : "Parça"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SearchSelect
                          items={secenekler.map((x) => x.ad)}
                          value={secili}
                          onValueChange={(ad) => {
                            const bulunan = secenekler.find((x) => x.ad === ad);
                            icerikGuncelle(
                              i,
                              j,
                              satir.tip === "poset"
                                ? { ...satir, posetId: bulunan?.id ?? "" }
                                : { ...satir, parcaId: bulunan?.id ?? "" },
                            );
                          }}
                          placeholder={
                            satir.tip === "poset" ? "Poşet seçin" : "Parça seçin"
                          }
                                      className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          inputMode="decimal"
                          value={String(satir.miktar)}
                          onChange={(e) =>
                            icerikGuncelle(i, j, {
                              ...satir,
                              miktar: sayiyaCevir(e.target.value) ?? 0,
                            })
                          }
                          className="h-8 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => icerikSil(i, j)}
                          aria-label="Satırı sil"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex gap-1.5 border-t px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => icerikEkle(i, "parca")}
              >
                <Box className="size-3.5" /> Parça
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => icerikEkle(i, "poset")}
              >
                <Package className="size-3.5" /> Malzeme Poşeti
            </Button>
          </div>
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={paketEkle}>
          <Plus className="size-4" /> Paket ekle
        </Button>
      </div>
    </div>
  );
}

/** Koli ölçüsü / ağırlığı için dar sayı alanı. */
function OlcuAlani({
  etiket,
  birim = "mm",
  deger,
  onDeger,
}: {
  etiket: string;
  birim?: string;
  deger?: number;
  onDeger: (v: number | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {etiket}
      <Input
        inputMode="decimal"
        value={deger == null ? "" : String(deger)}
        onChange={(e) => onDeger(sayiyaCevir(e.target.value))}
        placeholder={birim}
        className="h-7 w-16 text-right tabular-nums"
      />
    </label>
  );
}
