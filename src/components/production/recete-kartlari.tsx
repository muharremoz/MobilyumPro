"use client";

import * as React from "react";
import { Box, ChevronDown, FolderOpen, Plus, Ruler, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  bantUzunlugu,
  parcaOlcusu,
  satirMiktari,
  tutkalEsdegerMetre,
  tutkalMi,
  type KenarSecim,
  type Malzeme,
  type ReceteGrup,
  type ReceteSatiri,
} from "@/lib/data";

/**
 * 3D önizleme yalnız açıldığında yüklenir: three.js + drei ~600 KB, her
 * reçete açılışında peşin ödenmemeli.
 */
const ParcaOnizleme = dynamic(
  () =>
    import("@/components/production/parca-onizleme").then(
      (m) => m.ParcaOnizleme,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground">
        Önizleme yükleniyor…
      </div>
    ),
  },
);

/**
 * Reçete — PARÇA KARTLARI.
 *
 * Önceki düzen tek bir geniş tabloydu; 14 kolona çıkınca okunmaz oldu.
 * Artık her parça (ALT TABLA, SAĞ YAN...) bir kart: üstünde adı ve kesim
 * ölçüleri, içinde o parçanın malzemeleri.
 *
 * Kesim ölçüleri PARÇADA durur, satırda değil: bir parçanın suntalamı ve
 * kenar bandı aynı fiziksel panele aittir. Ölçü satır başına tutulsaydı
 * aynı bilgi çoğalır, kenar bandı uzunluğu da hesaplanamazdı.
 */

type AdKaydi = { id: string; ad: string };

function sayiCoz(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const sayiBicim = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 3 });

/** Kenar bandı birimi mi? (m / mt) */
function bantMi(birim?: string) {
  const b = (birim ?? "").trim().toLowerCase();
  return b === "m" || b === "mt";
}

export function ReceteKartlari({
  gruplar,
  satirlar,
  onGruplar,
  onSatirlar,
  malzemeler,
  malzemeSekmeleri,
  etiketToId,
  malzemeEtiketi,
  parcaAdlari,
  onYeniParca,
  onYeniMalzeme,
  istasyonlar,
  ilkIstasyonSlug,
  varsayilanFire = 0,
  tutkalKgMetre = 0,
}: {
  gruplar: ReceteGrup[];
  satirlar: ReceteSatiri[];
  onGruplar: (g: ReceteGrup[]) => void;
  onSatirlar: (s: ReceteSatiri[]) => void;
  malzemeler: Malzeme[];
  malzemeSekmeleri: { key: string; label: string; items: string[] }[];
  etiketToId: Map<string, string>;
  malzemeEtiketi: (m: Malzeme) => string;
  /** Tanımlamalar → Parçalar (kart başlığındaki ad seçimi). */
  parcaAdlari: string[];
  onYeniParca: () => void;
  /** Yeni malzeme kartı aç; kaynakId verilirse o kartın kopyası olarak. */
  onYeniMalzeme: (satirIndex: number, kaynakId?: string) => void;
  istasyonlar: AdKaydi[];
  ilkIstasyonSlug?: string;
  /** Yeni malzeme satırının başlangıç fire yüzdesi (sistem parametresi). */
  varsayilanFire?: number;
  /** Metre kenar bandı başına tutkal (kg) — sistem parametresi. */
  tutkalKgMetre?: number;
}) {
  const [acikOlculer, setAcikOlculer] = React.useState<Set<string>>(
    () => new Set(),
  );
  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );

  const [acikGorseller, setAcikGorseller] = React.useState<Set<string>>(
    () => new Set(),
  );

  function gorselAcKapa(ad: string) {
    setAcikGorseller((s) => {
      const y = new Set(s);
      if (y.has(ad)) y.delete(ad);
      else y.add(ad);
      return y;
    });
  }

  function olcuAcKapa(ad: string) {
    setAcikOlculer((s) => {
      const y = new Set(s);
      if (y.has(ad)) y.delete(ad);
      else y.add(ad);
      return y;
    });
  }

  function grupGuncelle(ad: string, degisim: Partial<ReceteGrup>) {
    const y = gruplar.map((g) => (g.ad === ad ? { ...g, ...degisim } : g));
    onGruplar(y);
    // Ölçü değişince satır miktarları da tazelenir; ölçü ile miktar iki ayrı
    // kaynak olsaydı hangisinin doğru olduğu belirsiz kalırdı.
    onSatirlar(tazele(satirlar, y));
  }

  /**
   * Türetilen miktarları yeniden hesaplar.
   *
   * Üç kural var ve hepsi aynı yerde durmalı, yoksa biri güncellenip diğeri
   * eski kalır:
   *  - m² satırı → parçanın alanı
   *  - m/mt satırı → seçilen kenarların uzunluğu
   *  - tutkal satırı → o parçadaki TOPLAM bant metresi × katsayı
   * Tutkal parça genelinde toplandığı için tek satır değil, hep bütün
   * liste üzerinden hesaplanıyor.
   */
  function tazele(
    satirListesi: ReceteSatiri[],
    grupListesi: ReceteGrup[],
  ): ReceteSatiri[] {
    const grupOf = (s: ReceteSatiri) =>
      grupListesi.find((x) => x.ad === (s.grup ?? ""));
    const malzemeOf = (s: ReceteSatiri) =>
      s.bilesen.tip === "malzeme" ? malzemeMap.get(s.bilesen.ref) : undefined;

    // Parça bazında toplam "21 mm eşdeğeri" bant metresi.
    const bantMetre = new Map<string, number>();
    for (const s of satirListesi) {
      const m = malzemeOf(s);
      if (!bantMi(m?.birim)) continue;
      const ad = s.grup ?? "";
      const mm = bantUzunlugu(grupOf(s), s.bant);
      if (mm > 0)
        bantMetre.set(
          ad,
          (bantMetre.get(ad) ?? 0) + tutkalEsdegerMetre(mm / 1000, m?.genislik),
        );
    }

    return satirListesi.map((s) => {
      const m = malzemeOf(s);
      if (tutkalMi(m?.ad)) {
        const metre = bantMetre.get(s.grup ?? "") ?? 0;
        // Bant yoksa kullanıcının elle girdiği miktara dokunulmaz.
        // 4 hane yetmez: ince bantta tutkal 0,0001'in altına iner ve
        // yuvarlama miktarı sıfırlardı.
        return metre > 0
          ? { ...s, miktar: Number((metre * tutkalKgMetre).toFixed(6)) }
          : s;
      }
      const hesap = satirMiktari(m?.birim, grupOf(s), s.bant);
      return hesap == null ? s : { ...s, miktar: hesap };
    });
  }

  function satirGuncelle(i: number, degisim: Partial<ReceteSatiri>) {
    onSatirlar(
      tazele(
        satirlar.map((s, x) => (x === i ? { ...s, ...degisim } : s)),
        gruplar,
      ),
    );
  }

  function satirEkle(grupAd?: string) {
    onSatirlar([
      ...satirlar,
      {
        bilesen: { tip: "malzeme", ref: "" },
        miktar: 1,
        fire: varsayilanFire,
        ...(grupAd ? { grup: grupAd } : {}),
        ...(ilkIstasyonSlug ? { istasyon: ilkIstasyonSlug } : {}),
      },
    ]);
  }

  function grupSil(ad: string) {
    // Satırlar silinmez, yalnız parçadan çıkar: kullanıcı parçayı kaldırırken
    // içindeki malzemeleri kaybetmeyi beklemez.
    onSatirlar(
      satirlar.map((s) => ((s.grup ?? "") === ad ? { ...s, grup: undefined } : s)),
    );
    onGruplar(gruplar.filter((g) => g.ad !== ad));
  }

  const grupsuz = satirlar
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.grup?.trim());

  return (
    <div className="flex flex-col gap-3">
      {gruplar.map((g) => {
        const kendi = satirlar
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => (s.grup ?? "") === g.ad);
        const olcuAcik = acikOlculer.has(g.ad);
        const gorselAcik = acikGorseller.has(g.ad);
        const { en, boy } = parcaOlcusu(g);
        // Önizlemeye yalnız kenar bandı satırları girer; suntalam/vida panelin
        // kenarını göstermez.
        const bantSatirlari = kendi
          .filter(({ s }) => {
            const m =
              s.bilesen.tip === "malzeme"
                ? malzemeMap.get(s.bilesen.ref)
                : undefined;
            return bantMi(m?.birim) && s.bant;
          })
          .map(({ s }) => ({
            ad:
              (s.bilesen.tip === "malzeme"
                ? malzemeMap.get(s.bilesen.ref)?.ad
                : undefined) ?? "Kenar bandı",
            kenarlar: s.bant ?? {},
          }));

        return (
          <div key={g.ad} className="overflow-hidden rounded-lg border bg-card">
            {/* Kart başlığı: parça adı + ölçü özeti + aç/kapa */}
            <div className="flex flex-wrap items-center gap-2 border-b bg-primary/[0.06] px-3 py-2">
              <FolderOpen className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-primary">{g.ad}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
                {kendi.length} malzeme
              </span>
              {en && boy ? (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {sayiBicim(en)}×{sayiBicim(boy)} mm
                  {g.kalinlik ? ` · ${sayiBicim(g.kalinlik)} mm kalınlık` : ""}
                </span>
              ) : (
                <span className="text-[11px] text-amber-700">Ölçü girilmedi</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => olcuAcKapa(g.ad)}
                >
                  <Ruler className="size-3.5" />
                  Ölçüler
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      olcuAcik && "rotate-180",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => gorselAcKapa(g.ad)}
                >
                  <Box className="size-3.5" />
                  Görsel
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      gorselAcik && "rotate-180",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => satirEkle(g.ad)}
                >
                  <Plus className="size-3" /> Malzeme
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => grupSil(g.ad)}
                  aria-label={`${g.ad} parçasını kaldır`}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Ölçü paneli — düğmeyle açılır, kart kalabalıklaşmasın */}
            {olcuAcik && (
              <div className="grid gap-3 border-b bg-muted/20 px-3 py-3 sm:grid-cols-4">
                <OlcuCifti
                  baslik="Kaba Kesim"
                  aciklama="Plakadan ilk ebatlama — malzeme tüketimi bundan hesaplanır."
                  en={g.kabaEn}
                  boy={g.kabaBoy}
                  onEn={(v) => grupGuncelle(g.ad, { kabaEn: v })}
                  onBoy={(v) => grupGuncelle(g.ad, { kabaBoy: v })}
                />
                <OlcuCifti
                  baslik="Net Kesim"
                  aciklama="Bantlamadan önceki ölçü — kenar bandı bundan hesaplanır."
                  en={g.netEn}
                  boy={g.netBoy}
                  onEn={(v) => grupGuncelle(g.ad, { netEn: v })}
                  onBoy={(v) => grupGuncelle(g.ad, { netBoy: v })}
                />
                <OlcuCifti
                  baslik="Bitmiş Ölçü"
                  aciklama="Bantlar takıldıktan sonraki nihai ölçü."
                  en={g.bitmisEn}
                  boy={g.bitmisBoy}
                  onEn={(v) => grupGuncelle(g.ad, { bitmisEn: v })}
                  onBoy={(v) => grupGuncelle(g.ad, { bitmisBoy: v })}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium">Kalınlık</span>
                  <SayiKutusu
                    etiket="mm"
                    deger={g.kalinlik}
                    onDeger={(v) => grupGuncelle(g.ad, { kalinlik: v })}
                  />
                </div>
              </div>
            )}

            {/* 3D önizleme — bantlı kenarlar renkli şeritle belirginleşir */}
            {gorselAcik && (
              <div className="border-b bg-muted/10 px-3 py-3">
                <ParcaOnizleme
                  en={en}
                  boy={boy}
                  kalinlik={g.kalinlik}
                  bantlar={bantSatirlari}
                />
              </div>
            )}

            {/* Malzemeler */}
            {kendi.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                Bu parçaya henüz malzeme eklenmedi.
              </p>
            ) : (
              <div className="divide-y">
                {kendi.map(({ s, i }) => (
                  <MalzemeSatiri
                    key={i}
                    satir={s}
                    grup={g}
                    malzeme={
                      s.bilesen.tip === "malzeme"
                        ? malzemeMap.get(s.bilesen.ref)
                        : undefined
                    }
                    malzemeSekmeleri={malzemeSekmeleri}
                    etiketToId={etiketToId}
                    malzemeEtiketi={malzemeEtiketi}
                    malzemeler={malzemeler}
                    istasyonlar={istasyonlar}
                    ilkIstasyonSlug={ilkIstasyonSlug}
                    otomatik={
                      tutkalMi(
                        s.bilesen.tip === "malzeme"
                          ? malzemeMap.get(s.bilesen.ref)?.ad
                          : undefined,
                      ) && bantSatirlari.length > 0
                    }
                    onDegis={(d) => satirGuncelle(i, d)}
                    onYeniMalzeme={(kaynakId) => onYeniMalzeme(i, kaynakId)}
                    onSil={() =>
                      onSatirlar(
                        tazele(
                          satirlar.filter((_, j) => j !== i),
                          gruplar,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Parçaya bağlanmamış satırlar */}
      {grupsuz.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-dashed bg-card">
          <div className="border-b bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Parçasız bileşenler
            </span>
          </div>
          <div className="divide-y">
            {grupsuz.map(({ s, i }) => (
              <MalzemeSatiri
                key={i}
                satir={s}
                malzeme={
                  s.bilesen.tip === "malzeme"
                    ? malzemeMap.get(s.bilesen.ref)
                    : undefined
                }
                malzemeSekmeleri={malzemeSekmeleri}
                etiketToId={etiketToId}
                malzemeEtiketi={malzemeEtiketi}
                malzemeler={malzemeler}
                istasyonlar={istasyonlar}
                ilkIstasyonSlug={ilkIstasyonSlug}
                parcaSecenekleri={gruplar.map((g) => g.ad)}
                onDegis={(d) => satirGuncelle(i, d)}
                onYeniMalzeme={(kaynakId) => onYeniMalzeme(i, kaynakId)}
                onSil={() => onSatirlar(satirlar.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Parça adı serbest metin değil, Tanımlamalar → Parçalar listesinden
            seçilir ki aynı parça her reçetede aynı adla geçsin. */}
        <div className="w-56">
          <SearchSelect
            items={parcaAdlari.filter(
              (x) => !gruplar.some((g) => g.ad === x),
            )}
            value={null}
            onValueChange={(v) => {
              if (!v) return;
              onGruplar([...gruplar, { ad: v, sira: gruplar.length + 1 }]);
            }}
            placeholder="Parça ekle"
            emptyText="Parça bulunamadı"
            addLabel="Yeni parça ekle"
            onAdd={onYeniParca}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => satirEkle()}
        >
          <Plus className="size-4" /> Parçasız malzeme
        </Button>
      </div>
    </div>
  );
}

/** Kart içindeki tek malzeme satırı. */
function MalzemeSatiri({
  satir,
  grup,
  malzeme,
  malzemeSekmeleri,
  etiketToId,
  malzemeEtiketi,
  malzemeler,
  istasyonlar,
  ilkIstasyonSlug,
  parcaSecenekleri,
  otomatik,
  onDegis,
  onYeniMalzeme,
  onSil,
}: {
  satir: ReceteSatiri;
  grup?: ReceteGrup;
  malzeme?: Malzeme;
  malzemeSekmeleri: { key: string; label: string; items: string[] }[];
  etiketToId: Map<string, string>;
  malzemeEtiketi: (m: Malzeme) => string;
  malzemeler: Malzeme[];
  istasyonlar: AdKaydi[];
  ilkIstasyonSlug?: string;
  parcaSecenekleri?: string[];
  /** Miktarı başka bir satırdan türüyor (tutkal): elle girilemez. */
  otomatik?: boolean;
  onDegis: (d: Partial<ReceteSatiri>) => void;
  onYeniMalzeme: (kaynakId?: string) => void;
  onSil: () => void;
}) {
  const birim = malzeme?.birim ?? "";
  const kenarli = bantMi(birim);
  const hesaplanan = satirMiktari(birim, grup, satir.bant);
  // Tutkal ölçüden değil, bant metresinden türüyor; değeri üst bileşen yazdı.
  const kilitli = hesaplanan != null || otomatik === true;
  const bantMm = kenarli ? bantUzunlugu(grup, satir.bant) : 0;

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-52 flex-1">
          <SearchSelect
            sekmeler={malzemeSekmeleri}
            value={
              satir.bilesen.ref
                ? (malzemeler
                    .filter((m) => m.id === satir.bilesen.ref)
                    .map(malzemeEtiketi)[0] ?? null)
                : null
            }
            onValueChange={(etiket) =>
              onDegis({
                bilesen: {
                  tip: "malzeme",
                  ref: etiketToId.get(etiket ?? "") ?? "",
                },
              })
            }
            placeholder="Malzeme seçin"
            addLabel="Yeni malzeme ekle"
            onAdd={() => onYeniMalzeme()}
            // Kenar bantları gibi birbirinin varyantı olan kartlar çok:
            // sıfırdan yazmak yerine mevcut satırdan kopya açılır.
            kopyaBaslik="Bu malzemenin kopyasını oluştur"
            onKopyala={(etiket) => onYeniMalzeme(etiketToId.get(etiket))}
            className="h-8"
          />
        </div>

        {/* Miktar — ölçüden hesaplanıyorsa kilitli */}
        <div className="relative w-32 shrink-0">
          <Input
            type="number"
            min={0}
            step="any"
            value={
              hesaplanan == null ? satir.miktar : Number(hesaplanan.toFixed(4))
            }
            onChange={(e) => onDegis({ miktar: Number(e.target.value) })}
            readOnly={kilitli}
            title={
              otomatik
                ? "Parçadaki kenar bandı metresinden hesaplanıyor (bant genişliğine göre oranlı)"
                : hesaplanan != null
                  ? "Parçanın kesim ölçüsünden hesaplanıyor"
                  : undefined
            }
            className={cn(
              "h-8 text-right tabular-nums",
              birim && "pr-10",
              kilitli && "bg-muted/50 text-muted-foreground",
            )}
          />
          {birim && (
            <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {birim}
            </span>
          )}
        </div>

        {/* Fire */}
        <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          Fire
          <Input
            type="number"
            min={0}
            max={99}
            value={satir.fire ?? 0}
            onChange={(e) => onDegis({ fire: Number(e.target.value) })}
            className="h-8 w-14 text-right tabular-nums"
          />
          %
        </label>

        <div className="w-32 shrink-0">
          <SearchSelect
            items={istasyonlar.map((x) => x.ad)}
            value={
              istasyonlar.find(
                (x) => x.id === (satir.istasyon ?? ilkIstasyonSlug),
              )?.ad ?? null
            }
            onValueChange={(ad) =>
              onDegis({ istasyon: istasyonlar.find((x) => x.ad === ad)?.id })
            }
            placeholder="İstasyon"
            className="h-8"
          />
        </div>

        {parcaSecenekleri && parcaSecenekleri.length > 0 && (
          <div className="w-36 shrink-0">
            <SearchSelect
              items={parcaSecenekleri}
              value={satir.grup ?? null}
              onValueChange={(v) => onDegis({ grup: v ?? undefined })}
              placeholder="Parçaya ata"
              className="h-8"
            />
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onSil}
          aria-label="Satırı kaldır"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash className="size-3.5" />
        </Button>
      </div>

      {/* Kenar bandı — hangi kenarlara uygulanacağı */}
      {kenarli && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="text-[11px] text-muted-foreground">Kenarlar:</span>
          {(
            [
              ["ust", "Üst"],
              ["alt", "Alt"],
              ["sol", "Sol"],
              ["sag", "Sağ"],
            ] as const
          ).map(([k, etiket]) => {
            const secili = satir.bant?.[k] ?? false;
            return (
              <button
                key={k}
                type="button"
                onClick={() =>
                  onDegis({
                    bant: { ...(satir.bant ?? {}), [k]: !secili } as KenarSecim,
                  })
                }
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  secili
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {etiket}
              </button>
            );
          })}
          <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">
            {bantMm > 0
              ? `${sayiBicim(bantMm)} mm = ${sayiBicim(bantMm / 1000)} m`
              : "kenar seçilmedi"}
          </span>
        </div>
      )}
    </div>
  );
}

/** En + Boy çifti (mm). */
function OlcuCifti({
  baslik,
  aciklama,
  en,
  boy,
  onEn,
  onBoy,
}: {
  baslik: string;
  aciklama: string;
  en?: number;
  boy?: number;
  onEn: (v: number | undefined) => void;
  onBoy: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium" title={aciklama}>
        {baslik}
      </span>
      <div className="flex items-center gap-1">
        <SayiKutusu etiket="En" deger={en} onDeger={onEn} />
        <span className="text-[10px] text-muted-foreground">×</span>
        <SayiKutusu etiket="Boy" deger={boy} onDeger={onBoy} />
      </div>
    </div>
  );
}

function SayiKutusu({
  etiket,
  deger,
  onDeger,
}: {
  etiket: string;
  deger?: number;
  onDeger: (v: number | undefined) => void;
}) {
  return (
    <Input
      inputMode="decimal"
      placeholder={etiket}
      aria-label={etiket}
      value={deger == null ? "" : String(deger)}
      onChange={(e) => onDeger(sayiCoz(e.target.value))}
      className="h-8 w-full text-right text-xs tabular-nums"
    />
  );
}
