"use client";

import * as React from "react";
import { AlertTriangle, Box, Layers, Package, Plus, Trash2 } from "lucide-react";

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
import type { PaketIcerik, ParcaPaket, ReceteSatiri } from "@/lib/data";

/**
 * Parça formundaki "Paketleme" sekmesi — koli dökümü.
 *
 * Paketleme personelinin ihtiyacı: bu iş kaç koliden çıkacak, hangi bileşen
 * hangi koliye girecek.
 *
 * İçerik seçenekleri PARÇANIN KENDİ REÇETESİNDEN gelir. İlk sürümde
 * sistemdeki tüm parçalar listeleniyordu; oysa zaten o parçanın içindeyiz —
 * koli, bu parçayı oluşturan bileşenlerin dağıtımıdır. Poşet ayrı tutulur,
 * çünkü reçetenin parçası değil: hazır gruplanmış donanım (vida/dübel).
 */

type AdKaydi = { id: string; ad: string; birim?: string };

/** Sayı alanları formda metin tutulur; kayıtta sayıya çevrilir. */
function sayiyaCevir(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** İçerik satırının işaret ettiği kaydın id'si. */
function icerikRef(i: PaketIcerik): string {
  return i.tip === "poset"
    ? i.posetId
    : i.tip === "malzeme"
      ? i.malzemeId
      : i.parcaId;
}

const sayiBicim = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 3 });

export function PaketlemeTab({
  paketler,
  onDegis,
  recete,
  malzemeAdlari,
  parcaAdlari,
  posetler,
}: {
  paketler: ParcaPaket[];
  onDegis: (yeni: ParcaPaket[]) => void;
  /** Bu parçanın reçetesi — içerik seçenekleri buradan gelir. */
  recete: ReceteSatiri[];
  malzemeAdlari: Map<string, AdKaydi>;
  parcaAdlari: Map<string, AdKaydi>;
  /** Hazır malzeme poşetleri (reçetenin dışında). */
  posetler: AdKaydi[];
}) {
  /** Reçete satırlarından seçilebilir bileşen listesi. */
  const bilesenler = React.useMemo(
    () =>
      recete
        .filter((r) => r.bilesen.ref)
        .map((r) => {
          const kayit =
            r.bilesen.tip === "malzeme"
              ? malzemeAdlari.get(r.bilesen.ref)
              : parcaAdlari.get(r.bilesen.ref);
          return {
            tip: r.bilesen.tip,
            id: r.bilesen.ref,
            ad: kayit?.ad ?? r.bilesen.ref,
            birim: kayit?.birim,
            /** Reçetedeki miktar — dağıtım bunun üstünden denetlenir. */
            receteMiktar: r.miktar,
          };
        }),
    [recete, malzemeAdlari, parcaAdlari],
  );

  /** Paketlere dağıtılmış miktarlar (bileşen id → toplam). */
  const dagitilan = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const k of paketler)
      for (const i of k.icerik) {
        if (i.tip === "poset") continue;
        const id = icerikRef(i);
        if (id) m.set(id, (m.get(id) ?? 0) + (i.miktar || 0));
      }
    return m;
  }, [paketler]);

  /**
   * Reçetede olup henüz koliye konmamış (ya da eksik konmuş) bileşenler.
   * Asıl güvence bu: bir parça sessizce unutulup koli dışında kalmasın.
   */
  const eksikler = React.useMemo(
    () =>
      bilesenler
        .map((b) => ({
          ...b,
          kalan: b.receteMiktar - (dagitilan.get(b.id) ?? 0),
        }))
        .filter((b) => b.kalan > 0.0001),
    [bilesenler, dagitilan],
  );

  function paketGuncelle(i: number, degisim: Partial<ParcaPaket>) {
    onDegis(paketler.map((p, x) => (x === i ? { ...p, ...degisim } : p)));
  }

  function paketEkle() {
    onDegis([...paketler, { sira: paketler.length + 1, icerik: [] }]);
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

  function icerikEkle(i: number, yeni: PaketIcerik) {
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

  /** Kalan miktarın tamamını yeni satır olarak pakete koyar. */
  function eksigiEkle(paketIdx: number, b: (typeof eksikler)[number]) {
    icerikEkle(
      paketIdx,
      b.tip === "malzeme"
        ? { tip: "malzeme", malzemeId: b.id, miktar: b.kalan }
        : { tip: "parca", parcaId: b.id, miktar: b.kalan },
    );
  }

  if (bilesenler.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-card p-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Layers className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Önce reçete tanımlayın</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Koli dökümü, bu parçayı oluşturan bileşenlerin dağıtımıdır.
            Reçete boşken dağıtılacak bir şey yok.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Dağıtılmamış bileşen uyarısı */}
      {eksikler.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-950">
              {eksikler.length} bileşen henüz koliye konmadı
            </p>
            <p className="mt-0.5 text-xs text-amber-900/80">
              {eksikler
                .map(
                  (b) =>
                    `${b.ad} (${sayiBicim(b.kalan)}${b.birim ? " " + b.birim : ""})`,
                )
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {paketler.length === 0 ? (
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
      ) : (
        paketler.map((paket, i) => (
          <div key={i} className="overflow-hidden rounded-md border bg-card">
            {/* Paket başlığı: sıra + ad + koli ölçüleri */}
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
                Bu paketin içi boş. Aşağıdan bileşen ya da malzeme poşeti
                ekleyin.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tür</TableHead>
                    <TableHead>İçerik</TableHead>
                    <TableHead className="w-32 text-right">Miktar</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paket.icerik.map((satir, j) => {
                    const posetMi = satir.tip === "poset";
                    const secenekler: AdKaydi[] = posetMi
                      ? posetler
                      : bilesenler.filter((b) => b.tip === satir.tip);
                    const ref = icerikRef(satir);
                    const secili =
                      secenekler.find((x) => x.id === ref)?.ad ?? null;
                    const birim = secenekler.find((x) => x.id === ref)?.birim;
                    return (
                      <TableRow key={j}>
                        <TableCell>
                          <TurRozeti tip={satir.tip} />
                        </TableCell>
                        <TableCell>
                          <SearchSelect
                            items={secenekler.map((x) => x.ad)}
                            value={secili}
                            onValueChange={(ad) => {
                              const yeniId =
                                secenekler.find((x) => x.ad === ad)?.id ?? "";
                              icerikGuncelle(
                                i,
                                j,
                                satir.tip === "poset"
                                  ? { ...satir, posetId: yeniId }
                                  : satir.tip === "malzeme"
                                    ? { ...satir, malzemeId: yeniId }
                                    : { ...satir, parcaId: yeniId },
                              );
                            }}
                            placeholder={
                              posetMi ? "Poşet seçin" : "Bileşen seçin"
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              inputMode="decimal"
                              value={String(satir.miktar)}
                              onChange={(e) =>
                                icerikGuncelle(i, j, {
                                  ...satir,
                                  miktar: sayiyaCevir(e.target.value) ?? 0,
                                })
                              }
                              className="h-8 w-20 text-right tabular-nums"
                            />
                            <span className="w-8 shrink-0 text-[11px] text-muted-foreground">
                              {birim ?? ""}
                            </span>
                          </div>
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

            {/* Ekleme çubuğu: dağıtılmamış bileşenler tek tıkla eklenir */}
            <div className="flex flex-wrap items-center gap-1.5 border-t px-3 py-2">
              {eksikler.length > 0 && (
                <>
                  <span className="text-[11px] text-muted-foreground">
                    Kalan:
                  </span>
                  {eksikler.slice(0, 6).map((b) => (
                    <Button
                      key={b.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => eksigiEkle(i, b)}
                      className="h-7"
                    >
                      <Plus className="size-3" />
                      {b.ad}
                      <span className="text-muted-foreground tabular-nums">
                        {sayiBicim(b.kalan)}
                      </span>
                    </Button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-border" />
                </>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  icerikEkle(i, { tip: "poset", posetId: "", miktar: 1 })
                }
                className="h-7"
              >
                <Package className="size-3.5" /> Malzeme Poşeti
              </Button>
            </div>
          </div>
        ))
      )}

      {paketler.length > 0 && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={paketEkle}>
            <Plus className="size-4" /> Paket ekle
          </Button>
        </div>
      )}
    </div>
  );
}

function TurRozeti({ tip }: { tip: PaketIcerik["tip"] }) {
  const stil =
    tip === "poset"
      ? "bg-violet-100 text-violet-700"
      : tip === "malzeme"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-sky-100 text-sky-700";
  const Ikon = tip === "poset" ? Package : tip === "malzeme" ? Layers : Box;
  const etiket =
    tip === "poset" ? "Poşet" : tip === "malzeme" ? "Malzeme" : "Parça";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        stil,
      )}
    >
      <Ikon className="size-3" />
      {etiket}
    </span>
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
