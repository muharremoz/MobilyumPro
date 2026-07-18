"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Factory,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
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
  | "yonetimOzet";

const DEPARTMAN_KART: Record<string, KartAd[]> = {
  Üretim: ["istasyonKuyrugu", "emirlerim", "kritikStok"],
  "Satın Alma": ["onayBekleyen", "siparisTakip", "kritikStok"],
  Depo: ["kritikStok", "siparisTakip", "sonHareketler"],
  Yönetim: [
    "yonetimOzet",
    "istasyonKuyrugu",
    "onayBekleyen",
    "siparisTakip",
    "kritikStok",
  ],
};
// Modülü olmayan departmanlar (Muhasebe, Sevkiyat) yönetim özetini görür.
const VARSAYILAN_KART: KartAd[] = ["yonetimOzet", "kritikStok"];

export function GenelBakis({
  veri,
  kullaniciAd,
  departman,
  departmanlar,
  istasyon,
  yonetici,
}: {
  veri: PanoVerisi;
  kullaniciAd: string;
  /** Giriş yapan kullanıcının departmanı (oturum gelene kadar prop). */
  departman?: string;
  departmanlar: string[];
  /** Üretim personelinin istasyonu — "istasyonumdaki iş" için. */
  istasyon?: string;
  yonetici: boolean;
}) {
  const [secili, setSecili] = React.useState(departman ?? "Yönetim");
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
        {yonetici && (
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Departman</span>
            <SearchSelect
              items={departmanlar}
              value={secili}
              onValueChange={(v) => v && setSecili(v)}
              placeholder="Departman"
              className="w-44"
            />
          </label>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {kartlar.map((k) => (
          <Kart key={k} ad={k} veri={veri} istasyon={istasyon} />
        ))}
      </div>
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
      {/* Başlık şeridi liste kartlarıyla aynı (ListHeader standardı). */}
      <div className="flex items-center justify-between gap-3 border-b bg-primary/10 px-3 py-1.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Ikon className="size-4" />
          {baslik}
        </h2>
        {sag}
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
