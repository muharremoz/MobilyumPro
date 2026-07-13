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
  Image as ImageIcon,
  Blocks,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { FrameIcon } from "@/components/ui/icons/frame";
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
  type Malzeme,
  type Parca,
  type ParcaSatiri,
  type Model,
  type ModelVaryant,
  type StokGrup,
} from "@/lib/data";
import { GrupSecici } from "@/components/ui/grup-secici";
import { cn } from "@/lib/utils";
import { modelIhtiyacDokumu } from "@/lib/bom";
import { ISTASYON_MAP } from "@/lib/fabrika";
import { modelKaydet, tanimKaydet } from "@/lib/db/actions";

type Tab = "genel" | "recete" | "varyant" | "resim";

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

/**
 * Seçilen görsel dosyasını data-URL'e çevirir; büyükse en fazla 1280px
 * olacak şekilde küçültüp JPEG'e sıkıştırır (DB'de NVarChar(Max) saklanıyor).
 */
function dosyayiGorseleCevir(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAKS = 1280;
      const oran = Math.min(1, MAKS / Math.max(img.width, img.height));
      if (oran === 1 && file.size < 300 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * oran);
      canvas.height = Math.round(img.height * oran);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı"));
    };
    img.src = url;
  });
}

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

export function ModelForm({
  product,
  parcalar,
  malzemeler,
  gruplar = [],
  markalar: markalarProp,
  renkler = [],
  kumaslar = [],
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
        fiyat: String(product.fiyat),
        minStok: product.minStok ? String(product.minStok) : "",
        agirlik: product.agirlik ? String(product.agirlik) : "",
        durum: product.durum,
      }
    : bos;
  const [form, setForm] = React.useState<Form>(baslangic);
  const [tab, setTab] = React.useState<Tab>("genel");
  const [markalar, setMarkalar] = React.useState(markalarProp);
  const [tanimTip, setTanimTip] = React.useState<"marka" | null>(null);
  const [yeniTanim, setYeniTanim] = React.useState("");
  const [urunParcalar, setUrunParcalar] = React.useState<ParcaSatiri[]>(
    product?.parcalar ? [...product.parcalar] : [],
  );
  const [gorseller, setGorseller] = React.useState<string[]>(
    product?.gorseller
      ? [...product.gorseller]
      : product?.gorsel
        ? [product.gorsel]
        : [],
  );
  const [yeniGorsel, setYeniGorsel] = React.useState("");
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
      id: form.id,
      ad: form.ad.trim(),
      kategori: form.kategori,
      fiyat: Number(form.fiyat) || 0,
      // Mamul stoğu üretimden (ledger) gelir; formdan elle girilmez.
      stok: product?.stok ?? 0,
      durum: form.durum,
      gorsel: gorseller[0] ?? undefined,
      gorseller: gorseller.length ? gorseller : undefined,
      parcalar: urunParcalar.filter((p) => p.parcaId),
      marka: form.marka.trim() || undefined,
      barkod: form.barkod.trim() || undefined,
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
    setUrunParcalar((ps) => ps.filter((_, j) => j !== i));
  }

  // Görsel galerisi
  const dosyaRef = React.useRef<HTMLInputElement>(null);
  function gorselEkle() {
    const v = yeniGorsel.trim();
    if (!v) return;
    setGorseller((g) => [...g, v]);
    setYeniGorsel("");
  }
  async function dosyalarSecildi(files: FileList | null) {
    if (!files?.length) return;
    try {
      const yeniler = await Promise.all(
        [...files].map((f) => dosyayiGorseleCevir(f)),
      );
      setGorseller((g) => [...g, ...yeniler]);
    } catch {
      toast.error("Görsel okunamadı");
    }
    if (dosyaRef.current) dosyaRef.current.value = "";
  }
  function gorselSil(i: number) {
    setGorseller((g) => g.filter((_, j) => j !== i));
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
  const toplamMaliyet = dokum.reduce((t, m) => t + m.tutar, 0);
  const eksikSayisi = dokum.filter((d) => d.brutMiktar > d.malzeme.stok).length;
  const satisFiyati = Number(form.fiyat) || 0;
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
    { key: "resim", etiket: "Görseller", sayac: gorseller.length || undefined },
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
            {gorseller[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gorseller[0]}
                alt={form.ad || "Model"}
                className="size-14 shrink-0 rounded-lg border object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <h2 className="truncate text-lg leading-tight font-semibold">
                  {form.ad.trim() || "Yeni Model"}
                </h2>
                <span aria-hidden className="h-4 w-px bg-border" />
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {form.barkod.trim() || form.id || "URN-…"}
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
                    placeholder="Otomatik (URN-####)"
                    value={form.id}
                    disabled={duzenleme}
                    onChange={(e) => set("id")(e.target.value)}
                  />
                  <IconInput
                    label="Barkod"
                    icon={ScanTextIcon}
                    placeholder="8690000000000"
                    value={form.barkod}
                    onChange={(e) => set("barkod")(e.target.value)}
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
                    type="number"
                    icon={TurkishLiraIcon}
                    placeholder="0"
                    value={form.fiyat}
                    onChange={(e) => set("fiyat")(e.target.value)}
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

        {/* ── REÇETE & MALİYET ──────────────────────────────────── */}
        {tab === "recete" && (
          <Kart
            baslik="Parçalar & Maliyet"
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
                        <TableRow key={i}>
                          <TableCell>
                            <SearchSelect
                              items={items}
                              value={secili?.ad ?? null}
                              onValueChange={(v) => satirParcaSec(i, v)}
                              placeholder="Parça seç"
                            />
                          </TableCell>
                          <TableCell className="text-right">
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
                          <TableCell>
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

            {/* Malzeme patlatması */}
            {dokum.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                  <span className="text-xs font-medium">
                    Malzeme İhtiyacı{" "}
                    <span className="font-normal text-muted-foreground">
                      (1 model için, fire dahil)
                    </span>
                  </span>
                  {eksikSayisi > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-rose-100 text-[10px] text-rose-800"
                    >
                      {eksikSayisi} malzemede stok yetersiz
                    </Badge>
                  )}
                </div>
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
                    {dokum.map((d) => {
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

        {/* ── GÖRSELLER ─────────────────────────────────────────── */}
        {tab === "resim" && (
          <Kart
            baslik="Görseller"
            ikon={ImageIcon}
            sag={
              <span className="text-xs text-muted-foreground">
                {gorseller.length} görsel · ilki ana görsel
              </span>
            }
          >
            {gorseller.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {gorseller.map((g, i) => (
                  <div
                    key={`${g}-${i}`}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g}
                      alt={`Görsel ${i + 1}`}
                      className="size-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
                        Ana
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => gorselSil(i)}
                      aria-label="Sil"
                      className="absolute top-1 right-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/80 text-background opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={dosyaRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => dosyalarSecildi(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => dosyaRef.current?.click()}
              >
                <FrameIcon size={14} /> Bilgisayardan Seç
              </Button>
              <Input
                placeholder="veya görsel URL'si yapıştır"
                value={yeniGorsel}
                onChange={(e) => setYeniGorsel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    gorselEkle();
                  }
                }}
                className="h-8 min-w-40 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={gorselEkle}
                disabled={!yeniGorsel.trim()}
              >
                <Plus className="size-3.5" /> Ekle
              </Button>
            </div>
          </Kart>
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
    </div>
  );
}
