"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Layers,
  History,
  FileText,
  Banknote,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  ImageOff,
  Info,
  Ruler,
  Boxes,
  Image as ImageIcon,
  CircleCheck,
  Package,
  Palette,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TabIcerik } from "@/components/ui/tab-icerik";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import { KartBaslik } from "@/components/ui/kart-baslik";
import { Badge } from "@/components/ui/badge";
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
  type Parca,
  type Malzeme,
  type StokHareket,
  type StokHareketTuru,
  type Model,
} from "@/lib/data";
import { modelMalzemeIhtiyaci, flattenParca } from "@/lib/bom";

type Tab =
  | "genel"
  | "detay"
  | "entegrasyon"
  | "agac"
  | "resimler"
  | "kullanim"
  | "analiz"
  | "varyant";

const SEKMELER: { key: Tab; etiket: string }[] = [
  { key: "genel", etiket: "Genel" },
  { key: "detay", etiket: "Detay Bilgiler" },
  { key: "entegrasyon", etiket: "Entegrasyon Kodları" },
  { key: "agac", etiket: "Model Ağacı" },
  { key: "resimler", etiket: "Resimler" },
  { key: "kullanim", etiket: "Kullanıldığı Reçeteler" },
  { key: "analiz", etiket: "Stok Analiz" },
  { key: "varyant", etiket: "Varyant & Maliyet" },
];

export function ProductDetailPage({
  product,
  parcalar = [],
  malzemeler = [],
  hareketler = [],
}: {
  product: Model;
  parcalar?: Parca[];
  malzemeler?: Malzeme[];
  hareketler?: StokHareket[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("genel");
  const parcaSayisi = product.parcalar?.length ?? 0;
  const deger = product.fiyat * product.stok;
  const gorsel = product.gorsel ?? product.gorseller?.[0];
  const durum = modelDurumu(product);
  const sonHareket = hareketler[0];

  const yakinda = (ad: string) => toast.success(`${ad} (yakında)`);

  const aksiyonlar = [
    {
      ikon: Layers,
      etiket: "Reçete",
      rozet: parcaSayisi || undefined,
      onClick: () => setTab("agac"),
    },
    {
      ikon: History,
      etiket: "Stok Hareketleri",
      onClick: () => setTab("analiz"),
    },
    { ikon: FileText, etiket: "Not Ekle", onClick: () => yakinda("Not ekle") },
    {
      ikon: Banknote,
      etiket: "Fiyat Güncelle",
      onClick: () => router.push(`/urunler/${product.id}/duzenle`),
    },
    { ikon: Tags, etiket: "Etiket Ekle", onClick: () => yakinda("Etiket ekle") },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* ── Banner (stok kartı şeridiyle aynı) ────────────────── */}
      <ModelSerit
        product={product}
        deger={deger}
        durum={durum}
        gorsel={gorsel}
        sonHareket={sonHareket}
        aksiyonlar={aksiyonlar}
        onGorsel={() => setTab("resimler")}
      />

      {/* ── Sekmeler ──────────────────────────────────────────── */}
      <div className="relative -mb-px flex flex-wrap gap-1 border-b">
        {SEKMELER.map((s) => (
          <TabBtn
            key={s.key}
            aktif={tab === s.key}
            onClick={() => setTab(s.key)}
          >
            {s.etiket}
            {s.key === "agac" && parcaSayisi ? ` (${parcaSayisi})` : ""}
          </TabBtn>
        ))}
      </div>

      <TabIcerik tabKey={tab}>
        {tab === "genel" && <GenelTab product={product} />}
        {tab === "detay" && <DetayTab product={product} />}
        {tab === "entegrasyon" && <EntegrasyonTab product={product} />}
        {tab === "agac" && (
          <UrunAgaciTab product={product} parcalar={parcalar} malzemeler={malzemeler} />
        )}
        {tab === "resimler" && <ResimlerTab product={product} />}
        {tab === "kullanim" && <KullanimTab product={product} parcalar={parcalar} />}
        {tab === "analiz" && <StokAnalizTab product={product} hareketler={hareketler} />}
        {tab === "varyant" && (
          <VaryantMaliyetTab product={product} parcalar={parcalar} malzemeler={malzemeler} />
        )}
      </TabIcerik>
    </div>
  );
}

/** Model stok durumu — mevcut miktarı kritik eşiğe göre etiketler. */
type ModelDurum = { etiket: string; renk: string; bar: string };
function modelDurumu(m: Model): ModelDurum {
  const min = m.minStok ?? 0;
  if (m.stok <= 0)
    return {
      etiket: "Tükendi",
      renk: "bg-rose-100 text-rose-700",
      bar: "bg-rose-500",
    };
  if (min > 0 && m.stok <= min)
    return {
      etiket: "Kritik Stok",
      renk: "bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
    };
  return {
    etiket: "Normal",
    renk: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  };
}

/** Şeritteki mini metrik (etiket + değer). */
function SeritMetrik({
  etiket,
  deger,
}: {
  etiket: string;
  deger: React.ReactNode;
}) {
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

/**
 * Model başlığı şeridi — stok kartındaki StokKartiSerit ile aynı görünüm:
 * görsel + kimlik + metrikler + miktar/durum/seviye barı + hızlı aksiyonlar.
 */
function ModelSerit({
  product,
  deger,
  durum,
  gorsel,
  sonHareket,
  aksiyonlar,
  onGorsel,
}: {
  product: Model;
  deger: number;
  durum: ModelDurum;
  gorsel?: string;
  sonHareket?: StokHareket;
  aksiyonlar: {
    ikon: LucideIcon;
    etiket: string;
    rozet?: number;
    onClick: () => void;
  }[];
  onGorsel: () => void;
}) {
  const min = product.minStok ?? 0;
  const maxVar = min > 0;
  // Kritik eşiği referans alan doluluk (max yoksa 2× kritik kabul edilir).
  const doluluk = maxVar
    ? Math.min(100, Math.max(0, (product.stok / (min * 2)) * 100))
    : 0;

  const metrikler: { etiket: string; deger: React.ReactNode }[] = [];
  if (product.fiyat > 0)
    metrikler.push({ etiket: "Satış Fiyatı", deger: formatTL(product.fiyat) });
  if (deger > 0)
    metrikler.push({ etiket: "Stok Değeri", deger: formatTL(deger) });
  if (sonHareket)
    metrikler.push({
      etiket: "Son Hareket",
      deger: (
        <span className="whitespace-nowrap">
          {formatTarih(sonHareket.tarih)} · {sonHareket.tur}
        </span>
      ),
    });

  return (
    <div className="overflow-hidden rounded-xl border bg-gradient-to-r from-emerald-50 via-card to-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        {/* Görsel + Kimlik + aksiyonlar */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {gorsel ? (
            <button
              type="button"
              onClick={onGorsel}
              className="shrink-0 cursor-zoom-in overflow-hidden rounded-lg border transition-transform hover:scale-105"
              aria-label={`${product.ad} — resimler`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gorsel}
                alt={product.ad}
                className="size-14 object-cover"
              />
            </button>
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ImageOff className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <h1 className="truncate text-lg leading-tight font-semibold">
                {product.ad}
              </h1>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                {product.barkod || product.id}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                Mamül
              </Badge>
              {product.kategori && (
                <Badge variant="outline" className="font-normal">
                  {product.kategori}
                </Badge>
              )}
              {product.marka && (
                <Badge variant="outline" className="font-normal">
                  {product.marka}
                </Badge>
              )}
              {product.durum === "Pasif" && (
                <Badge variant="secondary" className="bg-muted">
                  Pasif
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {aksiyonlar.map((a) => {
                const Icon = a.ikon;
                return (
                  <button
                    key={a.etiket}
                    type="button"
                    onClick={a.onClick}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon className="size-4" />
                    {a.etiket}
                    {a.rozet !== undefined && (
                      <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[11px] font-medium text-foreground">
                        {a.rozet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Metrikler */}
        {metrikler.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            {metrikler.map((m) => (
              <SeritMetrik key={m.etiket} etiket={m.etiket} deger={m.deger} />
            ))}
          </div>
        )}

        {/* Miktar + durum + seviye barı */}
        <div className="shrink-0 border-t pt-3 text-left lg:w-52 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 lg:text-right">
          <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Mevcut Miktar
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 lg:justify-end">
            <span
              className={cn(
                "text-3xl leading-none font-semibold tabular-nums",
                product.stok <= 0 && "text-rose-600",
              )}
            >
              {product.stok.toLocaleString("tr-TR")}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              adet
            </span>
            <Badge variant="secondary" className={cn("ml-1", durum.renk)}>
              {durum.etiket}
            </Badge>
          </div>
          {maxVar ? (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", durum.bar)}
                  style={{ width: `${doluluk}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>Kritik: {min.toLocaleString("tr-TR")}</span>
                <span>{formatTL(deger)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Kritik eşik tanımlı değil
            </div>
          )}
        </div>
      </div>
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
    <SekmeButonu aktif={aktif} onClick={onClick} layoutId="urunTabCizgi">
      <span className="whitespace-nowrap">{children}</span>
    </SekmeButonu>
  );
}

function Kart({
  baslik,
  ikon,
  sag,
  children,
  className,
}: {
  baslik: string;
  ikon: LucideIcon;
  sag?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <KartBaslik ikon={ikon} baslik={baslik} sag={sag} />
      <div className="p-4">{children}</div>
    </div>
  );
}

function BilgiSatiri({
  etiket,
  deger,
}: {
  etiket: string;
  deger: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{etiket}</span>
      <span className="text-right font-medium">{deger}</span>
    </div>
  );
}

/* ── Genel ───────────────────────────────────────────────────── */
function GenelTab({ product }: { product: Model }) {
  return (
    <Kart baslik="Genel Bilgiler" ikon={Info}>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <BilgiSatiri etiket="Model Adı" deger={product.ad} />
        <BilgiSatiri etiket="Model Kodu" deger={product.id} />
        <BilgiSatiri etiket="Kategori" deger={product.kategori} />
        <BilgiSatiri etiket="Marka" deger={product.marka ?? "—"} />
        <BilgiSatiri etiket="Barkod" deger={product.barkod ?? "—"} />
        <BilgiSatiri etiket="Fiyat" deger={formatTL(product.fiyat)} />
        <BilgiSatiri etiket="Mevcut Stok" deger={product.stok} />
        <BilgiSatiri etiket="Durum" deger={product.durum} />
      </div>
    </Kart>
  );
}

/* ── Detay Bilgiler ──────────────────────────────────────────── */
function DetayTab({ product }: { product: Model }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Kart baslik="Ölçü & Fiziksel" ikon={Ruler}>
        <div className="grid gap-1">
          <BilgiSatiri etiket="Birim" deger="Adet" />
          <BilgiSatiri
            etiket="Ağırlık"
            deger={product.agirlik ? `${product.agirlik} kg` : "—"}
          />
          <BilgiSatiri etiket="Boyut (E×B×Y)" deger="—" />
          <BilgiSatiri etiket="Hacim (desi)" deger="—" />
          <BilgiSatiri etiket="Min. Stok" deger={product.minStok ?? "—"} />
        </div>
      </Kart>
      <Kart baslik="Ticari & Diğer" ikon={Tags}>
        <div className="grid gap-1">
          <BilgiSatiri etiket="KDV Oranı" deger="%20" />
          <BilgiSatiri etiket="Garanti" deger="24 ay" />
          <BilgiSatiri etiket="Menşei" deger="Türkiye" />
          <BilgiSatiri etiket="GTIN / Barkod" deger={product.barkod ?? "—"} />
          <BilgiSatiri etiket="Oluşturulma" deger="—" />
        </div>
      </Kart>
    </div>
  );
}

/* ── Entegrasyon Kodları ─────────────────────────────────────── */
function EntegrasyonTab({ product }: { product: Model }) {
  const numara = product.id.replace(/\D/g, "") || "0000";
  const platformlar = [
    { ad: "Trendyol", on: "TY", aktif: true },
    { ad: "Hepsiburada", on: "HB", aktif: true },
    { ad: "N11", on: "N11", aktif: false },
    { ad: "Amazon", on: "AMZ", aktif: true },
    { ad: "Pazarama", on: "PZR", aktif: false },
    { ad: "GTIN / Barkod", on: "", aktif: true },
    { ad: "E-Fatura Kodu", on: "EF", aktif: true },
  ];

  return (
    <Kart
      baslik="Entegrasyon Kodları"
      ikon={Repeat}
      className="p-0 [&>div:last-child]:p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Kod</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {platformlar.map((p) => (
            <TableRow key={p.ad}>
              <TableCell className="font-medium">{p.ad}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {p.ad === "GTIN / Barkod"
                  ? product.barkod ?? "—"
                  : `${p.on}-${numara}`}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    p.aktif
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {p.aktif ? "Eşleşti" : "Bekliyor"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Kart>
  );
}

/* ── Model Ağacı (Reçete / BOM) ───────────────────────────────── */
function UrunAgaciTab({
  product,
  parcalar,
  malzemeler,
}: {
  product: Model;
  parcalar: Parca[];
  malzemeler: Malzeme[];
}) {
  const parcaSatirlari = product.parcalar ?? [];
  const ihtiyac = React.useMemo(
    () => modelMalzemeIhtiyaci(parcaSatirlari, parcalar, malzemeler),
    [parcaSatirlari, parcalar, malzemeler],
  );
  const toplamMaliyet = ihtiyac.reduce((t, m) => t + m.toplamFiyat, 0);

  if (parcaSatirlari.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Bu modelin ağacı (reçetesi) tanımlı değil. Parça eklemek için modeli
        düzenleyin.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Kart baslik="Parçalar" ikon={Boxes}>
        <div className="flex flex-col gap-1">
          {parcaSatirlari.map((ps) => {
            const p = parcalar.find((x) => x.id === ps.parcaId);
            const mAdet = flattenParca(ps.parcaId, 1, parcalar).size;
            return (
              <div
                key={ps.parcaId}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p?.ad ?? ps.parcaId}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {p?.kategori}
                  </Badge>
                </div>
                <span className="text-muted-foreground">
                  ×{ps.miktar} · {mAdet} malzeme
                </span>
              </div>
            );
          })}
        </div>
      </Kart>

      <Kart
        baslik="Toplam Malzeme İhtiyacı"
        ikon={Layers}
        sag={
          <span className="text-sm font-semibold tabular-nums">
            {formatTL(toplamMaliyet)}
          </span>
        }
        className="p-0 [&>div:last-child]:p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ihtiyac.map((m) => (
              <TableRow key={m.malzeme.id}>
                <TableCell className="font-medium">{m.malzeme.ad}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.toplamMiktar.toLocaleString("tr-TR", {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.malzeme.birim}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatTL(m.toplamFiyat)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Kart>
    </div>
  );
}

/* ── Resimler ────────────────────────────────────────────────── */
function ResimlerTab({ product }: { product: Model }) {
  const gorseller = product.gorseller ?? [];
  return (
    <Kart
      baslik="Model Resimleri"
      ikon={ImageIcon}
      sag={
        <span className="text-xs text-muted-foreground">
          {gorseller.length} görsel
        </span>
      }
    >
      {gorseller.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gorseller.map((g, i) => (
            <div
              key={`${g}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
                  Ana
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <ImageOff className="size-8" />
          <span className="text-sm">Görsel eklenmemiş</span>
        </div>
      )}
    </Kart>
  );
}

/* ── Kullanıldığı Reçeteler (ters BOM) ───────────────────────── */
function KullanimTab({
  product,
  parcalar,
}: {
  product: Model;
  parcalar: Parca[];
}) {
  // Bu modeli bileşen olarak içeren parçaları ara (ters arama).
  const kullananlar = parcalar.filter((p) =>
    p.recete.some((s) => s.bilesen.ref === product.id),
  );

  return (
    <Kart baslik="Kullanıldığı Reçeteler" ikon={FileText}>
      {kullananlar.length > 0 ? (
        <div className="flex flex-col gap-1">
          {kullananlar.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{p.ad}</span>
              <Badge variant="secondary" className="text-[10px]">
                {p.kategori}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Bu model, başka bir reçetede bileşen olarak kullanılmıyor.
        </p>
      )}
    </Kart>
  );
}

/* ── Stok Analiz ─────────────────────────────────────────────── */
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

function StokAnalizTab({
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

  const min = product.minStok ?? 5;
  const durum =
    product.stok === 0
      ? { e: "Tükendi", c: "bg-rose-100 text-rose-800" }
      : product.stok <= min
        ? { e: "Kritik", c: "bg-amber-100 text-amber-800" }
        : { e: "Yeterli", c: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Ozet etiket="Mevcut Stok" deger={String(product.stok)} />
        <Ozet etiket="Toplam Giriş" deger={String(giris)} tone="emerald" />
        <Ozet etiket="Toplam Çıkış" deger={String(cikis)} tone="rose" />
        <Kart baslik="Durum" ikon={CircleCheck}>
          <Badge variant="secondary" className={durum.c}>
            {durum.e}
          </Badge>
        </Kart>
      </div>

      <Kart
        baslik="Son Hareketler"
        ikon={History}
        sag={
          <span className="text-xs text-muted-foreground">
            {hareketler.length} hareket
          </span>
        }
        className="p-0 [&>div:last-child]:p-0"
      >
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
      </Kart>
    </div>
  );
}

function Ozet({
  etiket,
  deger,
  tone,
}: {
  etiket: string;
  deger: string;
  tone?: "emerald" | "rose";
}) {
  return (
    <Kart baslik={etiket} ikon={Package}>
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "emerald" && "text-emerald-600",
          tone === "rose" && "text-rose-600",
        )}
      >
        {deger}
      </div>
    </Kart>
  );
}

/* ── Varyant & Maliyet ───────────────────────────────────────── */
function VaryantMaliyetTab({
  product,
  parcalar,
  malzemeler,
}: {
  product: Model;
  parcalar: Parca[];
  malzemeler: Malzeme[];
}) {
  const varyantlar = product.varyantlar ?? [];
  const ihtiyac = modelMalzemeIhtiyaci(
    product.parcalar ?? [],
    parcalar,
    malzemeler,
  );
  const maliyet = ihtiyac.reduce((t, m) => t + m.toplamFiyat, 0);
  const kar = product.fiyat - maliyet;
  const marj = product.fiyat > 0 ? (kar / product.fiyat) * 100 : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Kart
        baslik="Varyantlar"
        ikon={Palette}
        sag={
          <span className="text-xs text-muted-foreground">
            {varyantlar.length} varyant
          </span>
        }
        className="p-0 [&>div:last-child]:p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Renk</TableHead>
              <TableHead>Kumaş</TableHead>
              <TableHead className="text-right">Ek Fiyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {varyantlar.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.renk || "—"}</TableCell>
                <TableCell>{v.kumas || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {v.ekFiyat ? `+${formatTL(v.ekFiyat)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
            {varyantlar.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-20 text-center text-muted-foreground"
                >
                  Varyant tanımlanmamış.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Kart>

      <Kart baslik="Maliyet & Kâr" ikon={Banknote}>
        {maliyet > 0 ? (
          <div className="grid gap-1">
            <BilgiSatiri etiket="Malzeme Maliyeti" deger={formatTL(maliyet)} />
            <BilgiSatiri etiket="Satış Fiyatı" deger={formatTL(product.fiyat)} />
            <BilgiSatiri
              etiket="Kâr"
              deger={
                <span className={kar >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {formatTL(kar)}
                </span>
              }
            />
            <BilgiSatiri
              etiket="Kâr Marjı"
              deger={
                <span className={marj >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  %{marj.toFixed(1)}
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid gap-1">
            <BilgiSatiri etiket="Satış Fiyatı" deger={formatTL(product.fiyat)} />
            <p className="pt-2 text-xs text-muted-foreground">
              Malzeme maliyeti için modelin reçetesi (parçaları) tanımlı olmalı.
            </p>
          </div>
        )}
      </Kart>
    </div>
  );
}
