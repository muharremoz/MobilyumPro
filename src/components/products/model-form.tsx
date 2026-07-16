"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash,
  Plus,
  Info,
  Layers,
  Boxes,
  Blocks,
  Banknote,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { ErrorShakeField } from "@/components/ui/error-shake";
import { KartBaslik } from "@/components/ui/kart-baslik";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import { TabIcerik } from "@/components/ui/tab-icerik";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { BadgeAlertIcon } from "@/components/ui/icons/badge-alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTL,
  formatTarih,
  type Malzeme,
  type Parca,
  type ParcaSatiri,
  type Model,
  type ModelVaryant,
  type StokGrup,
  type StokHareket,
  type StokHareketTuru,
  type StokDokuman,
} from "@/lib/data";
import { GrupSecici } from "@/components/ui/grup-secici";
import {
  DokumanlarTab,
  ResimLightbox,
  resimMi,
} from "@/components/stok-karti/stok-kart-form";
import { cn } from "@/lib/utils";
import { modelIhtiyacDokumu } from "@/lib/bom";
import { paraDegeri, paraMaskele, paraMetni } from "@/lib/para";
import { ISTASYON_MAP } from "@/lib/fabrika";
import { modelKaydet, modelKodOnizle, tanimKaydet } from "@/lib/db/actions";

type Tab = "genel" | "recete" | "varyant" | "resim" | "analiz";

type Form = {
  ad: string;
  id: string;
  kategori: string;
  marka: string;
  barkod: string;
  fiyat: string;
  minStok: string;
  agirlik: string;
  durum: "Aktif" | "Pasif";
};

const bos: Form = {
  ad: "",
  id: "",
  kategori: "",
  marka: "",
  barkod: "",
  fiyat: "",
  minStok: "",
  agirlik: "",
  durum: "Aktif",
};

const sayi = (n: number, hane = 2) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: hane });

/** Bölüm kartı — KartBaslik + gövde (stok kartı formuyla aynı iskelet). */
function Kart({
  baslik,
  ikon,
  sag,
  children,
}: {
  baslik: string;
  ikon: React.ComponentProps<typeof KartBaslik>["ikon"];
  sag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card">
      <KartBaslik ikon={ikon} baslik={baslik} sag={sag} />
      <div className="grid gap-3 p-4">{children}</div>
    </div>
  );
}

function TabBtn({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <SekmeButonu aktif={aktif} onClick={onClick} layoutId="modelTabCizgi">
      <span className="whitespace-nowrap">{children}</span>
    </SekmeButonu>
  );
}

/** Şeritteki mini metrik (etiket + değer). */
function Metrik({
  etiket,
  deger,
  className,
}: {
  etiket: string;
  deger: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div className={cn("mt-0.5 truncate text-sm font-medium tabular-nums", className)}>
        {deger}
      </div>
    </div>
  );
}

/* ── Stok Analiz (edit modunda okuma sekmesi) ──────────────────── */
const TUR_RENK: Record<StokHareketTuru, string> = {
  Giriş: "bg-emerald-100 text-emerald-800",
  Çıkış: "bg-rose-100 text-rose-800",
  Transfer: "bg-blue-100 text-blue-800",
};
const TUR_IKON: Record<StokHareketTuru, React.ReactNode> = {
  Giriş: <ArrowDownToLine className="size-3.5" />,
  Çıkış: <ArrowUpFromLine className="size-3.5" />,
  Transfer: <Repeat className="size-3.5" />,
};
const turDelta = (t: StokHareketTuru, m: number) =>
  t === "Giriş" ? m : t === "Çıkış" ? -m : 0;

function OzetKutu({
  etiket,
  deger,
  tone,
}: {
  etiket: string;
  deger: string;
  tone?: "emerald" | "rose";
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "emerald" && "text-emerald-600",
          tone === "rose" && "text-rose-600",
        )}
      >
        {deger}
      </div>
    </div>
  );
}

function ModelAnaliz({
  product,
  hareketler: tumHareketler,
}: {
  product: Model;
  hareketler: StokHareket[];
}) {
  const hareketler = React.useMemo(() => {
    const arr = tumHareketler
      .filter((h) => h.ref.tip === "model" && h.ref.id === product.id)
      .sort((a, b) => a.tarih.localeCompare(b.tarih));
    const net = arr.reduce((s, h) => s + turDelta(h.tur, h.miktar), 0);
    let bakiye = product.stok - net;
    return arr
      .map((h) => {
        bakiye += turDelta(h.tur, h.miktar);
        return { ...h, bakiye };
      })
      .reverse();
  }, [product, tumHareketler]);

  const giris = hareketler
    .filter((h) => h.tur === "Giriş")
    .reduce((t, h) => t + h.miktar, 0);
  const cikis = hareketler
    .filter((h) => h.tur === "Çıkış")
    .reduce((t, h) => t + h.miktar, 0);
  const deger = product.fiyat * product.stok;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <OzetKutu etiket="Mevcut Stok" deger={String(product.stok)} />
        <OzetKutu etiket="Toplam Giriş" deger={String(giris)} tone="emerald" />
        <OzetKutu etiket="Toplam Çıkış" deger={String(cikis)} tone="rose" />
        <OzetKutu etiket="Stok Değeri" deger={formatTL(deger)} />
      </div>

      <div className="rounded-md border bg-card">
        <KartBaslik
          ikon={History}
          baslik="Son Hareketler"
          sag={
            <span className="text-xs text-muted-foreground">
              {hareketler.length} hareket
            </span>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Belge</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead className="text-right">Bakiye</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hareketler.map((h) => {
              const d = turDelta(h.tur, h.miktar);
              return (
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
                        {TUR_IKON[h.tur]}
                      </span>
                      {h.tur}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      d > 0 && "text-emerald-600",
                      d < 0 && "text-rose-600",
                    )}
                  >
                    {d > 0 ? `+${h.miktar}` : d < 0 ? `−${h.miktar}` : h.miktar}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {h.bakiye}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.depo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {h.aciklama}
                  </TableCell>
                </TableRow>
              );
            })}
            {hareketler.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-20 text-center text-muted-foreground"
                >
                  Bu model için kayıtlı hareket yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ModelForm({
  product,
  parcalar,
  malzemeler,
  gruplar = [],
  markalar: markalarProp,
  renkler = [],
  kumaslar = [],
  hareketler = [],
  dokumanlar = [],
}: {
  product?: Model;
  parcalar: Parca[];
  malzemeler: Malzeme[];
  /** Stok grup ağacı (Grup seçimi bu ağaçtan yapılır). */
  gruplar?: StokGrup[];
  markalar: string[];
  /** Varyant seçenekleri (Tanımlamalar → Renkler / Kumaşlar). */
  renkler?: string[];
  kumaslar?: string[];
  /** Stok hareketleri (yalnız düzenlemede — Stok Analiz sekmesi). */
  hareketler?: StokHareket[];
  /** Model dokümanları (malzeme kartıyla aynı sistem; yalnız düzenlemede). */
  dokumanlar?: StokDokuman[];
}) {
  const router = useRouter();
  const duzenleme = !!product;
  const baslangic: Form = product
    ? {
        ad: product.ad,
        id: product.id,
        kategori: product.kategori,
        marka: product.marka ?? "",
        barkod: product.barkod ?? "",
        fiyat: paraMetni(product.fiyat),
        minStok: product.minStok ? String(product.minStok) : "",
        agirlik: product.agirlik ? String(product.agirlik) : "",
        durum: product.durum,
      }
    : bos;
  const [form, setForm] = React.useState<Form>(baslangic);
  const [tab, setTab] = React.useState<Tab>("genel");
  // Yeni modelde kod/barkod seçilen grubun kodundan üretilir (canlı önizleme).
  const [onizleme, setOnizleme] = React.useState<{
    kod: string;
    barkod: string;
  }>({ kod: "", barkod: "" });
  React.useEffect(() => {
    if (duzenleme) return;
    const grupKod = gruplar.find((g) => g.ad === form.kategori)?.kod ?? "";
    if (!grupKod) {
      setOnizleme({ kod: "", barkod: "" });
      return;
    }
    let iptal = false;
    modelKodOnizle(grupKod).then((r) => {
      if (!iptal) setOnizleme(r);
    });
    return () => {
      iptal = true;
    };
  }, [form.kategori, gruplar, duzenleme]);
  const [markalar, setMarkalar] = React.useState(markalarProp);
  const [tanimTip, setTanimTip] = React.useState<"marka" | null>(null);
  const [yeniTanim, setYeniTanim] = React.useState("");
  const [urunParcalar, setUrunParcalar] = React.useState<ParcaSatiri[]>(
    product?.parcalar ? [...product.parcalar] : [],
  );
  // Ana görsel dokümanlardan gelir (malzeme kartıyla aynı sistem).
  const anaGorselDok = React.useMemo(
    () =>
      dokumanlar.find((d) => d.tip === "Ürün Resmi" && resimMi(d.url)) ??
      dokumanlar.find((d) => resimMi(d.url)) ??
      null,
    [dokumanlar],
  );
  const [buyuk, setBuyuk] = React.useState<StokDokuman | null>(null);
  const [varyantlar, setVaryantlar] = React.useState<ModelVaryant[]>(
    product?.varyantlar ? [...product.varyantlar] : [],
  );
  const [hatalar, setHatalar] = React.useState<{
    ad?: string;
    kategori?: string;
  }>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  const set = (k: keyof Form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "ad" || k === "kategori")
      setHatalar((h) => ({ ...h, [k]: undefined }));
  };

  async function kaydet() {
    const h: typeof hatalar = {};
    if (!form.ad.trim()) h.ad = "Model adı zorunludur.";
    if (!form.kategori.trim()) h.kategori = "Grup zorunludur.";
    if (h.ad || h.kategori) {
      setHatalar(h);
      setShakeNonce((n) => n + 1);
      setTab("genel");
      return;
    }
    setKaydediliyor(true);
    const u: Model = {
      id: duzenleme ? form.id : onizleme.kod,
      ad: form.ad.trim(),
      kategori: form.kategori,
      fiyat: paraDegeri(form.fiyat),
      // Mamul stoğu üretimden (ledger) gelir; formdan elle girilmez.
      stok: product?.stok ?? 0,
      durum: form.durum,
      parcalar: urunParcalar.filter((p) => p.parcaId),
      marka: form.marka.trim() || undefined,
      barkod: (duzenleme ? form.barkod.trim() : onizleme.barkod) || undefined,
      agirlik: form.agirlik ? Number(form.agirlik) : undefined,
      minStok: form.minStok ? Number(form.minStok) : undefined,
      varyantlar: varyantlar.length ? varyantlar : undefined,
    };
    const res = await modelKaydet(u);
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error("Model kaydedilemedi");
      return;
    }
    toast.success(duzenleme ? "Model güncellendi" : "Model eklendi");
    router.push("/urunler");
  }

  async function tanimEkle() {
    const v = yeniTanim.trim();
    if (!v) {
      toast.error("Marka adı gerekli");
      return;
    }
    setMarkalar((m) => (m.includes(v) ? m : [...m, v]));
    set("marka")(v);
    setTanimTip(null);
    const res = await tanimKaydet("marka", { ad: v, durum: "Aktif" });
    if (!res.ok) toast.error(res.error ?? "Marka tanımı kaydedilemedi.");
  }

  // Reçete satırları
  function satirEkle() {
    setUrunParcalar((ps) => [...ps, { parcaId: "", miktar: 1 }]);
  }
  function satirParcaSec(i: number, v: string | null) {
    if (!v) return;
    const p = parcalar.find((x) => x.ad === v);
    if (!p) return;
    setUrunParcalar((ps) =>
      ps.map((x, j) => (j === i ? { ...x, parcaId: p.id } : x)),
    );
  }
  function parcaMiktar(i: number, v: string) {
    const n = Number(v);
    setUrunParcalar((ps) =>
      ps.map((x, j) => (j === i ? { ...x, miktar: isNaN(n) ? 0 : n } : x)),
    );
  }
  function parcaSil(i: number) {
    const silinenId = urunParcalar[i]?.parcaId;
    setUrunParcalar((ps) => ps.filter((_, j) => j !== i));
    if (silinenId)
      setDokumSecim((s) => {
        const n = new Set(s);
        n.delete(silinenId);
        return n;
      });
  }

  // Varyantlar (renk × kumaş)
  function varyantSatirEkle() {
    setVaryantlar((v) => [
      ...v,
      { id: `VRY-${Date.now()}-${v.length}`, renk: "", kumas: "", ekFiyat: 0 },
    ]);
  }
  function varyantGuncelle(i: number, alan: Partial<ModelVaryant>) {
    setVaryantlar((v) => v.map((x, j) => (j === i ? { ...x, ...alan } : x)));
  }
  function varyantSil(i: number) {
    setVaryantlar((v) => v.filter((_, j) => j !== i));
  }

  // Canlı malzeme patlatması — fire dahil, istasyon kırılımlı, stok karşılaştırmalı.
  const seciliParcalar = urunParcalar.filter((p) => p.parcaId && p.miktar > 0);
  const dokum = React.useMemo(
    () => modelIhtiyacDokumu(seciliParcalar, parcalar, malzemeler),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(seciliParcalar), parcalar, malzemeler],
  );
  // Malzeme İhtiyacı odağı: işaretli parçalar (boşsa tüm model gösterilir).
  const [dokumSecim, setDokumSecim] = React.useState<Set<string>>(new Set());
  function dokumSecimToggle(parcaId: string, v: boolean) {
    setDokumSecim((s) => {
      const n = new Set(s);
      if (v) n.add(parcaId);
      else n.delete(parcaId);
      return n;
    });
  }
  const dokumGoster = React.useMemo(() => {
    const hedef = dokumSecim.size
      ? seciliParcalar.filter((p) => dokumSecim.has(p.parcaId))
      : seciliParcalar;
    return modelIhtiyacDokumu(hedef, parcalar, malzemeler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(seciliParcalar), dokumSecim, parcalar, malzemeler]);
  const toplamMaliyet = dokum.reduce((t, m) => t + m.tutar, 0);
  const eksikSayisi = dokum.filter((d) => d.brutMiktar > d.malzeme.stok).length;
  const satisFiyati = paraDegeri(form.fiyat);
  const marj =
    satisFiyati > 0 && toplamMaliyet > 0
      ? ((satisFiyati - toplamMaliyet) / satisFiyati) * 100
      : null;

  const SEKMELER: { key: Tab; etiket: string; sayac?: number }[] = [
    { key: "genel", etiket: "Genel" },
    {
      key: "recete",
      etiket: "Parçalar & Maliyet",
      sayac: seciliParcalar.length || undefined,
    },
    {
      key: "varyant",
      etiket: "Varyantlar",
      sayac: varyantlar.length || undefined,
    },
    ...(duzenleme
      ? [
          {
            key: "resim" as Tab,
            etiket: "Dokümanlar",
            sayac: dokumanlar.length || undefined,
          },
          { key: "analiz" as Tab, etiket: "Stok Analiz" },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* İnce aksiyon çubuğu — geri + İptal/Kaydet (kimlik şeritte) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/urunler" aria-label="Geri" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {duzenleme ? "Modeli Düzenle" : "Yeni Model"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/urunler" />}
          >
            İptal
          </Button>
          <Button onClick={kaydet} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Canlı şerit — alanlar doldukça güncellenir (stok kartıyla aynı dil) */}
      <div className="overflow-hidden rounded-xl border bg-gradient-to-r from-emerald-50 via-card to-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            {anaGorselDok && (
              <button
                type="button"
                onClick={() => setBuyuk(anaGorselDok)}
                className="shrink-0 cursor-zoom-in overflow-hidden rounded-lg border transition-transform hover:scale-105"
                aria-label={`${form.ad || "Model"} — büyüt`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={anaGorselDok.url}
                  alt={form.ad || "Model"}
                  className="size-14 object-cover"
                />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <h2 className="truncate text-lg leading-tight font-semibold">
                  {form.ad.trim() || "Yeni Model"}
                </h2>
                <span aria-hidden className="h-4 w-px bg-border" />
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {(duzenleme ? form.id : onizleme.kod) || "Kod: grup seçin"}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700"
                >
                  Mamül
                </Badge>
                {form.kategori && (
                  <Badge variant="outline" className="font-normal">
                    {form.kategori}
                  </Badge>
                )}
                {form.marka && (
                  <Badge variant="outline" className="font-normal">
                    {form.marka}
                  </Badge>
                )}
                {form.durum === "Pasif" && (
                  <Badge variant="secondary" className="bg-muted">
                    Pasif
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {(satisFiyati > 0 || toplamMaliyet > 0 || marj !== null) && (
            <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
              {satisFiyati > 0 && (
                <Metrik etiket="Satış Fiyatı" deger={`₺${sayi(satisFiyati, 0)}`} />
              )}
              {toplamMaliyet > 0 && (
                <Metrik
                  etiket="Birim Maliyet"
                  deger={`₺${sayi(toplamMaliyet, 0)}`}
                />
              )}
              {marj !== null && (
                <Metrik
                  etiket="Marj"
                  deger={`%${sayi(marj, 1)}`}
                  className={marj < 0 ? "text-rose-600" : "text-emerald-600"}
                />
              )}
            </div>
          )}

          <div className="shrink-0 border-t pt-3 text-left lg:w-40 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 lg:text-right">
            <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {duzenleme ? "Eldeki Stok" : "Durum"}
            </div>
            {duzenleme ? (
              <div className="mt-0.5 flex items-baseline gap-1.5 lg:justify-end">
                <span className="text-2xl leading-none font-semibold tabular-nums">
                  {(product?.stok ?? 0).toLocaleString("tr-TR")}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  adet
                </span>
              </div>
            ) : (
              <div className="mt-1 lg:flex lg:justify-end">
                <Badge
                  variant="secondary"
                  className={
                    form.durum === "Aktif"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {form.durum}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="relative -mb-px flex flex-wrap gap-1 border-b">
        {SEKMELER.map((s) => (
          <TabBtn
            key={s.key}
            aktif={tab === s.key}
            onClick={() => setTab(s.key)}
          >
            {s.etiket}
            {s.sayac ? ` (${s.sayac})` : ""}
          </TabBtn>
        ))}
      </div>

      <TabIcerik tabKey={tab}>
        {/* ── GENEL ─────────────────────────────────────────────── */}
        {tab === "genel" && (
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Kart baslik="Genel" ikon={Info}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ErrorShakeField error={hatalar.ad} shakeNonce={shakeNonce}>
                    <IconInput
                      label="Model Adı"
                      icon={RockingChairIcon}
                      placeholder="Örn. Dora Yatak Odası"
                      value={form.ad}
                      onChange={(e) => set("ad")(e.target.value)}
                    />
                  </ErrorShakeField>
                  <ErrorShakeField
                    error={hatalar.kategori}
                    shakeNonce={shakeNonce}
                  >
                    <AnimatedField label="Grup" icon={FolderOpenIcon}>
                      <GrupSecici
                        gruplar={gruplar}
                        value={form.kategori || null}
                        onValueChange={(v) => set("kategori")(v ?? "")}
                        placeholder="Grup seç"
                      />
                    </AnimatedField>
                  </ErrorShakeField>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <IconInput
                    label="Kod"
                    icon={ScanTextIcon}
                    placeholder="Grup seçilince oluşur"
                    value={duzenleme ? form.id : onizleme.kod}
                    readOnly
                    className="text-muted-foreground"
                  />
                  <IconInput
                    label="Barkod"
                    icon={ScanTextIcon}
                    placeholder="Grup seçilince oluşur"
                    value={duzenleme ? form.barkod : onizleme.barkod}
                    readOnly
                    className="text-muted-foreground"
                  />
                  <AnimatedField label="Marka" icon={BadgePercentIcon}>
                    <SearchSelect
                      items={markalar}
                      value={form.marka || null}
                      onValueChange={(v) => set("marka")(v ?? "")}
                      placeholder="Marka seç"
                      addLabel="Yeni marka ekle"
                      onAdd={() => {
                        setYeniTanim("");
                        setTanimTip("marka");
                      }}
                    />
                  </AnimatedField>
                </div>
              </Kart>

              <Kart baslik="Fiyat & Stok" ikon={Banknote}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <IconInput
                    label="Satış Fiyatı (₺)"
                    type="text"
                    inputMode="decimal"
                    icon={TurkishLiraIcon}
                    placeholder="0,00"
                    value={form.fiyat}
                    onChange={(e) => set("fiyat")(paraMaskele(e.target.value))}
                  />
                  <IconInput
                    label="Min Stok"
                    type="number"
                    icon={BadgeAlertIcon}
                    placeholder="0"
                    value={form.minStok}
                    onChange={(e) => set("minStok")(e.target.value)}
                  />
                  <IconInput
                    label="Ağırlık (kg)"
                    type="number"
                    icon={BoxesIcon}
                    placeholder="0"
                    value={form.agirlik}
                    onChange={(e) => set("agirlik")(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Eldeki mamul stoğu üretimden (ledger) gelir; buradan elle
                  girilmez.
                </p>
              </Kart>
            </div>

            {/* Sağ: Özet + Durum */}
            <aside className="flex flex-col gap-4">
              <div className="rounded-md border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-medium">Özet</span>
                  <Badge
                    variant="secondary"
                    className={
                      form.durum === "Aktif"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {form.durum}
                  </Badge>
                </div>
                <dl className="flex flex-col gap-2.5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Parça</dt>
                    <dd className="tabular-nums">
                      {seciliParcalar.length > 0
                        ? `${seciliParcalar.length} parça`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Birim maliyet</dt>
                    <dd className="font-medium tabular-nums">
                      {toplamMaliyet > 0 ? `₺${sayi(toplamMaliyet, 0)}` : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Satış fiyatı</dt>
                    <dd className="font-medium tabular-nums">
                      {satisFiyati > 0 ? `₺${sayi(satisFiyati, 0)}` : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Marj</dt>
                    <dd
                      className={
                        "font-semibold tabular-nums " +
                        (marj === null
                          ? "text-muted-foreground"
                          : marj < 0
                            ? "text-rose-600"
                            : "text-emerald-600")
                      }
                    >
                      {marj !== null ? `%${sayi(marj, 1)}` : "—"}
                    </dd>
                  </div>
                  {duzenleme && (
                    <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                      <dt className="text-muted-foreground">Eldeki stok</dt>
                      <dd className="font-medium tabular-nums">
                        {product?.stok ?? 0} adet
                      </dd>
                    </div>
                  )}
                </dl>
                {dokum.length > 0 && (
                  <div
                    className={
                      "border-t px-4 py-2.5 text-xs " +
                      (eksikSayisi > 0 ? "text-rose-600" : "text-emerald-700")
                    }
                  >
                    {eksikSayisi > 0
                      ? `${eksikSayisi} malzemede stok yetersiz — üretim başlatılırken engellenebilir.`
                      : "Tüm malzemeler için stok yeterli."}
                  </div>
                )}
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setForm((f) => ({
                      ...f,
                      durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
                    }));
                  }
                }}
                onMouseEnter={() => durumRef.current?.startAnimation()}
                onMouseLeave={() => durumRef.current?.stopAnimation()}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
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
                    {form.durum}
                  </span>
                  <Switch
                    checked={form.durum === "Aktif"}
                    className="pointer-events-none data-checked:bg-emerald-600"
                  />
                </span>
              </div>
            </aside>
          </div>
        )}

        {/* ── PARÇALAR & MALZEME İHTİYACI ─────────────────────────── */}
        {tab === "recete" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Sol: Parça listesi */}
            <Kart
              baslik="Parçalar"
              ikon={Layers}
              sag={
                <span className="text-xs text-muted-foreground">
                  {seciliParcalar.length} parça
                </span>
              }
            >
            {urunParcalar.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-8" />
                      <TableHead>Parça</TableHead>
                      <TableHead className="w-24 text-right">Adet</TableHead>
                      <TableHead className="w-28 text-right">Maliyet</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urunParcalar.map((s, i) => {
                      const secili = parcalar.find((x) => x.id === s.parcaId);
                      const digerIds = new Set(
                        urunParcalar
                          .filter((_, j) => j !== i)
                          .map((x) => x.parcaId)
                          .filter(Boolean),
                      );
                      const items = parcalar
                        .filter(
                          (p) => p.durum === "Aktif" && !digerIds.has(p.id),
                        )
                        .map((p) => p.ad);
                      const satirMaliyet = secili
                        ? modelIhtiyacDokumu(
                            [{ parcaId: secili.id, miktar: s.miktar || 0 }],
                            parcalar,
                            malzemeler,
                          ).reduce((t, m) => t + m.tutar, 0)
                        : 0;
                      return (
                        <TableRow
                          key={i}
                          data-state={
                            dokumSecim.has(s.parcaId) ? "selected" : undefined
                          }
                          onClick={() =>
                            s.parcaId &&
                            dokumSecimToggle(
                              s.parcaId,
                              !dokumSecim.has(s.parcaId),
                            )
                          }
                          className={cn(
                            s.parcaId && "cursor-pointer",
                            // Seçim varken işaretli olmayanlar soluklaşır.
                            dokumSecim.size > 0 &&
                              !dokumSecim.has(s.parcaId) &&
                              "opacity-40 transition-opacity",
                          )}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              disabled={!s.parcaId}
                              checked={dokumSecim.has(s.parcaId)}
                              onCheckedChange={(v) =>
                                dokumSecimToggle(s.parcaId, v === true)
                              }
                              aria-label="Malzeme dökümünde göster"
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <SearchSelect
                              items={items}
                              value={secili?.ad ?? null}
                              onValueChange={(v) => satirParcaSec(i, v)}
                              placeholder="Parça seç"
                            />
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="number"
                              value={s.miktar}
                              onChange={(e) => parcaMiktar(i, e.target.value)}
                              className="h-8 w-20 text-right tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                            {satirMaliyet > 0
                              ? `₺${sayi(satirMaliyet, 0)}`
                              : "—"}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => parcaSil(i)}
                              aria-label="Sil"
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
              onClick={satirEkle}
              disabled={
                urunParcalar.filter((p) => p.parcaId).length >=
                parcalar.filter((p) => p.durum === "Aktif").length
              }
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Parça ekle
            </button>
            {parcalar.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Henüz parça tanımlı değil —{" "}
                <Link
                  href="/stok-yonetimi?bolum=parcalar"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Parçalar
                </Link>{" "}
                sayfasından ekleyebilirsin.
              </p>
            )}
            </Kart>

            {/* Sağ: Malzeme ihtiyacı dökümü — işaretli parçalara odaklanır */}
            <Kart
              baslik="Malzeme İhtiyacı"
              ikon={Boxes}
              sag={
                dokumSecim.size > 0 ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {dokumSecim.size} parça seçili
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setDokumSecim(new Set())}
                      className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Tümünü göster
                    </button>
                  </span>
                ) : dokum.length > 0 ? (
                  eksikSayisi > 0 ? (
                    <Badge
                      variant="secondary"
                      className="bg-rose-100 text-[10px] text-rose-800"
                    >
                      {eksikSayisi} yetersiz
                    </Badge>
                  ) : (
                    <span className="text-xs text-emerald-700">
                      Stok yeterli
                    </span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">
                    fire dahil
                  </span>
                )
              }
            >
              {dokumGoster.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Soldan parça ekleyince malzeme ihtiyacı (1 model için, fire
                  dahil) burada listelenir. Parça satırlarındaki kutularla
                  dökümü seçili parçalara daraltabilirsin.
                </p>
              )}
              {dokumGoster.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Malzeme</TableHead>
                      <TableHead>İstasyon</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Fire Dahil</TableHead>
                      <TableHead className="text-right">Eldeki</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dokumGoster.map((d) => {
                      const yetersiz = d.brutMiktar > d.malzeme.stok;
                      return (
                        <TableRow key={d.malzeme.id}>
                          <TableCell className="font-medium">
                            {d.malzeme.ad}
                          </TableCell>
                          <TableCell>
                            <span className="flex flex-wrap gap-1">
                              {d.istasyonlar.map((slug) => {
                                const ist = ISTASYON_MAP.get(slug as never);
                                return (
                                  <span
                                    key={slug}
                                    className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    <span
                                      className="size-1.5 rounded-full"
                                      style={{
                                        backgroundColor: ist?.renk ?? "#a3a3a3",
                                      }}
                                    />
                                    {ist?.ad ?? slug}
                                  </span>
                                );
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {sayi(d.netMiktar)} {d.malzeme.birim}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sayi(d.brutMiktar)} {d.malzeme.birim}
                          </TableCell>
                          <TableCell
                            className={
                              "text-right tabular-nums " +
                              (yetersiz
                                ? "font-medium text-rose-600"
                                : "text-muted-foreground")
                            }
                          >
                            {sayi(d.malzeme.stok)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ₺{sayi(d.tutar, 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              )}
            </Kart>
          </div>
        )}

        {/* ── VARYANTLAR ────────────────────────────────────────── */}
        {tab === "varyant" && (
          <Kart
            baslik="Varyantlar"
            ikon={Blocks}
            sag={
              <span className="text-xs text-muted-foreground">
                {varyantlar.length} varyant
              </span>
            }
          >
            {varyantlar.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Renk</TableHead>
                      <TableHead>Kumaş</TableHead>
                      <TableHead className="w-28 text-right">
                        Ek Fiyat (₺)
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varyantlar.map((v, i) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <SearchSelect
                            items={renkler}
                            value={v.renk || null}
                            onValueChange={(deger) =>
                              varyantGuncelle(i, { renk: deger ?? "" })
                            }
                            placeholder="Renk seç"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <SearchSelect
                            items={kumaslar}
                            value={v.kumas || null}
                            onValueChange={(deger) =>
                              varyantGuncelle(i, { kumas: deger ?? "" })
                            }
                            placeholder="Kumaş seç"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={v.ekFiyat ?? 0}
                            onChange={(e) =>
                              varyantGuncelle(i, {
                                ekFiyat: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-right tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => varyantSil(i)}
                            aria-label="Sil"
                            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <button
              type="button"
              onClick={varyantSatirEkle}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
            >
              <Plus className="size-3.5" /> Varyant ekle
            </button>
          </Kart>
        )}

        {/* ── DOKÜMANLAR (malzeme kartıyla aynı sistem) ─────────── */}
        {tab === "resim" && product && (
          <DokumanlarTab stokId={product.id} kayitlar={dokumanlar} />
        )}

        {/* ── STOK ANALİZ (yalnız düzenlemede) ──────────────────── */}
        {tab === "analiz" && product && (
          <ModelAnaliz product={product} hareketler={hareketler} />
        )}
      </TabIcerik>

      {/* Yeni marka tanımlama modalı (Tanımlamalar → Markalar'a da yazılır) */}
      <Dialog
        open={tanimTip !== null}
        onOpenChange={(o) => !o && setTanimTip(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Marka</DialogTitle>
          </DialogHeader>
          <IconInput
            label="Marka Adı"
            icon={BadgePercentIcon}
            placeholder="Örn. Mobilyum"
            value={yeniTanim}
            autoFocus
            onChange={(e) => setYeniTanim(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tanimEkle();
              }
            }}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">İptal</Button>} />
            <Button onClick={tanimEkle}>Ekle</Button>
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
