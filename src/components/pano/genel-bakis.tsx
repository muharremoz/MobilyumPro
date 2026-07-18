"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  Factory,
  FileText,
  Hammer,
  History,
  Layers,
  PackageSearch,
  Percent,
  Plus,
  Receipt,
  Ruler,
  Repeat,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wrench,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BaslikDokusu } from "@/components/ui/baslik-dokusu";
import { SatirMenu, type SatirAksiyon } from "@/components/ui/satir-menu";
import { useAraclar } from "@/components/araclar/araclar-baglam";
import type { AracSekme } from "@/components/araclar/araclar-paneli";
import { panoKisayolKaydet } from "@/lib/db/actions";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { formatTL, formatTarih, type PanoVerisi } from "@/lib/data";

/**
 * Genel Bakış — tek sayfa, departmana göre FARKLI KART SETİ.
 * Departman başına ayrı sayfa yok: kartlar ortak havuzdan gelir, DEPARTMAN_KART
 * eşlemesi hangi kartın kime görüneceğini söyler.
 *
 * TODO: oturum altyapısı gelince departman giriş yapan kullanıcıdan okunacak;
 * şimdilik prop'tan gelir ve yönetici seçiciyle başka ekranları görebilir.
 */

type KartAd =
  | "istasyonKuyrugu"
  | "emirlerim"
  | "onayBekleyen"
  | "siparisTakip"
  | "kritikStok"
  | "sonHareketler"
  | "alisTrendi"
  | "yonetimOzet";

const DEPARTMAN_KART: Record<string, KartAd[]> = {
  Üretim: ["istasyonKuyrugu", "emirlerim", "kritikStok"],
  "Satın Alma": ["onayBekleyen", "siparisTakip", "alisTrendi", "kritikStok"],
  Depo: ["kritikStok", "siparisTakip", "sonHareketler"],
  Yönetim: [
    "yonetimOzet",
    "alisTrendi",
    "istasyonKuyrugu",
    "onayBekleyen",
    "siparisTakip",
    "kritikStok",
  ],
};
// Modülü olmayan departmanlar (Muhasebe, Sevkiyat) yönetim özetini görür.
const VARSAYILAN_KART: KartAd[] = ["yonetimOzet", "kritikStok"];

/** Grafik serisi — renk temanın primary'sinden gelir. */
const ALIS_GRAFIK: ChartConfig = {
  tutar: { label: "Alış", color: "var(--primary)" },
};


/**
 * Hızlı işlemler — departmanın en sık gittiği sayfalar, tek tıkla.
 *
 * Rozet, işin BEKLEYEN yükünü gösterir (panodaki canlı veriden); sıfırsa
 * hiç basılmaz, böylece rozet görmek "iş var" demek olur. Rotalar
 * nav-config'tekilerle aynı; yeni sayfa eklenince buraya da yazılmalı.
 */
type HizliIslem = {
  etiket: string;
  alt: string;
  ikon: React.ComponentType<{ className?: string }>;
  /** Sayfaya giden kısayol. */
  href?: string;
  /** Araç paneli kısayolu — sayfadan ayrılmadan ilgili sekmeyi açar. */
  arac?: AracSekme;
  /** Bekleyen iş sayısı — 0/undefined ise rozet çizilmez. */
  rozet?: (v: PanoVerisi) => number;
};

const ISLEM: Record<string, HizliIslem> = {
  uretimTakip: {
    etiket: "Üretim Takibi",
    alt: "Emirleri ilerlet",
    href: "/uretim/emirler",
    ikon: Hammer,
    rozet: (v) => v.ozet.uretimdeEmir,
  },
  fabrika: {
    etiket: "Fabrika",
    alt: "3D hat görünümü",
    href: "/uretim/fabrika",
    ikon: Factory,
  },
  uretimPlan: {
    etiket: "Üretim Planı",
    alt: "Emir oluştur",
    href: "/uretim/plan",
    ikon: CalendarDays,
  },
  recete: {
    etiket: "Reçete",
    alt: "Ağaç ve maliyet",
    href: "/uretim/recete",
    ikon: Layers,
  },
  talepler: {
    etiket: "Satın Alma Talepleri",
    alt: "Onayla ve dağıt",
    href: "/satin-alma/talepler",
    ikon: ClipboardCheck,
    rozet: (v) => v.onayBekleyenTalep.length,
  },
  bekleyenSiparis: {
    etiket: "Bekleyen Siparişler",
    alt: "Tedarik takibi",
    href: "/satin-alma/siparisler",
    ikon: PackageSearch,
    rozet: (v) => v.bekleyenSiparis.length,
  },
  alis: {
    etiket: "Alış Fişi",
    alt: "Mal kabul girişi",
    href: "/satin-alma",
    ikon: Receipt,
  },
  sartlar: {
    etiket: "Satın Alma Şartları",
    alt: "Firma anlaşmaları",
    href: "/satin-alma/sartlar",
    ikon: BadgePercent,
  },
  stokDurum: {
    etiket: "Stok Durumu",
    alt: "Miktar ve kritik",
    href: "/stok-yonetimi?bolum=durum",
    ikon: Boxes,
    rozet: (v) => v.ozet.kritikStokAdet,
  },
  sayim: {
    etiket: "Sayım",
    alt: "Fiili stok girişi",
    href: "/stok-yonetimi?bolum=sayim",
    ikon: ClipboardCheck,
  },
  hareketler: {
    etiket: "Stok Hareketleri",
    alt: "Giriş/çıkış defteri",
    href: "/stok-yonetimi?bolum=hareketler",
    ikon: History,
  },
  malzeme: {
    etiket: "Malzeme Kartları",
    alt: "Kart ve fiyat",
    href: "/stok-karti",
    ikon: Boxes,
  },
  siparisler: {
    etiket: "Siparişler",
    alt: "Müşteri siparişleri",
    href: "/siparisler",
    ikon: ShoppingCart,
  },
  cari: {
    etiket: "Cari Hesaplar",
    alt: "Bakiye ve hareket",
    href: "/cari",
    ikon: Wallet,
  },
  // Araçlar — sayfaya gitmez, araç panelini ilgili sekmede açar.
  aracBirim: {
    etiket: "Birim Çevirici",
    alt: "Levha ölçüsü → m²",
    arac: "birim",
    ikon: Ruler,
  },
  aracTermin: {
    etiket: "Termin Hesabı",
    alt: "İş günü → teslim tarihi",
    arac: "termin",
    ikon: CalendarDays,
  },
  aracKdv: {
    etiket: "KDV Hesabı",
    alt: "Dahil ↔ hariç",
    arac: "kdv",
    ikon: Percent,
  },
  aracIskonto: {
    etiket: "İskonto Hesabı",
    alt: "Kademeli indirim",
    arac: "iskonto",
    ikon: BadgePercent,
  },
};

const DEPARTMAN_ISLEM: Record<string, string[]> = {
  Üretim: ["uretimTakip", "fabrika", "uretimPlan", "recete"],
  "Satın Alma": ["talepler", "bekleyenSiparis", "alis", "sartlar"],
  Depo: ["stokDurum", "sayim", "hareketler", "malzeme"],
  Yönetim: ["uretimTakip", "talepler", "stokDurum", "cari"],
};
const VARSAYILAN_ISLEM = ["stokDurum", "siparisler", "cari"];

export function GenelBakis({
  veri,
  kullaniciId,
  kisayollar,
  kullaniciAd,
  departman,
  istasyon,
}: {
  veri: PanoVerisi;
  /** Kısayol tercihi kullanıcı bazında saklanır; yoksa düzenleme kapalı. */
  kullaniciId?: string;
  /** Departman -> kayıtlı kısayollar; kaydı olmayan departman varsayılana düşer. */
  kisayollar: Record<string, string[]>;
  kullaniciAd: string;
  /** Giriş yapan kullanıcının departmanı (oturumdan gelir). */
  departman?: string;
  /** Üretim personelinin istasyonu — "istasyonumdaki iş" için. */
  istasyon?: string;
}) {
  // Departman oturumdan gelir; seçiciyle değiştirilmez. Departmanı tanımsız
  // kullanıcılar yönetim özetini görür (VARSAYILAN_KART).
  const secili = departman ?? "Yönetim";
  const kartlar = DEPARTMAN_KART[secili] ?? VARSAYILAN_KART;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            Merhaba, {kullaniciAd.split(" ")[0]}
          </h1>
          <p className="text-xs text-muted-foreground">
            {secili}
            {istasyon && secili === "Üretim" ? ` · ${istasyon}` : ""} panosu
          </p>
        </div>
      </div>

      <HizliIslemler
        departman={secili}
        veri={veri}
        kullaniciId={kullaniciId}
        kayitli={kisayollar[secili]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {kartlar.map((k) => (
          <Kart key={k} ad={k} veri={veri} istasyon={istasyon} />
        ))}
      </div>
    </div>
  );
}


/**
 * Hızlı işlem şeridi — kartların üstünde, departmana göre değişir.
 *
 * Kullanıcı düzeni değiştirebilir: sağ tıkla kısayol değiştir/ekle/kaldır,
 * sürükle-bırak ile sırala. Tercih kullanıcı bazında kaydedilir; hiç kaydı
 * yoksa departman varsayılanı gösterilir (`kayitli === null`).
 *
 * Sürükle-bırak yerli HTML5 DnD ile: motion'ın Reorder'ı tek eksende çalışır,
 * bu şerit ise sarmalayan bir grid (mobilde 1, sm'de 2, xl'de 4 sütun).
 */
function HizliIslemler({
  departman,
  veri,
  kullaniciId,
  kayitli,
}: {
  departman: string;
  veri: PanoVerisi;
  kullaniciId?: string;
  kayitli?: string[];
}) {
  const router = useRouter();
  const { aracAc } = useAraclar();
  const varsayilan = React.useMemo(
    () => DEPARTMAN_ISLEM[departman] ?? VARSAYILAN_ISLEM,
    [departman],
  );
  // Kayıtlıysa onu kullan; tanımı kalkmış anahtarlar sessizce elenir.
  const cozul = React.useCallback(
    () => (kayitli ?? varsayilan).filter((k) => k in ISLEM),
    [kayitli, varsayilan],
  );
  const [liste, setListe] = React.useState<string[]>(cozul);
  // Yönetici departman değiştirince o departmanın kendi düzenine geç.
  const oncekiDepartman = React.useRef(departman);
  React.useEffect(() => {
    if (oncekiDepartman.current === departman) return;
    oncekiDepartman.current = departman;
    setListe(cozul());
  }, [departman, cozul]);

  const [suruklenen, setSuruklenen] = React.useState<number | null>(null);
  const [hedef, setHedef] = React.useState<number | null>(null);
  // Sürükleme bittikten sonra gelen click'i yut (aksi halde sayfaya gider).
  const suruklendi = React.useRef(false);

  const duzenlenebilir = !!kullaniciId;

  async function kaydet(yeni: string[]) {
    const onceki = liste;
    setListe(yeni);
    if (!kullaniciId) return;
    const res = await panoKisayolKaydet(departman, yeni);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Kısayollar kaydedilemedi.");
    }
  }

  function tasi(from: number, to: number) {
    if (from === to) return;
    const yeni = [...liste];
    const [x] = yeni.splice(from, 1);
    yeni.splice(to, 0, x);
    kaydet(yeni);
  }

  const kullanilmayan = Object.keys(ISLEM).filter((k) => !liste.includes(k));

  // Havuz ikiye ayrılır: sayfaya giden kısayollar ve araç paneli kısayolları.
  // Menüde de ayrı başlıklar altında durur — biri gezinme, diğeri hesap.
  const bosSayfalar = kullanilmayan.filter((k) => !ISLEM[k].arac);
  const bosAraclar = kullanilmayan.filter((k) => ISLEM[k].arac);

  function gruplar(sec: (anahtar: string) => void): SatirAksiyon[] {
    return [
      {
        etiket: "Sayfalar",
        ikon: FileText,
        gizli: bosSayfalar.length === 0,
        altClassName: "w-56",
        altAksiyonlar: bosSayfalar.map((k) => ({
          etiket: ISLEM[k].etiket,
          ikon: ISLEM[k].ikon,
          onSecim: () => sec(k),
        })),
      },
      {
        etiket: "Araçlar",
        ikon: Wrench,
        gizli: bosAraclar.length === 0,
        altClassName: "w-56",
        altAksiyonlar: bosAraclar.map((k) => ({
          etiket: ISLEM[k].etiket,
          ikon: ISLEM[k].ikon,
          onSecim: () => sec(k),
        })),
      },
    ];
  }

  function menuAksiyonlari(i: number): SatirAksiyon[] {
    return [
      {
        etiket: "Bununla değiştir",
        ikon: Repeat,
        gizli: !duzenlenebilir || kullanilmayan.length === 0,
        altClassName: "w-44",
        altAksiyonlar: gruplar((k) =>
          kaydet(liste.map((x, idx) => (idx === i ? k : x))),
        ),
      },
      {
        etiket: "Kısayol ekle",
        ikon: Plus,
        gizli: !duzenlenebilir || kullanilmayan.length === 0,
        altClassName: "w-44",
        altAksiyonlar: gruplar((k) => kaydet([...liste, k])),
      },
      {
        etiket: "Varsayılana dön",
        ikon: RotateCcw,
        gizli: !duzenlenebilir,
        ayracOnce: true,
        onSecim: () => kaydet(varsayilan.filter((x) => x in ISLEM)),
      },
      {
        etiket: "Kaldır",
        ikon: X,
        // Son kısayol da kaldırılırsa şerit tamamen kaybolur ve geri getirme
        // yolu kalmaz — en az biri durmalı.
        gizli: !duzenlenebilir || liste.length <= 1,
        tehlike: true,
        ayracOnce: true,
        onSecim: () => kaydet(liste.filter((_, idx) => idx !== i)),
      },
    ];
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {liste.map((k, i) => {
        const islem = ISLEM[k];
        if (!islem) return null;
        const Ikon = islem.ikon;
        const sayi = islem.rozet?.(veri) ?? 0;
        return (
          <SatirMenu key={k} aksiyonlar={menuAksiyonlari(i)}>
            <button
              type="button"
              draggable={duzenlenebilir}
              onDragStart={() => {
                setSuruklenen(i);
                suruklendi.current = true;
              }}
              onDragEnd={() => {
                setSuruklenen(null);
                setHedef(null);
                // click, dragend'den sonra gelir; bir tur sonra serbest bırak.
                setTimeout(() => (suruklendi.current = false), 0);
              }}
              onDragOver={(e) => {
                if (suruklenen === null) return;
                e.preventDefault();
                setHedef(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (suruklenen !== null) tasi(suruklenen, i);
                setSuruklenen(null);
                setHedef(null);
              }}
              onClick={() => {
                if (suruklendi.current) return;
                if (islem.arac) aracAc(islem.arac);
                else if (islem.href) router.push(islem.href);
              }}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                suruklenen === i && "opacity-40",
                hedef === i && suruklenen !== i && "border-primary bg-primary/5",
              )}
            >
              <Ikon className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {islem.etiket}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {islem.alt}
                </span>
              </span>
              {sayi > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-primary/10 tabular-nums text-primary"
                >
                  {sayi}
                </Badge>
              )}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </SatirMenu>
        );
      })}
    </div>
  );
}


function Kart({
  ad,
  veri,
  istasyon,
}: {
  ad: KartAd;
  veri: PanoVerisi;
  istasyon?: string;
}) {
  switch (ad) {
    case "yonetimOzet":
      return <YonetimOzet veri={veri} />;
    case "istasyonKuyrugu":
      return <IstasyonKuyrugu veri={veri} />;
    case "emirlerim":
      return <Emirlerim veri={veri} istasyon={istasyon} />;
    case "onayBekleyen":
      return <OnayBekleyen veri={veri} />;
    case "siparisTakip":
      return <SiparisTakip veri={veri} />;
    case "kritikStok":
      return <KritikStok veri={veri} />;
    case "sonHareketler":
      return <SonHareketler veri={veri} />;
    case "alisTrendi":
      return <AlisTrendi veri={veri} />;
  }
}

/** Ortak kart kabuğu: başlık + ikon + sağda eylem. */
function Kutu({
  baslik,
  ikon: Ikon,
  sag,
  bos,
  genis,
  children,
}: {
  baslik: string;
  ikon: React.ComponentType<{ className?: string }>;
  sag?: React.ReactNode;
  /** Veri yoksa gösterilecek metin. */
  bos?: string;
  genis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-md border bg-card",
        genis && "xl:col-span-2",
      )}
    >
      {/* Başlık şeridi liste kartlarıyla aynı (ListHeader standardı) — doku dahil. */}
      <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-t-md border-b bg-primary/10 px-3 py-1.5">
        <BaslikDokusu />
        <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-primary">
          <Ikon className="size-4" />
          {baslik}
        </h2>
        {sag && <span className="relative z-10">{sag}</span>}
      </div>
      {bos ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{bos}</p>
      ) : (
        <div className="p-3">{children}</div>
      )}
    </div>
  );
}

function Metrik({
  etiket,
  deger,
  renk,
}: {
  etiket: string;
  deger: string;
  renk?: "rose" | "amber" | "emerald";
}) {
  return (
    <div className="px-3 first:pl-0">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      <div
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          renk === "rose" && "text-rose-600",
          renk === "amber" && "text-amber-600",
          renk === "emerald" && "text-emerald-600",
        )}
      >
        {deger}
      </div>
    </div>
  );
}


/** Aylık satın alma harcaması — panodaki tek zaman serisi, o yüzden grafik. */
function AlisTrendi({ veri }: { veri: PanoVerisi }) {
  const seri = veri.aylikAlis;
  const toplam = seri.reduce((t, a) => t + a.tutar, 0);
  const oncekiler = seri.slice(0, -1);
  const buAy = seri[seri.length - 1]?.tutar ?? 0;
  // Kıyas ortalaması: bu ay hariç: ay daha bitmediği için kendisiyle şişmesin.
  const ortalama = oncekiler.length
    ? oncekiler.reduce((t, a) => t + a.tutar, 0) / oncekiler.length
    : 0;
  const fark = ortalama > 0 ? ((buAy - ortalama) / ortalama) * 100 : 0;

  return (
    <Kutu
      baslik="Alış Harcaması"
      ikon={TrendingUp}
      bos={toplam === 0 ? "Son 6 ayda alış kaydı yok." : undefined}
      sag={
        <span className="text-xs text-muted-foreground">Son 6 ay</span>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums">
            {formatTL(buAy)}
          </span>
          <span className="text-xs text-muted-foreground">bu ay</span>
          {ortalama > 0 && (
            <span
              className={cn(
                "ml-auto text-xs tabular-nums",
                fark > 0 ? "text-rose-600" : "text-emerald-600",
              )}
            >
              {fark > 0 ? "+" : ""}
              {fark.toFixed(0)}% · önceki 5 ay ort.
            </span>
          )}
        </div>

        <ChartContainer config={ALIS_GRAFIK} className="h-40 w-full">
          <BarChart data={seri} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="etiket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(deger) => formatTL(Number(deger))}
                />
              }
            />
            <Bar dataKey="tutar" fill="var(--color-tutar)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </Kutu>
  );
}

function YonetimOzet({ veri }: { veri: PanoVerisi }) {
  const o = veri.ozet;
  return (
    <Kutu baslik="Özet" ikon={TrendingUp} genis>
      <div className="grid grid-cols-2 divide-x sm:grid-cols-3 xl:grid-cols-6">
        <Metrik etiket="Açık Emir" deger={String(o.acikEmir)} />
        <Metrik etiket="Üretimde" deger={String(o.uretimdeEmir)} />
        <Metrik etiket="Açık Talep" deger={String(o.acikTalep)} />
        <Metrik
          etiket="Geciken Sipariş"
          deger={String(o.gecikenSiparis)}
          renk={o.gecikenSiparis > 0 ? "rose" : undefined}
        />
        <Metrik
          etiket="Kritik Stok"
          deger={String(o.kritikStokAdet)}
          renk={o.kritikStokAdet > 0 ? "amber" : undefined}
        />
        <Metrik etiket="Bu Ay Alış" deger={formatTL(o.aylikAlisTutar)} />
      </div>
    </Kutu>
  );
}

function IstasyonKuyrugu({ veri }: { veri: PanoVerisi }) {
  const router = useRouter();
  const toplam = veri.istasyonKuyrugu.reduce((t, i) => t + i.adet, 0);
  return (
    <Kutu
      baslik="Hat Durumu"
      ikon={Factory}
      bos={toplam === 0 ? "Hatta iş yok." : undefined}
      sag={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => router.push("/uretim/fabrika")}
        >
          Fabrika <ArrowRight className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5">
        {veri.istasyonKuyrugu.map((i) => (
          <div key={i.slug} className="flex items-center gap-2.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: i.renk }}
            />
            <span className="w-28 shrink-0 truncate text-sm">{i.ad}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${toplam ? (i.adet / toplam) * 100 : 0}%`,
                  backgroundColor: i.renk,
                }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums">
              {i.adet || "—"}
            </span>
          </div>
        ))}
      </div>
    </Kutu>
  );
}

function Emirlerim({
  veri,
  istasyon,
}: {
  veri: PanoVerisi;
  istasyon?: string;
}) {
  const router = useRouter();
  // İstasyonu olan personel yalnız kendi kuyruğunu görür.
  const liste = istasyon
    ? veri.emirler.filter((e) => e.istasyonAd === istasyon)
    : veri.emirler;
  return (
    <Kutu
      baslik={istasyon ? `${istasyon} kuyruğu` : "Açık emirler"}
      ikon={Boxes}
      bos={liste.length === 0 ? "Sırada iş yok." : undefined}
      sag={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => router.push("/uretim/emirler")}
        >
          Tümü <ArrowRight className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-1">
        {liste.slice(0, 6).map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => router.push("/uretim/emirler")}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {e.id}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {e.urunAd}
              <span className="ml-1.5 text-muted-foreground">×{e.adet}</span>
            </span>
            {e.oncelik && e.oncelik !== "Normal" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  e.oncelik === "Acil"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {e.oncelik}
              </Badge>
            )}
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {e.tamamAdim}/{e.toplamAdim}
            </span>
          </button>
        ))}
      </div>
    </Kutu>
  );
}

function OnayBekleyen({ veri }: { veri: PanoVerisi }) {
  const router = useRouter();
  return (
    <Kutu
      baslik="Onay bekleyen talepler"
      ikon={ClipboardCheck}
      bos={
        veri.onayBekleyenTalep.length === 0
          ? "Onay bekleyen talep yok."
          : undefined
      }
      sag={
        veri.siparissizKalem > 0 ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {veri.siparissizKalem} kalem sipariş bekliyor
          </Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1">
        {veri.onayBekleyenTalep.slice(0, 6).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => router.push("/satin-alma/talepler")}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {t.id}
            </span>
            <span className="flex-1 text-sm">{t.kalem} kalem</span>
            <span className="text-xs text-muted-foreground">
              {formatTarih(t.tarih)}
            </span>
            <span className="text-sm font-medium tabular-nums">
              {formatTL(t.tutar)}
            </span>
          </button>
        ))}
      </div>
    </Kutu>
  );
}

function SiparisTakip({ veri }: { veri: PanoVerisi }) {
  const router = useRouter();
  const geciken = veri.bekleyenSiparis.filter((o) => o.gecikti).length;
  return (
    <Kutu
      baslik="Bekleyen siparişler"
      ikon={ShoppingCart}
      bos={
        veri.bekleyenSiparis.length === 0 ? "Bekleyen sipariş yok." : undefined
      }
      sag={
        <span className="flex items-center gap-2">
          {geciken > 0 && (
            <Badge variant="secondary" className="bg-rose-100 text-rose-800">
              {geciken} geciken
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => router.push("/satin-alma/siparisler")}
          >
            Tümü <ArrowRight className="size-3.5" />
          </Button>
        </span>
      }
    >
      <div className="flex flex-col gap-1">
        {veri.bekleyenSiparis.slice(0, 6).map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5"
          >
            {o.gecikti && (
              <AlertTriangle className="size-3.5 shrink-0 text-rose-600" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm">
              {o.malzemeAd}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {o.cariAd}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-amber-700">
              {o.kalan.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
              {o.birim}
            </span>
          </div>
        ))}
      </div>
    </Kutu>
  );
}

function KritikStok({ veri }: { veri: PanoVerisi }) {
  const router = useRouter();
  return (
    <Kutu
      baslik="Kritik stok"
      ikon={PackageSearch}
      bos={veri.kritikStok.length === 0 ? "Kritik stok yok." : undefined}
      sag={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => router.push("/stok-yonetimi")}
        >
          Stok <ArrowRight className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-1">
        {veri.kritikStok.slice(0, 8).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => router.push(`/stok-karti/${m.id}`)}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10"
          >
            <span className="min-w-0 flex-1 truncate text-sm">{m.ad}</span>
            {m.minStok != null && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                min {m.minStok.toLocaleString("tr-TR")}
              </span>
            )}
            <span
              className={cn(
                "shrink-0 text-sm font-medium tabular-nums",
                m.stok <= 0 ? "text-rose-600" : "text-amber-700",
              )}
            >
              {m.stok.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
              {m.birim}
            </span>
          </button>
        ))}
      </div>
    </Kutu>
  );
}

function SonHareketler({ veri }: { veri: PanoVerisi }) {
  const router = useRouter();
  return (
    <Kutu
      baslik="Son stok hareketleri"
      ikon={Boxes}
      bos={veri.sonHareketler.length === 0 ? "Hareket yok." : undefined}
      sag={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => router.push("/stok-yonetimi?bolum=hareketler")}
        >
          Tümü <ArrowRight className="size-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-1">
        {veri.sonHareketler.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5"
          >
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                h.tur === "Giriş"
                  ? "bg-emerald-100 text-emerald-800"
                  : h.tur === "Çıkış"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-blue-100 text-blue-800",
              )}
            >
              {h.tur}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-sm">{h.ad}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatTarih(h.tarih)}
            </span>
            <span className="shrink-0 text-sm tabular-nums">
              {h.miktar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
              {h.birim}
            </span>
          </div>
        ))}
      </div>
    </Kutu>
  );
}
