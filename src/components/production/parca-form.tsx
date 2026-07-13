"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  History,
  Info,
  Layers,
  Plus,
  RockingChair,
  RotateCcw,
  Trash,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/ui/search-select";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { KartBaslik } from "@/components/ui/kart-baslik";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import { TabIcerik } from "@/components/ui/tab-icerik";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatTL,
  type Malzeme,
  type Model,
  type Parca,
  type ParcaKategori,
  type ReceteSatiri,
  type StokDokuman,
} from "@/lib/data";
import type { Istasyon } from "@/lib/fabrika";
import type { ReceteVersiyonGorunum } from "@/lib/db/queries";
import {
  parcaKaydet,
  parcaDokumanKaydet,
  parcaDokumanSil,
  receteGeriYukle,
} from "@/lib/db/actions";
import {
  DokumanlarTab,
  ResimLightbox,
  resimMi,
} from "@/components/stok-karti/stok-kart-form";
import { receteMaliyeti } from "@/components/production/recete-liste";

const KATEGORILER: ParcaKategori[] = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];

type Tab = "genel" | "recete" | "kullanim" | "dokuman" | "versiyon";

function tarihYaz(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Bir parçanın hangi modellere bağlı olduğunu (miktarıyla) modeller listesinden çözer. */
function modelBaglariCoz(
  parcaId: string | undefined,
  modeller: Model[],
): { modelId: string; miktar: number }[] {
  if (!parcaId) return [];
  return modeller
    .filter((m) => (m.parcalar ?? []).some((ps) => ps.parcaId === parcaId))
    .map((m) => ({
      modelId: m.id,
      miktar:
        (m.parcalar ?? []).find((ps) => ps.parcaId === parcaId)?.miktar ?? 1,
    }));
}

function TabBtn({
  aktif,
  onClick,
  disabled,
  disabledTitle,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <SekmeButonu
      aktif={aktif}
      onClick={onClick}
      disabled={disabled}
      disabledTitle={disabledTitle}
      layoutId="parcaTabCizgi"
    >
      <span className="whitespace-nowrap">{children}</span>
    </SekmeButonu>
  );
}

function Metrik({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium tabular-nums">
        {deger}
      </div>
    </div>
  );
}

export function ParcaForm({
  recete,
  parcalar,
  malzemeler,
  modeller,
  versiyonlar: versiyonlarProp,
  istasyonlar = [],
  dokumanlar = [],
}: {
  /** null → yeni parça oluşturma modu */
  recete: Parca | null;
  parcalar: Parca[];
  malzemeler: Malzeme[];
  modeller: Model[];
  versiyonlar: ReceteVersiyonGorunum[];
  istasyonlar?: Istasyon[];
  dokumanlar?: StokDokuman[];
}) {
  const router = useRouter();
  const yeniMi = recete === null;
  const istasyonMap = React.useMemo(
    () => new Map(istasyonlar.map((i) => [i.slug, i])),
    [istasyonlar],
  );
  const ilkIstasyonSlug = istasyonlar[0]?.slug;

  // Header görseli — dokümanlardan (Ürün Resmi öncelikli, yoksa ilk resim).
  const anaGorselDok = React.useMemo(
    () =>
      dokumanlar.find((d) => d.tip === "Ürün Resmi" && resimMi(d.url)) ??
      dokumanlar.find((d) => resimMi(d.url)) ??
      null,
    [dokumanlar],
  );
  const [buyuk, setBuyuk] = React.useState<StokDokuman | null>(null);

  // Yeni parçada doğrudan reçete kurulur → Reçete tabı ile açılır.
  const [tab, setTab] = React.useState<Tab>(recete ? "genel" : "recete");
  const [ad, setAd] = React.useState(recete?.ad ?? "");
  const [kategori, setKategori] = React.useState<ParcaKategori>(
    recete?.kategori ?? "Diğer",
  );
  // Kategori seçenekleri: varsayılanlar + mevcut parçalarda geçenler (+ eklenenler).
  const [kategoriler, setKategoriler] = React.useState<string[]>(() =>
    [...new Set([...KATEGORILER, ...parcalar.map((p) => p.kategori)])].filter(
      Boolean,
    ),
  );
  const [yeniKatAcik, setYeniKatAcik] = React.useState(false);
  const [yeniKat, setYeniKat] = React.useState("");
  function kategoriEkle() {
    const v = yeniKat.trim();
    if (!v) return;
    setKategoriler((l) => (l.includes(v) ? l : [...l, v]));
    setKategori(v);
    setYeniKatAcik(false);
  }
  const [aciklama, setAciklama] = React.useState(recete?.aciklama ?? "");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">(
    recete?.durum ?? "Aktif",
  );
  const [satirlar, setSatirlar] = React.useState<ReceteSatiri[]>(
    recete?.recete.map((r) => ({ ...r, bilesen: { ...r.bilesen } })) ?? [],
  );
  // Bu parçanın bağlı olduğu modeller (Model ağacına eklenir).
  const [bagliModeller, setBagliModeller] = React.useState<
    { modelId: string; miktar: number }[]
  >(() => modelBaglariCoz(recete?.id, modeller));
  const modelMap = React.useMemo(
    () => new Map(modeller.map((m) => [m.id, m])),
    [modeller],
  );
  const [versiyonlar, setVersiyonlar] = React.useState(versiyonlarProp);
  const [acikAltlar, setAcikAltlar] = React.useState<Set<number>>(new Set());
  const [kaydetOnay, setKaydetOnay] = React.useState(false);
  const [degisiklikNotu, setDegisiklikNotu] = React.useState("");
  const [geriYukleNo, setGeriYukleNo] = React.useState<number | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const durumRef = React.useRef<AnimatedIconHandle>(null);
  React.useEffect(() => setVersiyonlar(versiyonlarProp), [versiyonlarProp]);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const parcaMap = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p])),
    [parcalar],
  );

  // ── Kullanım (yayılma uyarısı + sekme) ────────────────────────────────
  const kullanim = React.useMemo(() => {
    if (!recete) return { modeller: [], receteler: [] as string[] };
    const mod: { ad: string; miktar: number }[] = [];
    for (const u of modeller)
      for (const ps of u.parcalar ?? [])
        if (ps.parcaId === recete.id) mod.push({ ad: u.ad, miktar: ps.miktar });
    const rec = parcalar
      .filter(
        (p) =>
          p.id !== recete.id &&
          p.recete.some(
            (r) => r.bilesen.tip === "parca" && r.bilesen.ref === recete.id,
          ),
      )
      .map((p) => p.ad);
    return { modeller: mod, receteler: rec };
  }, [recete, modeller, parcalar]);
  const etkiSayisi = kullanim.modeller.length + kullanim.receteler.length;

  // ── Kirli takibi ──────────────────────────────────────────────────────
  const bagliKey = (arr: { modelId: string; miktar: number }[]) =>
    JSON.stringify(
      arr
        .filter((b) => b.modelId)
        .map((b) => [b.modelId, b.miktar])
        .sort(),
    );
  const kirli = React.useMemo(() => {
    if (yeniMi)
      return (
        ad.trim() !== "" ||
        satirlar.length > 0 ||
        bagliModeller.some((b) => b.modelId)
      );
    if (!recete) return false;
    if (
      ad !== recete.ad ||
      kategori !== recete.kategori ||
      aciklama !== (recete.aciklama ?? "") ||
      durum !== recete.durum
    )
      return true;
    if (bagliKey(bagliModeller) !== bagliKey(modelBaglariCoz(recete.id, modeller)))
      return true;
    const key = (r: ReceteSatiri[]) =>
      JSON.stringify(
        r.map((s) => [
          s.bilesen.tip,
          s.bilesen.ref,
          s.miktar,
          s.fire ?? 0,
          s.istasyon ?? "",
        ]),
      );
    return key(satirlar) !== key(recete.recete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad, kategori, aciklama, durum, satirlar, bagliModeller, recete, yeniMi]);

  // ── Maliyet özeti ─────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.bilesen.ref);
  const toplam = receteMaliyeti(
    gecerli,
    malzemeMap,
    parcaMap,
    new Set(recete ? [recete.id] : []),
  );
  const satirTutari = (s: ReceteSatiri): number => {
    const brut = s.miktar * (1 + (s.fire ?? 0) / 100);
    if (s.bilesen.tip === "malzeme")
      return (malzemeMap.get(s.bilesen.ref)?.birimFiyat ?? 0) * brut;
    const alt = parcaMap.get(s.bilesen.ref);
    return alt
      ? receteMaliyeti(
          alt.recete,
          malzemeMap,
          parcaMap,
          new Set(recete ? [recete.id, alt.id] : [alt.id]),
        ) * brut
      : 0;
  };
  const malzemeToplami = gecerli
    .filter((s) => s.bilesen.tip === "malzeme")
    .reduce((t, s) => t + satirTutari(s), 0);
  const enPahali = [...gecerli]
    .map((s) => ({ s, tutar: satirTutari(s) }))
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, 3);

  const bilesenAd = (tip: "malzeme" | "parca", ref: string) =>
    tip === "malzeme"
      ? (malzemeMap.get(ref)?.ad ?? ref)
      : (parcaMap.get(ref)?.ad ?? ref);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function satirEkle(tip: "malzeme" | "parca") {
    setSatirlar((s) => [
      ...s,
      {
        bilesen: { tip, ref: "" },
        miktar: 1,
        // Malzeme satırı ilk istasyonla (Kesim) dolu başlar; kullanıcı değiştirebilir.
        ...(tip === "malzeme" && ilkIstasyonSlug
          ? { istasyon: ilkIstasyonSlug }
          : {}),
      },
    ]);
    setTab("recete");
  }
  function satirGuncelle(i: number, degisim: Partial<ReceteSatiri>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  // Bağlı model satırları
  function modelEkle() {
    setBagliModeller((b) => [...b, { modelId: "", miktar: 1 }]);
  }
  function modelSec(i: number, ad: string | null) {
    const m = ad ? modeller.find((x) => x.ad === ad) : undefined;
    setBagliModeller((b) =>
      b.map((x, j) => (j === i ? { ...x, modelId: m?.id ?? "" } : x)),
    );
  }
  function modelMiktar(i: number, v: string) {
    const n = Number(v);
    setBagliModeller((b) =>
      b.map((x, j) => (j === i ? { ...x, miktar: isNaN(n) ? 0 : n } : x)),
    );
  }
  function modelBagSil(i: number) {
    setBagliModeller((b) => b.filter((_, j) => j !== i));
  }

  async function kaydetUygula() {
    if (!ad.trim()) {
      toast.error("Parça adı gerekli");
      setTab("genel");
      return;
    }
    setKaydediliyor(true);
    const res = await parcaKaydet(
      {
        id: recete?.id,
        ad: ad.trim(),
        kategori,
        aciklama: aciklama.trim() || undefined,
        durum,
        // Boş kalan malzeme satırlarına ilk istasyonu (Kesim) ata.
        recete: gecerli.map((s) =>
          s.bilesen.tip === "malzeme" && !s.istasyon && ilkIstasyonSlug
            ? { ...s, istasyon: ilkIstasyonSlug }
            : s,
        ),
      },
      degisiklikNotu || undefined,
      bagliModeller.filter((b) => b.modelId),
    );
    setKaydediliyor(false);
    setKaydetOnay(false);
    setDegisiklikNotu("");
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Parça kaydedildi");
    if (yeniMi) router.replace(`/parcalar/${res.id}`);
    else router.refresh();
  }

  function kaydetTikla() {
    if (!ad.trim()) {
      toast.error("Parça adı gerekli");
      setTab("genel");
      return;
    }
    if (etkiSayisi > 0) setKaydetOnay(true);
    else void kaydetUygula();
  }

  async function geriYukle() {
    if (!recete || geriYukleNo === null) return;
    const no = geriYukleNo;
    setGeriYukleNo(null);
    const res = await receteGeriYukle(recete.id, no);
    if (!res.ok) {
      toast.error(res.error ?? "Geri yükleme başarısız.");
      return;
    }
    toast.success(`v${no} geri yüklendi`);
    router.refresh();
  }

  // ── Versiyon diff ─────────────────────────────────────────────────────
  function diff(
    yeni: ReceteVersiyonGorunum["satirlar"],
    eski: ReceteVersiyonGorunum["satirlar"] | undefined,
  ) {
    const key = (s: { tip: string; ref: string }) => `${s.tip}:${s.ref}`;
    const eskiMap = new Map((eski ?? []).map((s) => [key(s), s]));
    const yeniMap = new Map(yeni.map((s) => [key(s), s]));
    return {
      eklenen: yeni.filter((s) => !eskiMap.has(key(s))),
      cikan: (eski ?? []).filter((s) => !yeniMap.has(key(s))),
      degisen: yeni.filter((s) => {
        const e = eskiMap.get(key(s));
        return (
          e &&
          (e.miktar !== s.miktar ||
            (e.fire ?? 0) !== (s.fire ?? 0) ||
            (e.istasyon ?? "") !== (s.istasyon ?? ""))
        );
      }),
    };
  }

  const kod = recete?.id ?? "PRC-…";
  const kayitLazim = yeniMi;
  const kayitIpucu = "Parça kaydedildikten sonra dolar";

  return (
    <div className="flex flex-col gap-4">
      {/* İnce aksiyon çubuğu */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/stok-yonetimi?bolum=parcalar" aria-label="Parçalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {yeniMi ? "Yeni Parça" : "Parçayı Düzenle"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {etkiSayisi > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="size-3.5" /> {etkiSayisi} yerde kullanılıyor
            </span>
          )}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/stok-yonetimi?bolum=parcalar" />}
          >
            İptal
          </Button>
          <Button onClick={kaydetTikla} disabled={!kirli || kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Canlı şerit */}
      <div className="overflow-hidden rounded-xl border bg-gradient-to-r from-violet-50 via-card to-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            {anaGorselDok && (
              <button
                type="button"
                onClick={() => setBuyuk(anaGorselDok)}
                className="shrink-0 cursor-zoom-in overflow-hidden rounded-lg border transition-transform hover:scale-105"
                aria-label={`${ad || "Parça"} — büyüt`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={anaGorselDok.url}
                  alt={ad || "Parça"}
                  className="size-14 object-cover"
                />
              </button>
            )}
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <input
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Parça adı..."
                aria-label="Parça adı"
                className="min-w-0 flex-1 rounded bg-transparent text-lg leading-tight font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/50 focus:bg-background/60 focus:px-1 focus:ring-1 focus:ring-ring/20"
              />
              <span aria-hidden className="h-4 w-px bg-border" />
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                {kod}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="bg-violet-100 text-violet-800">
                {kategori}
              </Badge>
              {durum === "Pasif" && (
                <Badge variant="secondary" className="bg-muted">
                  Pasif
                </Badge>
              )}
            </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            <Metrik etiket="Birim Maliyet" deger={formatTL(toplam)} />
            <Metrik etiket="Bileşen" deger={`${gecerli.length} satır`} />
            {!yeniMi && (
              <Metrik etiket="Kullanım" deger={`${etkiSayisi} yer`} />
            )}
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="relative -mb-px flex flex-wrap gap-1 border-b">
        <TabBtn aktif={tab === "genel"} onClick={() => setTab("genel")}>
          Genel
        </TabBtn>
        <TabBtn aktif={tab === "recete"} onClick={() => setTab("recete")}>
          Reçete{gecerli.length ? ` (${gecerli.length})` : ""}
        </TabBtn>
        <TabBtn
          aktif={tab === "kullanim"}
          onClick={() => setTab("kullanim")}
          disabled={kayitLazim}
          disabledTitle={kayitIpucu}
        >
          Kullanım{!yeniMi && etkiSayisi ? ` (${etkiSayisi})` : ""}
        </TabBtn>
        <TabBtn
          aktif={tab === "dokuman"}
          onClick={() => setTab("dokuman")}
          disabled={kayitLazim}
          disabledTitle={kayitIpucu}
        >
          Dokümanlar{!yeniMi && dokumanlar.length ? ` (${dokumanlar.length})` : ""}
        </TabBtn>
        <TabBtn
          aktif={tab === "versiyon"}
          onClick={() => setTab("versiyon")}
          disabled={kayitLazim}
          disabledTitle={kayitIpucu}
        >
          Versiyon{!yeniMi && versiyonlar.length ? ` (${versiyonlar.length})` : ""}
        </TabBtn>
      </div>

      <TabIcerik tabKey={tab}>
        {/* ── GENEL ─────────────────────────────────────────────── */}
        {tab === "genel" && (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {/* Sol: Genel bilgiler + durum */}
            <div className="rounded-md border bg-card">
              <KartBaslik ikon={Info} baslik="Genel" />
              <div className="grid gap-3 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <IconInput
                      label="Parça Adı"
                      icon={BlocksIcon}
                      placeholder="Örn. Komidin 2 Çekmeceli"
                      value={ad}
                      onChange={(e) => setAd(e.target.value)}
                    />
                    <IconInput
                      label="Kod"
                      icon={ScanTextIcon}
                      placeholder="Otomatik (PRC-####)"
                      value={recete?.id ?? ""}
                      readOnly
                      className="text-muted-foreground"
                    />
                  </div>
                  <AnimatedField label="Kategori" icon={FolderOpenIcon}>
                    <SearchSelect
                      items={kategoriler}
                      value={kategori}
                      onValueChange={(v) => setKategori(v ?? "Diğer")}
                      placeholder="Kategori"
                      addLabel="Yeni kategori ekle"
                      onAdd={() => {
                        setYeniKat("");
                        setYeniKatAcik(true);
                      }}
                    />
                  </AnimatedField>
                  <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
                    <textarea
                      rows={3}
                      placeholder="Kısa açıklama..."
                      value={aciklama}
                      onChange={(e) => setAciklama(e.target.value)}
                      className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                    />
                  </AnimatedField>

                  {/* Durum — Genel kartın içinde satır */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setDurum((d) => (d === "Aktif" ? "Pasif" : "Aktif"))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDurum((d) => (d === "Aktif" ? "Pasif" : "Aktif"));
                      }
                    }}
                    onMouseEnter={() => durumRef.current?.startAnimation()}
                    onMouseLeave={() => durumRef.current?.stopAnimation()}
                    className="mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <CircleCheckIcon
                        ref={durumRef}
                        size={15}
                        className="text-muted-foreground"
                      />
                      Durum
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {durum}
                      </span>
                      <Switch
                        checked={durum === "Aktif"}
                        className="pointer-events-none data-checked:bg-emerald-600"
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Sağ: Bağlı Modeller — bu parça seçilen modellerin ağacına eklenir */}
              <div className="rounded-md border bg-card">
                <KartBaslik
                  ikon={RockingChair}
                  baslik="Bağlı Modeller"
                  sag={
                    <span className="text-xs text-muted-foreground">
                      {bagliModeller.filter((b) => b.modelId).length} model
                    </span>
                  }
                />
                <div className="grid gap-2 p-4">
                  {bagliModeller.length > 0 && (
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>Model</TableHead>
                            <TableHead className="w-24 text-right">
                              Adet
                            </TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bagliModeller.map((b, i) => {
                            const secili = modelMap.get(b.modelId);
                            const diger = new Set(
                              bagliModeller
                                .filter((_, j) => j !== i)
                                .map((x) => x.modelId)
                                .filter(Boolean),
                            );
                            const items = modeller
                              .filter((m) => !diger.has(m.id))
                              .map((m) => m.ad);
                            return (
                              <TableRow key={i}>
                                <TableCell>
                                  <SearchSelect
                                    items={items}
                                    value={secili?.ad ?? null}
                                    onValueChange={(v) => modelSec(i, v)}
                                    placeholder="Model seç"
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={b.miktar}
                                    onChange={(e) => modelMiktar(i, e.target.value)}
                                    className="h-8 w-20 text-right tabular-nums"
                                  />
                                </TableCell>
                                <TableCell>
                                  <button
                                    type="button"
                                    onClick={() => modelBagSil(i)}
                                    aria-label="Kaldır"
                                    className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash className="size-3.5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={modelEkle}
                    disabled={
                      bagliModeller.filter((b) => b.modelId).length >=
                      modeller.length
                    }
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="size-3.5" /> Model ekle
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Bu parça, seçilen modellerin ağacına verilen adetle eklenir.
                  </p>
                </div>
              </div>
          </div>
        )}

        {/* ── REÇETE (BOM) ──────────────────────────────────────── */}
        {tab === "recete" && (
          <div className="flex flex-col gap-3 xl:flex-row">
            {/* Sol: bileşen grid'i */}
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-md border bg-card">
                <div className="grid grid-cols-[88px_1fr_130px_90px_56px_72px_100px_36px] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-foreground">
                  <span>Tip</span>
                  <span>Bileşen</span>
                  <span>İstasyon</span>
                  <span className="text-right">Miktar</span>
                  <span>Birim</span>
                  <span className="text-right">Fire %</span>
                  <span className="text-right">Tutar</span>
                  <span />
                </div>
                <div className="divide-y">
                  {satirlar.map((s, i) => {
                    const malzeme =
                      s.bilesen.tip === "malzeme"
                        ? malzemeMap.get(s.bilesen.ref)
                        : undefined;
                    const alt =
                      s.bilesen.tip === "parca"
                        ? parcaMap.get(s.bilesen.ref)
                        : undefined;
                    const acik = acikAltlar.has(i);
                    return (
                      <React.Fragment key={i}>
                        <div className="grid grid-cols-[88px_1fr_130px_90px_56px_72px_100px_36px] items-center gap-2 px-3 py-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "justify-center",
                              s.bilesen.tip === "malzeme"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-violet-100 text-violet-800",
                            )}
                          >
                            {s.bilesen.tip === "malzeme" ? "Malzeme" : "Parça"}
                          </Badge>
                          <div className="flex min-w-0 items-center gap-1">
                            {alt && (
                              <button
                                type="button"
                                aria-label={acik ? "Kapat" : "İçini göster"}
                                onClick={() =>
                                  setAcikAltlar((a) => {
                                    const n = new Set(a);
                                    if (n.has(i)) n.delete(i);
                                    else n.add(i);
                                    return n;
                                  })
                                }
                                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <ChevronRight
                                  className={cn(
                                    "size-4 transition-transform",
                                    acik && "rotate-90",
                                  )}
                                />
                              </button>
                            )}
                            <div className="min-w-0 flex-1">
                              <SearchSelect
                                items={
                                  s.bilesen.tip === "malzeme"
                                    ? malzemeler.map((m) => m.ad)
                                    : parcalar
                                        .filter((p) => p.id !== recete?.id)
                                        .map((p) => p.ad)
                                }
                                value={
                                  s.bilesen.ref
                                    ? bilesenAd(s.bilesen.tip, s.bilesen.ref)
                                    : null
                                }
                                onValueChange={(adSecim) => {
                                  const ref =
                                    s.bilesen.tip === "malzeme"
                                      ? malzemeler.find((m) => m.ad === adSecim)
                                          ?.id
                                      : parcalar.find((p) => p.ad === adSecim)
                                          ?.id;
                                  satirGuncelle(i, {
                                    bilesen: { ...s.bilesen, ref: ref ?? "" },
                                  });
                                }}
                                placeholder={
                                  s.bilesen.tip === "malzeme"
                                    ? "Malzeme seçin"
                                    : "Parça seçin"
                                }
                                className="h-8"
                              />
                            </div>
                          </div>
                          {s.bilesen.tip === "malzeme" ? (
                            <SearchSelect
                              items={istasyonlar.map((x) => x.ad)}
                              value={
                                istasyonMap.get(
                                  s.istasyon ?? ilkIstasyonSlug ?? "",
                                )?.ad ?? null
                              }
                              onValueChange={(ad) =>
                                satirGuncelle(i, {
                                  istasyon: istasyonlar.find((x) => x.ad === ad)
                                    ?.slug,
                                })
                              }
                              placeholder="İstasyon"
                              className="h-8"
                            />
                          ) : (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Alt parçanın tüketim yerleri kendi satırlarından gelir"
                            >
                              kendi reçetesi
                            </span>
                          )}
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={s.miktar}
                            onChange={(e) =>
                              satirGuncelle(i, {
                                miktar: Number(e.target.value),
                              })
                            }
                            className="h-8 text-right tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">
                            {s.bilesen.tip === "malzeme"
                              ? (malzeme?.birim ?? "—")
                              : "adet"}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            step="any"
                            value={s.fire ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              satirGuncelle(i, {
                                fire: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              })
                            }
                            className="h-8 text-right tabular-nums"
                          />
                          <span className="text-right text-xs text-muted-foreground tabular-nums">
                            {formatTL(satirTutari(s))}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Satırı kaldır"
                            onClick={() =>
                              setSatirlar((x) => x.filter((_, j) => j !== i))
                            }
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>

                        {/* Alt parça patlatması (salt okunur) */}
                        {alt && acik && (
                          <div className="bg-muted/40 px-3 py-2">
                            {alt.recete.length === 0 ? (
                              <p className="pl-9 text-xs text-muted-foreground">
                                Bu parçanın bileşeni yok.
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-1 pl-9">
                                {alt.recete.map((ar, j) => (
                                  <li
                                    key={j}
                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                  >
                                    <span className="truncate">
                                      {bilesenAd(ar.bilesen.tip, ar.bilesen.ref)}
                                      {ar.bilesen.tip === "parca" && " (parça)"}
                                    </span>
                                    <span className="tabular-nums">
                                      {ar.miktar}
                                      {ar.fire ? ` (+%${ar.fire} fire)` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <Link
                              href={`/parcalar/${alt.id}`}
                              className="mt-1.5 inline-block pl-9 text-xs text-foreground underline-offset-4 hover:underline"
                            >
                              Parçayı aç →
                            </Link>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {satirlar.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      Henüz bileşen yok — aşağıdan malzeme veya alt parça ekleyin.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 border-t bg-muted/40 px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => satirEkle("malzeme")}
                  >
                    <Plus className="size-3.5" /> Malzeme
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => satirEkle("parca")}
                  >
                    <Plus className="size-3.5" /> Alt Parça
                  </Button>
                </div>
              </div>
            </div>

            {/* Sağ: maliyet özeti */}
            <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
              <div className="rounded-md border bg-card p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Maliyet Özeti
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {formatTL(toplam)}
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Malzemeler</span>
                    <span className="tabular-nums">
                      {formatTL(malzemeToplami)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Alt parçalar</span>
                    <span className="tabular-nums">
                      {formatTL(toplam - malzemeToplami)}
                    </span>
                  </div>
                </div>
                {enPahali.length > 0 && (
                  <>
                    <div className="my-3 h-px bg-border" />
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      En Maliyetli
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {enPahali.map(({ s, tutar }, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">
                            {bilesenAd(s.bilesen.tip, s.bilesen.ref)}
                          </span>
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {toplam > 0 ? Math.round((tutar / toplam) * 100) : 0}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── KULLANIM ──────────────────────────────────────────── */}
        {tab === "kullanim" && (
          <div className="rounded-md border bg-card">
            <KartBaslik ikon={Layers} baslik="Kullanım" />
            <div className="p-4">
              {etkiSayisi === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Henüz hiçbir model veya parçada kullanılmıyor.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {kullanim.modeller.map((m) => (
                    <li
                      key={m.ad}
                      className="flex items-center justify-between border-b py-1.5 last:border-0"
                    >
                      <span className="truncate">{m.ad}</span>
                      <span className="text-xs text-muted-foreground">
                        model · ×{m.miktar}
                      </span>
                    </li>
                  ))}
                  {kullanim.receteler.map((adx) => (
                    <li
                      key={adx}
                      className="flex items-center justify-between border-b py-1.5 last:border-0"
                    >
                      <span className="truncate">{adx}</span>
                      <span className="text-xs text-muted-foreground">
                        alt parça
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── DOKÜMANLAR ────────────────────────────────────────── */}
        {tab === "dokuman" && recete && (
          <DokumanlarTab
            stokId={recete.id}
            kayitlar={dokumanlar}
            klasor={`parca-${recete.id}`}
            kaydetFn={parcaDokumanKaydet}
            silFn={parcaDokumanSil}
          />
        )}

        {/* ── VERSİYON ──────────────────────────────────────────── */}
        {tab === "versiyon" && (
          <div className="rounded-md border bg-card">
            <KartBaslik ikon={History} baslik="Versiyon Geçmişi" />
            <div className="flex flex-col divide-y p-4 pt-2">
              {versiyonlar.map((v, i) => {
                const onceki = versiyonlar[i + 1];
                const d = diff(v.satirlar, onceki?.satirlar);
                const guncel = i === 0;
                return (
                  <div key={v.versiyonNo} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={guncel ? "default" : "secondary"}
                          className="tabular-nums"
                        >
                          v{v.versiyonNo}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {tarihYaz(v.tarih)}
                        </span>
                      </div>
                      {!guncel && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Bu versiyona dön"
                          title="Bu versiyona dön"
                          onClick={() => setGeriYukleNo(v.versiyonNo)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    {v.aciklama && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        {v.aciklama}
                      </p>
                    )}
                    <div className="mt-1 flex flex-col gap-0.5 text-xs">
                      {d.eklenen.map((s) => (
                        <span key={`e${s.ref}`} className="text-emerald-600">
                          + {bilesenAd(s.tip, s.ref)} × {s.miktar}
                        </span>
                      ))}
                      {d.cikan.map((s) => (
                        <span key={`c${s.ref}`} className="text-rose-600">
                          − {bilesenAd(s.tip, s.ref)} × {s.miktar}
                        </span>
                      ))}
                      {d.degisen.map((s) => {
                        const e = onceki?.satirlar.find(
                          (x) => x.tip === s.tip && x.ref === s.ref,
                        );
                        return (
                          <span key={`d${s.ref}`} className="text-amber-600">
                            ~ {bilesenAd(s.tip, s.ref)}: {e?.miktar}
                            {e?.fire ? ` (%${e.fire})` : ""} → {s.miktar}
                            {s.fire ? ` (%${s.fire})` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {versiyonlar.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Henüz versiyon yok — ilk kayıtla v1 oluşur.
                </p>
              )}
            </div>
          </div>
        )}
      </TabIcerik>

      {/* Yayılma uyarısı */}
      <Dialog open={kaydetOnay} onOpenChange={setKaydetOnay}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500" /> Değişiklik
              Yayılacak
            </DialogTitle>
            <DialogDescription>
              Bu parça{" "}
              <strong>
                {kullanim.modeller.length} model ve {kullanim.receteler.length}{" "}
                parçada
              </strong>{" "}
              kullanılıyor; maliyetleri bu değişiklikten etkilenecek.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Değişiklik notu (opsiyonel)"
            value={degisiklikNotu}
            onChange={(e) => setDegisiklikNotu(e.target.value)}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKaydetOnay(false)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kaydetUygula} disabled={kaydediliyor}>
              {kaydediliyor ? "Kaydediliyor..." : "Kaydet ve Uygula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geri yükleme onayı */}
      <Dialog
        open={geriYukleNo !== null}
        onOpenChange={(v) => !v && setGeriYukleNo(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RotateCcw className="size-4 text-muted-foreground" /> Versiyona Dön
            </DialogTitle>
            <DialogDescription>
              Parça v{geriYukleNo} sürümündeki haline döndürülecek. Bu işlem de
              yeni bir versiyon olarak kaydedilir; geçmiş kaybolmaz.
              {etkiSayisi > 0 && <> Değişiklik {etkiSayisi} yeri etkileyecek.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGeriYukleNo(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={geriYukle}>
              <RotateCcw className="size-3.5" /> Geri Yükle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni kategori */}
      <Dialog open={yeniKatAcik} onOpenChange={setYeniKatAcik}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Kategori</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Örn. Baza"
            value={yeniKat}
            onChange={(e) => setYeniKat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                kategoriEkle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniKatAcik(false)}>
              İptal
            </Button>
            <Button onClick={kategoriEkle} disabled={!yeniKat.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {buyuk && (
        <ResimLightbox
          resimler={dokumanlar.filter((d) => resimMi(d.url))}
          aktifId={buyuk.id}
          onKapat={() => setBuyuk(null)}
        />
      )}
    </div>
  );
}
