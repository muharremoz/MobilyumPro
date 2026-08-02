"use client";

import * as React from "react";
import {
  Box,
  Check,
  ChevronDown,
  FolderOpen,
  GripVertical,
  Layers,
  Package,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchSelect } from "@/components/ui/search-select";
import { cn } from "@/lib/utils";
import {
  AGIRLIK_BIRIMLERI,
  OLCU_BIRIMLERI,
  type AgirlikBirimi,
  type OlcuBirimi,
  type PaketIcerik,
  type ParcaPaket,
  type ReceteSatiri,
} from "@/lib/data";

/**
 * Parça formundaki "Paketleme" sekmesi — koli dökümü.
 *
 * İKİ BÖLÜM: solda parçanın bileşenleri (reçeteden), sağda paketler.
 * Bileşen sürüklenip pakete bırakılır ya da paket seçiliyken tıklanır.
 *
 * Tasarım geçmişi: önce içerik satırları paketin içinde açılır liste olarak
 * seçiliyordu; malzeme adları uzun olduğu için (ör. "18 MM SUNTALAM SERÜVEN
 * DÜZ YÜZEY 2800*2100") satır şeridi taşıyor ve karışıyordu. Kaynak listeyi
 * ayırmak hem yer sorununu çözüyor hem de "ne dağıtıldı / ne kaldı" sorusunu
 * tek bakışta cevaplıyor.
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

/** Sürüklenen bileşenin taşıdığı veri (dataTransfer yerine state). */
type Bilesen = { tip: "malzeme" | "parca"; id: string; kalan: number };
/** Sürüklenen: tek bileşen ya da bir reçete grubunun tamamı. */
type Suruklenen =
  | { tur: "bilesen"; bilesen: Bilesen }
  | { tur: "grup"; grup: string };

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
  /** Bu parçanın reçetesi — bileşen listesi buradan gelir. */
  recete: ReceteSatiri[];
  malzemeAdlari: Map<string, AdKaydi>;
  parcaAdlari: Map<string, AdKaydi>;
  /** Hazır malzeme poşetleri (reçetenin dışında). */
  posetler: AdKaydi[];
}) {
  const [suruklenen, setSuruklenen] = React.useState<Suruklenen | null>(null);
  const [hedefPaket, setHedefPaket] = React.useState<number | null>(null);
  /** Tıklamayla ekleme bu pakete gider. */
  const [seciliPaket, setSeciliPaket] = React.useState(0);
  /** Kapalı paketler (indeks). Varsayılan: hepsi açık. */
  const [kapaliPaketler, setKapaliPaketler] = React.useState<Set<number>>(
    () => new Set(),
  );
  const suruklendi = React.useRef(false);

  /** Reçete satırlarından bileşen listesi. */
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
            receteMiktar: r.miktar,
            // Reçetede tanımlanan grup ("Gövde", "Kapak"). Paketlemede de
            // aynı bölümleme kullanılır: grubun tamamı tek seferde koliye
            // konabilsin diye.
            grup: r.grup?.trim() || "",
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

  /** Bileşen + kalan miktar. Kalan 0 ise tamamı dağıtılmış demektir. */
  const kaynak = React.useMemo(
    () =>
      bilesenler.map((b) => ({
        ...b,
        kalan: b.receteMiktar - (dagitilan.get(b.id) ?? 0),
      })),
    [bilesenler, dagitilan],
  );
  const kalanSayisi = kaynak.filter((b) => b.kalan > 0.0001).length;

  /** Kaynak listesi reçete gruplarına göre öbeklenir; grupsuzlar en sonda. */
  const grupluKaynak = React.useMemo(() => {
    const m = new Map<string, typeof kaynak>();
    for (const b of kaynak) {
      const arr = m.get(b.grup) ?? [];
      arr.push(b);
      m.set(b.grup, arr);
    }
    return [...m.entries()]
      .sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : 0))
      .map(([grup, items]) => ({
        grup,
        items,
        kalan: items.filter((x) => x.kalan > 0.0001).length,
      }));
  }, [kaynak]);

  function kapaliDegis(i: number) {
    setKapaliPaketler((k) => {
      const yeni = new Set(k);
      if (yeni.has(i)) yeni.delete(i);
      else yeni.add(i);
      return yeni;
    });
  }

  function paketGuncelle(i: number, degisim: Partial<ParcaPaket>) {
    onDegis(paketler.map((p, x) => (x === i ? { ...p, ...degisim } : p)));
  }

  function paketEkle() {
    onDegis([...paketler, { sira: paketler.length + 1, icerik: [] }]);
    setSeciliPaket(paketler.length);
  }

  function paketSil(i: number) {
    // Sıra numaraları boşluksuz kalmalı: "Paket 1, Paket 3" personeli
    // eksik koli var sanmaya iter.
    onDegis(
      paketler
        .filter((_, x) => x !== i)
        .map((p, idx) => ({ ...p, sira: idx + 1 })),
    );
    setSeciliPaket((s) => (s >= i && s > 0 ? s - 1 : s));
    // Kapalı liste İNDEKS tutuyor; silinince sonrakiler bir kayar. Kaydırmazsak
    // yanlış paket kapalı görünür.
    setKapaliPaketler((k) => {
      const yeni = new Set<number>();
      for (const x of k) {
        if (x === i) continue;
        yeni.add(x > i ? x - 1 : x);
      }
      return yeni;
    });
  }

  /**
   * Bileşeni pakete ekler. Aynı bileşen o pakette zaten varsa miktarı
   * artırılır — aynı şeyi iki satır göstermek koli listesini şişirir.
   */
  /**
   * Bileşen(ler)i pakete ekler. Aynı bileşen o pakette zaten varsa yeni satır
   * açılmaz, miktarı artar — aynı şeyi iki satırda göstermek koli listesini
   * şişirir.
   *
   * Grup sürüklendiğinde grubun TÜM kalan bileşenleri tek işlemde eklenir;
   * tek tek eklemek 10 satırlık bir gövde grubunda anlamsız iş olurdu.
   */
  function bilesenEkle(paketIdx: number, kaynakSecim: Suruklenen) {
    const paket = paketler[paketIdx];
    if (!paket) return;
    const eklenecek: Bilesen[] =
      kaynakSecim.tur === "bilesen"
        ? [kaynakSecim.bilesen]
        : kaynak
            .filter(
              (b) => b.grup === kaynakSecim.grup && b.kalan > 0.0001,
            )
            .map((b) => ({ tip: b.tip, id: b.id, kalan: b.kalan }));
    if (eklenecek.length === 0) return;

    let icerik = [...paket.icerik];
    for (const b of eklenecek) {
      if (b.kalan <= 0) continue;
      const mevcut = icerik.findIndex(
        (x) => x.tip === b.tip && icerikRef(x) === b.id,
      );
      if (mevcut >= 0) {
        icerik = icerik.map((x, i) =>
          i === mevcut ? { ...x, miktar: x.miktar + b.kalan } : x,
        );
      } else {
        icerik.push(
          b.tip === "malzeme"
            ? { tip: "malzeme", malzemeId: b.id, miktar: b.kalan }
            : { tip: "parca", parcaId: b.id, miktar: b.kalan },
        );
      }
    }
    paketGuncelle(paketIdx, { icerik });
  }

  function icerikGuncelle(i: number, j: number, yeni: PaketIcerik) {
    paketGuncelle(i, {
      icerik: paketler[i].icerik.map((s, x) => (x === j ? yeni : s)),
    });
  }

  function icerikSil(i: number, j: number) {
    paketGuncelle(i, { icerik: paketler[i].icerik.filter((_, x) => x !== j) });
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
    <div className="grid gap-3 lg:grid-cols-[20rem_1fr]">
      {/* ── SOL: bileşenler (kaynak) ── */}
      <div className="flex flex-col overflow-hidden rounded-md border bg-card">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">Bileşenler</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              kalanSayisi > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700",
            )}
          >
            {kalanSayisi > 0 ? `${kalanSayisi} kaldı` : "Tamamı dağıtıldı"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 p-2">
          {grupluKaynak.map((g) => (
            <React.Fragment key={g.grup || "__grupsuz"}>
              {/* Grup başlığı — grubun tamamı tek seferde koliye konabilir.
                  Grupsuz bileşenler için başlık basılmaz; tek bir "Grupsuz"
                  başlığı bilgi vermeden yer kaplar. */}
              {g.grup && (
                <button
                  type="button"
                  draggable={g.kalan > 0}
                  onDragStart={() => {
                    setSuruklenen({ tur: "grup", grup: g.grup });
                    suruklendi.current = true;
                  }}
                  onDragEnd={() => {
                    setSuruklenen(null);
                    setHedefPaket(null);
                    setTimeout(() => (suruklendi.current = false), 0);
                  }}
                  onClick={() => {
                    if (suruklendi.current || g.kalan === 0) return;
                    bilesenEkle(seciliPaket, { tur: "grup", grup: g.grup });
                  }}
                  disabled={g.kalan === 0 || paketler.length === 0}
                  title={
                    paketler.length === 0
                      ? "Önce paket ekleyin"
                      : g.kalan === 0
                        ? "Grubun tamamı dağıtıldı"
                        : `Grubu Paket ${seciliPaket + 1}'e ekle (ya da sürükleyin)`
                  }
                  className={cn(
                    "mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors first:mt-0",
                    g.kalan > 0
                      ? "cursor-grab bg-primary/[0.07] hover:bg-primary/15 active:cursor-grabbing"
                      : "bg-muted/40",
                  )}
                >
                  <FolderOpen
                    className={cn(
                      "size-3.5 shrink-0",
                      g.kalan > 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      g.kalan > 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {g.grup}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                    {g.kalan > 0 ? `${g.kalan} kaldı` : "tamam"}
                  </span>
                </button>
              )}
              {g.items.map((b) => {
            const bitti = b.kalan <= 0.0001;
            return (
              <button
                key={`${b.tip}-${b.id}`}
                type="button"
                draggable={!bitti}
                onDragStart={() => {
                  setSuruklenen({
                    tur: "bilesen",
                    bilesen: { tip: b.tip, id: b.id, kalan: b.kalan },
                  });
                  suruklendi.current = true;
                }}
                onDragEnd={() => {
                  setSuruklenen(null);
                  setHedefPaket(null);
                  // click, dragend'den sonra gelir; bir tur sonra serbest bırak.
                  setTimeout(() => (suruklendi.current = false), 0);
                }}
                onClick={() => {
                  if (suruklendi.current || bitti) return;
                  bilesenEkle(seciliPaket, {
                    tur: "bilesen",
                    bilesen: { tip: b.tip, id: b.id, kalan: b.kalan },
                  });
                }}
                disabled={bitti || paketler.length === 0}
                title={
                  paketler.length === 0
                    ? "Önce paket ekleyin"
                    : bitti
                      ? "Tamamı dağıtıldı"
                      : `Paket ${seciliPaket + 1}'e ekle (ya da sürükleyin)`
                }
                className={cn(
                  "group flex items-start gap-2 rounded-md border p-2 text-left transition-colors",
                  bitti
                    ? "border-dashed bg-muted/30 text-muted-foreground"
                    : "cursor-grab hover:border-primary/40 hover:bg-primary/5 active:cursor-grabbing",
                )}
              >
                {bitti ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                )}
                {/* Tür rozeti yok: bu listedeki her satır zaten reçeteden
                    geliyor ve adı ne olduğunu söylüyor. Her satıra "Malzeme"
                    yazmak gürültüden başka bir şey değil. */}
                <span
                  className={cn(
                    "min-w-0 flex-1 text-xs leading-snug",
                    bitti && "line-through",
                  )}
                >
                  {b.ad}
                </span>
                {/* mt-0.5: ad iki satıra sarınca miktar ilk satırla hizalı kalsın. */}
                <span className="mt-0.5 shrink-0 text-right text-[11px] tabular-nums">
                  <span className={cn("font-medium", bitti && "opacity-50")}>
                    {sayiBicim(bitti ? b.receteMiktar : b.kalan)}
                  </span>
                  {b.birim && (
                    <span className="ml-0.5 text-muted-foreground">
                      {b.birim}
                    </span>
                  )}
                </span>
              </button>
            );
              })}
            </React.Fragment>
          ))}
        </div>

        <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          Bileşeni ya da grubun tamamını pakete sürükleyin; seçili pakete
          eklemek için tıklamanız yeterli.
        </p>
      </div>

      {/* ── SAĞ: paketler (hedef) ── */}
      <div className="flex flex-col gap-3">
        {paketler.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-card p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Package className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Koli dökümü tanımlanmamış</p>
              <p className="max-w-md text-xs text-muted-foreground">
                Bu parça kaç koliden çıkacak? Paket ekleyip soldaki
                bileşenleri içine dağıtın.
              </p>
            </div>
            <Button type="button" size="sm" onClick={paketEkle}>
              <Plus className="size-4" /> İlk paketi ekle
            </Button>
          </div>
        ) : (
          paketler.map((paket, i) => {
            const secili = i === seciliPaket;
            const hedef = i === hedefPaket;
            const kapali = kapaliPaketler.has(i);
            const olcuB = paket.olcuBirimi ?? "mm";
            const agirlikB = paket.agirlikBirimi ?? "kg";
            return (
              <div
                key={i}
                onClick={() => setSeciliPaket(i)}
                onDragOver={(e) => {
                  if (!suruklenen) return;
                  e.preventDefault();
                  setHedefPaket(i);
                }}
                onDragLeave={() => setHedefPaket((h) => (h === i ? null : h))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (suruklenen) {
                    bilesenEkle(i, suruklenen);
                    // Kapalı pakete bırakılırsa açılır: eklenen satırın
                    // gerçekten girdiğini görmek gerekir.
                    setKapaliPaketler((k) => {
                      if (!k.has(i)) return k;
                      const yeni = new Set(k);
                      yeni.delete(i);
                      return yeni;
                    });
                  }
                  setSuruklenen(null);
                  setHedefPaket(null);
                }}
                className={cn(
                  "overflow-hidden rounded-md border bg-card transition-colors",
                  hedef && "border-primary bg-primary/5 ring-1 ring-primary",
                  !hedef && secili && "border-primary/50",
                )}
              >
                {/* Başlık: sıra + ad + özet + aç/kapa */}
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => kapaliDegis(i)}
                    aria-label={kapali ? "Paketi aç" : "Paketi kapat"}
                    aria-expanded={!kapali}
                    className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted-foreground/10"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        kapali && "-rotate-90",
                      )}
                    />
                  </button>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                      secili
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground",
                    )}
                  >
                    {paket.sira}
                  </span>
                  <Input
                    value={paket.ad ?? ""}
                    onChange={(e) => paketGuncelle(i, { ad: e.target.value })}
                    placeholder={`Paket ${paket.sira} (ad opsiyonel)`}
                    className="h-8 max-w-48"
                  />
                  {secili && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Seçili
                    </span>
                  )}
                  {/* Kapalıyken içerik görünmediği için özet başlıkta durur. */}
                  <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                    {[
                      `${paket.icerik.length} kalem`,
                      paket.genislik && paket.uzunluk
                        ? `${sayiBicim(paket.genislik)}×${sayiBicim(paket.uzunluk)}${
                            paket.yukseklik
                              ? `×${sayiBicim(paket.yukseklik)}`
                              : ""
                          } ${olcuB}`
                        : null,
                      paket.agirlik
                        ? `${sayiBicim(paket.agirlik)} ${agirlikB}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
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

                {/* Koli ölçüleri — başlığın hemen altında, ayrı şerit.
                    Birim paket başına tek: üç ölçü aynı birimi paylaşır,
                    yoksa eni cm boyu mm olan koli çıkar. */}
                {!kapali && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
                    <OlcuAlani
                      etiket="En"
                      birim={olcuB}
                      deger={paket.genislik}
                      onDeger={(v) => paketGuncelle(i, { genislik: v })}
                    />
                    <OlcuAlani
                      etiket="Boy"
                      birim={olcuB}
                      deger={paket.uzunluk}
                      onDeger={(v) => paketGuncelle(i, { uzunluk: v })}
                    />
                    <OlcuAlani
                      etiket="Yükseklik"
                      birim={olcuB}
                      deger={paket.yukseklik}
                      onDeger={(v) => paketGuncelle(i, { yukseklik: v })}
                    />
                    <BirimSecici
                      secenekler={OLCU_BIRIMLERI}
                      deger={olcuB}
                      onDeger={(v) =>
                        paketGuncelle(i, { olcuBirimi: v as OlcuBirimi })
                      }
                    />
                    <span className="mx-1 h-4 w-px bg-border" />
                    <OlcuAlani
                      etiket="Ağırlık"
                      birim={agirlikB}
                      deger={paket.agirlik}
                      onDeger={(v) => paketGuncelle(i, { agirlik: v })}
                    />
                    <BirimSecici
                      secenekler={AGIRLIK_BIRIMLERI}
                      deger={agirlikB}
                      onDeger={(v) =>
                        paketGuncelle(i, {
                          agirlikBirimi: v as AgirlikBirimi,
                        })
                      }
                    />
                  </div>
                )}

                {/* İçerik */}
                {kapali ? null : paket.icerik.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Soldan bileşen sürükleyin ya da bu paket seçiliyken
                    bileşene tıklayın.
                  </p>
                ) : (
                  <div className="divide-y">
                    {paket.icerik.map((satir, j) => (
                      <IcerikSatiri
                        key={j}
                        satir={satir}
                        kaynak={kaynak}
                        posetler={posetler}
                        onMiktar={(m) =>
                          icerikGuncelle(i, j, { ...satir, miktar: m })
                        }
                        onPosetSec={(id) =>
                          icerikGuncelle(i, j, {
                            tip: "poset",
                            posetId: id,
                            miktar: satir.miktar,
                          })
                        }
                        onSil={() => icerikSil(i, j)}
                      />
                    ))}
                  </div>
                )}

                {/* Poşet ekleme — reçetenin dışında olduğu için ayrı */}
                {!kapali && (
                <div className="border-t px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      paketGuncelle(i, {
                        icerik: [
                          ...paket.icerik,
                          { tip: "poset", posetId: "", miktar: 1 },
                        ],
                      })
                    }
                    className="h-7"
                  >
                    <Package className="size-3.5" /> Malzeme Poşeti
                  </Button>
                </div>
                )}
              </div>
            );
          })
        )}

        {paketler.length > 0 && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={paketEkle}
            >
              <Plus className="size-4" /> Paket ekle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Paket içindeki tek satır. Poşette seçim kutusu, bileşende sabit ad. */
function IcerikSatiri({
  satir,
  kaynak,
  posetler,
  onMiktar,
  onPosetSec,
  onSil,
}: {
  satir: PaketIcerik;
  kaynak: { tip: string; id: string; ad: string; birim?: string }[];
  posetler: AdKaydi[];
  onMiktar: (m: number) => void;
  onPosetSec: (id: string) => void;
  onSil: () => void;
}) {
  const ref = icerikRef(satir);
  const posetMi = satir.tip === "poset";
  const kayit = posetMi
    ? posetler.find((p) => p.id === ref)
    : kaynak.find((b) => b.tip === satir.tip && b.id === ref);

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <TurRozeti tip={satir.tip} />
      {posetMi ? (
        <SearchSelect
          items={posetler.map((p) => p.ad)}
          value={kayit?.ad ?? null}
          onValueChange={(ad) =>
            onPosetSec(posetler.find((p) => p.ad === ad)?.id ?? "")
          }
          placeholder="Poşet seçin"
          className="h-8 max-w-64"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs">
          {kayit?.ad ?? ref}
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <MiktarAlani
          deger={satir.miktar}
          birim={kayit && "birim" in kayit ? kayit.birim : undefined}
          onDeger={(m) => onMiktar(m ?? 0)}
          genislik="w-28"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onSil}
          aria-label="Satırı sil"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TurRozeti({ tip }: { tip: PaketIcerik["tip"] | string }) {
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
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        stil,
      )}
    >
      <Ikon className="size-2.5" />
      {etiket}
    </span>
  );
}

/** Birim seçici — paket başına tek birim (mm/cm/m, kg/g). */
function BirimSecici({
  secenekler,
  deger,
  onDeger,
}: {
  secenekler: readonly string[];
  deger: string;
  onDeger: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      {secenekler.map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onDeger(b)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
            deger === b
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {b}
        </button>
      ))}
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
      <MiktarAlani
        deger={deger}
        birim={birim}
        onDeger={onDeger}
        genislik="w-24"
      />
    </label>
  );
}

/**
 * Miktar + birim TEK alanda: birim, input'un içinde sağda sabit ek olarak
 * durur. Ayrı bir metin olarak yanına yazıldığında hangi sayıya ait olduğu
 * dar satırlarda karışıyordu.
 */
function MiktarAlani({
  deger,
  birim,
  onDeger,
  genislik = "w-24",
}: {
  deger?: number;
  birim?: string;
  onDeger: (v: number | undefined) => void;
  genislik?: string;
}) {
  return (
    <InputGroup className={cn("h-8 overflow-hidden", genislik)}>
      <InputGroupInput
        inputMode="decimal"
        value={deger == null ? "" : String(deger)}
        onChange={(e) => onDeger(sayiyaCevir(e.target.value))}
        className="text-right tabular-nums"
      />
      {birim && (
        <InputGroupAddon
          align="inline-end"
          className="h-full w-9 justify-center self-stretch border-l bg-[#fafafa] px-1 text-[11px] font-normal text-muted-foreground"
        >
          {birim}
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
