"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  X,
  ReceiptText,
  PackagePlus,
  Split,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TarihSecici } from "@/components/ui/tarih-secici";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { KartBaslik } from "@/components/ui/kart-baslik";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatTL,
  type Doviz,
  type Kur,
  type Malzeme,
  type SatinAlmaSarti,
} from "@/lib/data";
import { donusumVar, girisBirimi, stokMiktarina } from "@/lib/birim";
import { paraDegeri, paraMaskele, paraMetni } from "@/lib/para";
import { alisKaydet, depoKaydet, talepOlustur } from "@/lib/db/actions";

const DOVIZ_SEMBOL: Record<Doviz, string> = { TL: "₺", USD: "$", EUR: "€" };
function paraFmt(n: number, d: Doviz | undefined): string {
  // TL veya bilinmeyen/boş → ₺ biçimi.
  if (d !== "USD" && d !== "EUR") return formatTL(n);
  return `${DOVIZ_SEMBOL[d]}${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Yeni alış formu — fiş bilgileri kartı + hızlı malzeme ekleme + zengin
 * satırlar (mevcut stok / son alış fiyatı) + sağda özet.
 * Kaydet tek transaction'da stok girişi + stok hareketi + cari Alacak işler.
 */
type Satir = {
  malzemeId: string;
  /** Bu satırın alındığı tedarikçi (satır bazında firma). */
  cariId: string;
  miktar: number;
  birim: string;
  /** Maskeli para metni (1.234,56) — hesapta paraDegeri ile çözülür. */
  birimFiyat: string;
  /** Birim fiyatın dövizi. */
  doviz: Doviz;
  /** Malzemenin son (kayıtlı) alış fiyatı — karşılaştırma için. */
  sonFiyat: number;
  /** Malzemenin mevcut stoğu — bilgi. */
  mevcutStok: number;
};

const bugun = () => new Date().toISOString().slice(0, 10);

/**
 * Üretim planından gelen kalemleri (malzemeId + miktar) satın alma satırlarına
 * çevirir. Varsayılan tedarikçi malzemenin üretici carisi (tedarikçilerde ise);
 * fiyat o firmadan son alış, yoksa malzemenin genel birim fiyatı.
 */
function ilkSatirlar(
  kalemler:
    | { malzemeId: string; miktar: number; cariId?: string; fiyat?: number }[]
    | undefined,
  malzemeler: Malzeme[],
  tedarikciler: { id: string; ad: string }[],
  sonFiyatlar: { malzemeId: string; cariId: string; fiyat: number }[],
  sartlar: SatinAlmaSarti[] = [],
): Satir[] {
  if (!kalemler?.length) return [];
  const mMap = new Map(malzemeler.map((m) => [m.id, m]));
  const cariIdSet = new Set(tedarikciler.map((t) => t.id));
  const sfMap = new Map(
    sonFiyatlar.map((s) => [`${s.malzemeId}:${s.cariId}`, s.fiyat]),
  );
  const sartMap = new Map(sartlar.map((s) => [`${s.stokId}:${s.cariId}`, s]));
  const rows: Satir[] = [];
  for (const k of kalemler) {
    const m = mMap.get(k.malzemeId);
    if (!m) continue;
    // Öncelik kalemle gelen firma (örn. talepte seçilen); yoksa üretici cari.
    const varsayilan =
      k.cariId && cariIdSet.has(k.cariId)
        ? k.cariId
        : m.tedarikci && cariIdSet.has(m.tedarikci)
          ? m.tedarikci
          : "";
    // Fiyat önceliği: kalemle gelen > anlaşma şartı > son alış > kart fiyatı.
    const sart = varsayilan ? sartMap.get(`${m.id}:${varsayilan}`) : undefined;
    const fiyat =
      k.fiyat ||
      sart?.fiyat ||
      (varsayilan && sfMap.get(`${m.id}:${varsayilan}`)) ||
      m.birimFiyat;
    rows.push({
      malzemeId: m.id,
      cariId: varsayilan,
      miktar: k.miktar > 0 ? k.miktar : 1,
      birim: girisBirimi({
        stokBirimi: m.birim,
        alisBirimi: m.alisBirimi,
        alisCarpani: m.alisCarpani,
      }),
      birimFiyat: paraMetni(fiyat),
      doviz: (!k.fiyat && sart?.doviz) || m.doviz || "TL",
      sonFiyat: fiyat,
      mevcutStok: m.stok,
    });
  }
  return rows;
}

function Alan({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AlisForm({
  tedarikciler,
  malzemeler,
  depolar,
  sonFiyatlar = [],
  baslangicKalemler,
  kurlar = [],
  talepId,
  mod = "alis",
  talepModeller,
  talepUretim,
  baslangicDepo,
  baslangicFirma,
  mevcutKullaniciId,
  sartlar = [],
}: {
  tedarikciler: { id: string; ad: string }[];
  malzemeler: Malzeme[];
  depolar: string[];
  /** TCMB kurları (Ayarlar → Kurlar) — döviz satırlarının ₺ karşılığı için. */
  kurlar?: Kur[];
  /** Alış bir satın alma talebinden dönüştürülüyorsa talebin kodu. */
  talepId?: string;
  /** "talep": form talep hazırlığı olarak çalışır — kaydet TAL-#### oluşturur. */
  mod?: "alis" | "talep";
  /** Talep modunda: talebin hangi modeller için açıldığı (üretim planından). */
  talepModeller?: string;
  /** Talebi doğuran üretim planının bağlamı (müşteri/termin/öncelik). */
  talepUretim?: {
    musteri?: string;
    termin?: string;
    oncelik?: string;
  };
  /** Başlangıçta seçili depo (üretim planındaki hedef depo). */
  baslangicDepo?: string;
  /** Alış modunda başlangıç tedarikçisi (cari karttan "Yeni Alış"). */
  baslangicFirma?: string;
  /** Talep audit'i için — TODO: oturum gelince sunucudan çözülecek. */
  mevcutKullaniciId?: string;
  /** (malzeme, cari) → o tedarikçiden son alınan birim fiyat + tarih. */
  sonFiyatlar?: {
    malzemeId: string;
    cariId: string;
    fiyat: number;
    tarih: string;
  }[];
  /** Üretim planından/talepten aktarılan, önceden doldurulacak satırlar. */
  baslangicKalemler?: {
    malzemeId: string;
    miktar: number;
    cariId?: string;
    fiyat?: number;
  }[];
  /** Satın alma şartları — firma seçilince anlaşma fiyatı önerilir. */
  sartlar?: SatinAlmaSarti[];
}) {
  const router = useRouter();

  const talepModu = mod === "talep";
  const [tarih, setTarih] = React.useState(bugun);
  const [depoListe, setDepoListe] = React.useState(depolar);
  const [depo, setDepo] = React.useState(
    baslangicDepo && depolar.includes(baslangicDepo)
      ? baslangicDepo
      : (depolar[0] ?? ""),
  );
  const [yeniDepoAcik, setYeniDepoAcik] = React.useState(false);
  const [yeniDepoAd, setYeniDepoAd] = React.useState("");
  const [belgeNo, setBelgeNo] = React.useState("");
  const [aciklama, setAciklama] = React.useState(
    talepId
      ? `${talepId} talebinden alış`
      : baslangicKalemler?.length
        ? "Üretim planı malzeme ihtiyacı"
        : "",
  );
  // Talep modu: satır bazında firma (plan). Alış modu: TEK firma (fiş başında).
  const perFirma = talepModu;
  const firmaZorunlu = !talepModu;
  const [satirlar, setSatirlar] = React.useState<Satir[]>(() =>
    ilkSatirlar(
      baslangicKalemler,
      malzemeler,
      tedarikciler,
      sonFiyatlar,
      sartlar,
    ),
  );
  // Alış modunda fiş firması — cari karttan gelen firma ya da ön dolu satırların ilki.
  const [fisFirmaId, setFisFirmaId] = React.useState<string>(() => {
    const ilk = baslangicKalemler?.find((k) => k.cariId)?.cariId;
    return baslangicFirma ?? ilk ?? "";
  });
  // (malzeme, cari) → anlaşma şartı (fiyat + döviz önerisi).
  const sartMap = React.useMemo(
    () => new Map(sartlar.map((s) => [`${s.stokId}:${s.cariId}`, s])),
    [sartlar],
  );
  const [fiyatGuncelle, setFiyatGuncelle] = React.useState(true);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  // Talep modunda malzemeyi firmalara dağıtma modalı (satır index'i).
  const [dagitIdx, setDagitIdx] = React.useState<number | null>(null);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  // Hızlı ekleme etiketi: "Ad · birim · stok X · ₺fiyat".
  const araEtiket = (m: Malzeme) =>
    `${m.ad} · ${m.birim} · stok ${m.stok} · ${formatTL(m.birimFiyat)}`;
  const etiketMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [araEtiket(m), m])),
    [malzemeler],
  );
  const cariMap = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.id, t])),
    [tedarikciler],
  );
  const cariAdMap = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.ad, t])),
    [tedarikciler],
  );
  // (malzeme, cari) → son alış kaydı (fiyat + tarih).
  const sonFiyatMap = React.useMemo(
    () =>
      new Map(
        sonFiyatlar.map((s) => [
          `${s.malzemeId}:${s.cariId}`,
          { fiyat: s.fiyat, tarih: s.tarih },
        ]),
      ),
    [sonFiyatlar],
  );
  /** Firmaya göre son alış fiyatı; yoksa malzemenin genel fiyatı. */
  const firmaSonFiyat = React.useCallback(
    (malzemeId: string, cariId: string, genel: number) =>
      (cariId && sonFiyatMap.get(`${malzemeId}:${cariId}`)?.fiyat) || genel,
    [sonFiyatMap],
  );
  // Herhangi bir firmadan alış kaydı olan malzemeler — fiyat trendi yalnız
  // gerçek bir alış varsa gösterilir (yoksa karşılaştırma tabanı yok).
  const alisliMalzemeler = React.useMemo(
    () => new Set(sonFiyatlar.map((x) => x.malzemeId)),
    [sonFiyatlar],
  );
  /** Firmadan son alış kaydı (fiyat + tarih) — hovercard için. */
  const firmaSonKayit = (malzemeId: string, cariId: string) =>
    cariId ? sonFiyatMap.get(`${malzemeId}:${cariId}`) : undefined;

  // ── Kur dönüşümü (TCMB forex satış; birim başına) ─────────────────────
  const kurMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const k of kurlar)
      if (k.forexSatis > 0) m.set(k.kod, k.forexSatis / (k.birim || 1));
    return m;
  }, [kurlar]);
  /** Tutarın ₺ karşılığı; TL ise kendisi, kur yoksa null. */
  const tlKarsiligi = React.useCallback(
    (n: number, d: Doviz): number | null => {
      if (d === "TL") return n;
      const kur = kurMap.get(d);
      return kur ? n * kur : null;
    },
    [kurMap],
  );

  // ── Özet ──────────────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  const satirTutari = (s: Satir) => s.miktar * paraDegeri(s.birimFiyat);
  // Miktarlar birim bazında gruplanır (m² + adet toplamak anlamsız).
  const birimToplamlari = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of gecerli) m.set(s.birim, (m.get(s.birim) ?? 0) + s.miktar);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "tr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirlar]);
  const eksikFirma = gecerli.some((s) => !s.cariId);
  // Döviz bazında toplamlar (TL + her yabancı döviz ayrı satır).
  const dovizToplamlari = React.useMemo(() => {
    const m = new Map<Doviz, number>();
    for (const s of gecerli)
      m.set(s.doviz, (m.get(s.doviz) ?? 0) + satirTutari(s));
    return [...m.entries()].sort(([a], [b]) =>
      a === "TL" ? -1 : b === "TL" ? 1 : 0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirlar]);
  // Genel toplam ₺ — herhangi bir dövizin kuru yoksa null (gösterilemez).
  const genelToplamTL = dovizToplamlari.reduce<number | null>((t, [d, n]) => {
    if (t === null) return null;
    const tl = tlKarsiligi(n, d);
    return tl === null ? null : t + tl;
  }, 0);
  const dovizVar = dovizToplamlari.some(([d]) => d !== "TL");
  const kurEksik = dovizToplamlari.some(([d]) => d !== "TL" && !kurMap.has(d));
  // Tedarikçi bazında özet (₺ karşılığıyla; kuru olmayan döviz ham eklenir).
  const firmaOzeti = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of gecerli) {
      if (!s.cariId) continue;
      const tutar = satirTutari(s);
      m.set(
        s.cariId,
        (m.get(s.cariId) ?? 0) + (tlKarsiligi(tutar, s.doviz) ?? tutar),
      );
    }
    return [...m.entries()].map(([id, tutar]) => ({
      ad: cariMap.get(id)?.ad ?? id,
      tutar,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirlar, cariMap, tlKarsiligi]);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function malzemeEkle(m: Malzeme) {
    // Alış modunda fiş firması sabit; talep modunda malzemenin üretici carisi.
    const varsayilan = !perFirma
      ? fisFirmaId
      : m.tedarikci && cariMap.has(m.tedarikci)
        ? m.tedarikci
        : "";
    // Fiyat önceliği: anlaşma şartı > son alış > kart fiyatı.
    const sart = varsayilan ? sartMap.get(`${m.id}:${varsayilan}`) : undefined;
    const fiyat = sart?.fiyat ?? firmaSonFiyat(m.id, varsayilan, m.birimFiyat);
    setSatirlar((s) => [
      ...s,
      {
        malzemeId: m.id,
        cariId: varsayilan,
        miktar: 1,
        // Alış birimi tanımlıysa miktar onunla girilir; stoğa çevrimi
        // sunucu yapar (bkz. lib/birim.ts).
        birim: girisBirimi({
          stokBirimi: m.birim,
          alisBirimi: m.alisBirimi,
          alisCarpani: m.alisCarpani,
        }),
        birimFiyat: paraMetni(fiyat),
        doviz: sart?.doviz ?? m.doviz ?? "TL",
        sonFiyat: fiyat,
        mevcutStok: m.stok,
      },
    ]);
  }

  async function depoEkle() {
    const ad = yeniDepoAd.trim();
    if (!ad) {
      toast.error("Depo adı gerekli");
      return;
    }
    const res = await depoKaydet({
      id: "",
      ad,
      sehir: "",
      kapasite: 0,
      doluluk: 0,
      durum: "Aktif",
    });
    if (!res.ok) {
      toast.error("Depo eklenemedi.");
      return;
    }
    setDepoListe((l) => (l.includes(ad) ? l : [...l, ad]));
    setDepo(ad);
    setYeniDepoAcik(false);
    setYeniDepoAd("");
    toast.success("Depo eklendi");
  }

  /** Alış modunda fiş firması değişince tüm satırlara uygular + yeniden fiyatlar. */
  function fisFirmaSec(cariId: string) {
    setFisFirmaId(cariId);
    setSatirlar((prev) =>
      prev.map((s) => {
        const m = malzemeMap.get(s.malzemeId);
        const genel = m?.birimFiyat ?? s.sonFiyat;
        const sart = cariId
          ? sartMap.get(`${s.malzemeId}:${cariId}`)
          : undefined;
        const fiyat = sart?.fiyat ?? firmaSonFiyat(s.malzemeId, cariId, genel);
        return {
          ...s,
          cariId,
          sonFiyat: fiyat,
          birimFiyat: paraMetni(fiyat),
          ...(sart ? { doviz: sart.doviz } : {}),
        };
      }),
    );
  }

  /** Satır firması değişince o firmanın şart/son alış fiyatını uygula. */
  function firmaSec(i: number, cariId: string) {
    setSatirlar((prev) => {
      const n = [...prev];
      const s = n[i];
      const m = malzemeMap.get(s.malzemeId);
      const genel = m?.birimFiyat ?? s.sonFiyat;
      const sart = cariId ? sartMap.get(`${s.malzemeId}:${cariId}`) : undefined;
      const fiyat = sart?.fiyat ?? firmaSonFiyat(s.malzemeId, cariId, genel);
      n[i] = {
        ...s,
        cariId,
        sonFiyat: fiyat,
        birimFiyat: paraMetni(fiyat),
        ...(sart ? { doviz: sart.doviz } : {}),
      };
      return n;
    });
  }
  function satirGuncelle(i: number, degisim: Partial<Satir>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  /** Bir satırı firma dağılımına göre çok satıra böler (talep modu). */
  function dagitUygula(
    idx: number,
    dagilim: { cariId: string; miktar: number; fiyat: string; doviz: Doviz }[],
  ) {
    setSatirlar((prev) => {
      const kaynak = prev[idx];
      if (!kaynak) return prev;
      const yeniler: Satir[] = dagilim.map((d) => ({
        ...kaynak,
        cariId: d.cariId,
        miktar: d.miktar,
        birimFiyat: d.fiyat,
        doviz: d.doviz,
        sonFiyat: paraDegeri(d.fiyat),
      }));
      const n = [...prev];
      n.splice(idx, 1, ...yeniler);
      return n;
    });
    setDagitIdx(null);
  }

  async function kaydet() {
    if (gecerli.length === 0) {
      toast.error("En az bir malzeme satırı gerekli");
      return;
    }
    if (firmaZorunlu && !fisFirmaId) {
      toast.error("Tedarikçi seçin");
      return;
    }
    // Talep modu: alış değil, TAL-#### talebi oluşturulur (firma/fiyat öneri).
    if (talepModu) {
      setKaydediliyor(true);
      const res = await talepOlustur(
        gecerli.map((s) => ({
          malzemeId: s.malzemeId,
          malzemeAd: malzemeMap.get(s.malzemeId)?.ad ?? s.malzemeId,
          miktar: s.miktar,
          birim: s.birim,
          cariId: s.cariId || undefined,
          cariAd: s.cariId ? cariMap.get(s.cariId)?.ad : undefined,
          tahminiFiyat: paraDegeri(s.birimFiyat) || undefined,
        })),
        {
          kaynak: talepModeller ? "Üretim Planı" : "Manuel",
          modeller: talepModeller,
          aciklama: aciklama.trim() || undefined,
          depo: depo || undefined,
          uretimMusteri: talepUretim?.musteri,
          uretimTermin: talepUretim?.termin,
          uretimOncelik: talepUretim?.oncelik,
          kullaniciId: mevcutKullaniciId || undefined,
        },
      );
      setKaydediliyor(false);
      if (!res.ok || !res.id) {
        toast.error(res.error ?? "Talep oluşturulamadı.");
        return;
      }
      toast.success(`Satın alma talebi oluşturuldu (${res.id})`);
      router.push("/satin-alma/talepler");
      return;
    }
    setKaydediliyor(true);
    const res = await alisKaydet({
      tarih,
      depo,
      belgeNo: belgeNo.trim() || undefined,
      aciklama: aciklama.trim() || undefined,
      satirlar: gecerli.map((s) => ({
        malzemeId: s.malzemeId,
        malzemeAd: malzemeMap.get(s.malzemeId)?.ad ?? s.malzemeId,
        // Alış tek firmalı: tüm satırlara fiş firması yazılır.
        cariId: fisFirmaId,
        cariAd: cariMap.get(fisFirmaId)?.ad ?? "",
        miktar: s.miktar,
        birim: s.birim,
        birimFiyat: paraDegeri(s.birimFiyat),
      })),
      fiyatGuncelle,
      talepId,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Alış kaydedilemedi.");
      return;
    }
    toast.success(
      `Alış kaydedildi (${res.id}) — stok girişi ve cari işlemi oluşturuldu`,
    );
    router.push("/satin-alma");
  }

  const aktifMalzemeler = malzemeler.filter((m) => m.durum === "Aktif");

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit — geri + Kaydet */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/satin-alma" aria-label="Satın almalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {talepModu ? "Yeni Satın Alma Talebi" : "Yeni Alış"}
        </span>
        {talepId && (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {talepId}
          </Badge>
        )}
        {talepModu && talepModeller && (
          <span className="text-sm text-muted-foreground">{talepModeller}</span>
        )}
        <Button
          className="ml-auto"
          onClick={kaydet}
          disabled={
            gecerli.length === 0 ||
            (firmaZorunlu && !fisFirmaId) ||
            kaydediliyor
          }
        >
          {kaydediliyor
            ? talepModu
              ? "Oluşturuluyor..."
              : "Kaydediliyor..."
            : talepModu
              ? "Talep Oluştur"
              : "Kaydet"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: fiş bilgileri + satırlar ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Fiş bilgileri */}
          <div className="rounded-md border bg-card">
            <KartBaslik ikon={ReceiptText} baslik="Fiş Bilgileri" />
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
              {!talepModu && (
                <Alan label="Tedarikçi">
                  <SearchSelect
                    items={tedarikciler.map((t) => t.ad)}
                    value={cariMap.get(fisFirmaId)?.ad ?? null}
                    onValueChange={(ad) =>
                      fisFirmaSec(ad ? (cariAdMap.get(ad)?.id ?? "") : "")
                    }
                    placeholder="Firma seç"
                    emptyText="Tedarikçi yok"
                    className={cn(!fisFirmaId && "ring-1 ring-rose-300")}
                  />
                </Alan>
              )}
              <Alan label="Tarih">
                <TarihSecici
                  deger={tarih}
                  onChange={setTarih}
                  temizlenebilir={false}
                />
              </Alan>
              <Alan label="Depo">
                <SearchSelect
                  items={depoListe}
                  value={depo || null}
                  onValueChange={(v) => setDepo(v ?? "")}
                  placeholder="Depo"
                  addLabel="Yeni depo ekle"
                  onAdd={() => {
                    setYeniDepoAd("");
                    setYeniDepoAcik(true);
                  }}
                />
              </Alan>
              {!talepModu && (
                <Alan label="Belge No">
                  <Input
                    placeholder="Fatura/irsaliye (ops.)"
                    value={belgeNo}
                    onChange={(e) => setBelgeNo(e.target.value)}
                  />
                </Alan>
              )}
            </div>
          </div>

          {/* Satırlar */}
          <div className="overflow-hidden rounded-md border bg-card">
            <KartBaslik
              ikon={PackagePlus}
              baslik="Malzemeler"
              sag={
                <span className="text-xs text-muted-foreground">
                  {gecerli.length} kalem
                </span>
              }
            />
            {/* Hızlı ekleme */}
            <div className="border-b bg-muted/30 p-2.5">
              <SearchSelect
                items={aktifMalzemeler.map(araEtiket)}
                value={null}
                onValueChange={(secim) => {
                  const m = secim ? etiketMap.get(secim) : undefined;
                  if (m) malzemeEkle(m);
                }}
                placeholder="Malzeme ara ve ekle…"
                emptyText="Malzeme bulunamadı"
              />
            </div>

            {satirlar.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Yukarıdaki kutudan malzeme aratıp ekleyin.
              </p>
            ) : (
              <>
                <div
                  className={cn(
                    "grid items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                    perFirma
                      ? "grid-cols-[1fr_170px_120px_96px_100px_110px_36px]"
                      : "grid-cols-[1fr_120px_96px_100px_110px_36px]",
                  )}
                >
                  <span>Malzeme</span>
                  {perFirma && <span>Firma</span>}
                  <span>Miktar</span>
                  <span>Birim Fiyat</span>
                  <span>Döviz</span>
                  <span className="text-right">Tutar</span>
                  <span />
                </div>
                <div className="divide-y">
                  {satirlar.map((s, i) => {
                    const m = malzemeMap.get(s.malzemeId);
                    const fark = paraDegeri(s.birimFiyat) - s.sonFiyat;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "grid items-center gap-2 px-3 py-2",
                          perFirma
                            ? "grid-cols-[1fr_170px_120px_96px_100px_110px_36px]"
                            : "grid-cols-[1fr_120px_96px_100px_110px_36px]",
                        )}
                      >
                        <div className="min-w-0">
                          <HoverCard>
                            <HoverCardTrigger
                              delay={0}
                              closeDelay={0}
                              render={
                                <div className="w-fit max-w-full cursor-default truncate text-sm font-medium">
                                  {m?.ad ?? s.malzemeId}
                                </div>
                              }
                            />
                            <HoverCardContent align="start" className="w-64">
                              {(() => {
                                const kayit = firmaSonKayit(
                                  s.malzemeId,
                                  s.cariId,
                                );
                                const firmaAd = cariMap.get(s.cariId)?.ad;
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="text-sm font-medium">
                                      {m?.ad ?? s.malzemeId}
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs">
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Stok
                                        </span>
                                        <span className="tabular-nums">
                                          {s.mevcutStok} {s.birim}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Firma
                                        </span>
                                        <span className="truncate">
                                          {firmaAd ?? "—"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Son alış
                                        </span>
                                        <span className="tabular-nums">
                                          {paraFmt(
                                            kayit ? kayit.fiyat : s.sonFiyat,
                                            s.doviz,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          Tarih
                                        </span>
                                        <span className="tabular-nums">
                                          {kayit?.tarih ?? "kayıt yok"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        {/* Firma (yalnız talep modunda satır bazında) + Dağıt */}
                        {perFirma && (
                          <div className="flex items-center gap-1">
                            <SearchSelect
                              items={tedarikciler.map((t) => t.ad)}
                              value={cariMap.get(s.cariId)?.ad ?? null}
                              onValueChange={(ad) =>
                                firmaSec(
                                  i,
                                  ad ? (cariAdMap.get(ad)?.id ?? "") : "",
                                )
                              }
                              placeholder="Firma seç"
                              emptyText="Tedarikçi yok"
                              className="h-8 min-w-0 flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Firmalara dağıt"
                              title="Firmalara dağıt"
                              onClick={() => setDagitIdx(i)}
                            >
                              <Split className="size-3.5" />
                            </Button>
                          </div>
                        )}
                        <div className="relative">
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
                            className="h-8 pr-11 tabular-nums"
                          />
                          {s.birim && (
                            <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {s.birim}
                            </span>
                          )}
                          {/* Çevrim önizlemesi: kullanıcı stoğa ne gireceğini
                              fişi kaydetmeden görsün. */}
                          {(() => {
                            const m = malzemeMap.get(s.malzemeId);
                            if (!m) return null;
                            const b = {
                              stokBirimi: m.birim,
                              alisBirimi: m.alisBirimi,
                              alisCarpani: m.alisCarpani,
                            };
                            if (!donusumVar(b) || !s.miktar) return null;
                            return (
                              <span className="absolute top-full left-0 mt-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
                                ={" "}
                                {stokMiktarina(b, s.miktar).toLocaleString(
                                  "tr-TR",
                                  { maximumFractionDigits: 3 },
                                )}{" "}
                                {m.birim}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={s.birimFiyat}
                            onChange={(e) =>
                              satirGuncelle(i, {
                                birimFiyat: paraMaskele(e.target.value),
                              })
                            }
                            className="h-8 pr-5 tabular-nums"
                          />
                          {alisliMalzemeler.has(s.malzemeId) &&
                            s.sonFiyat > 0.005 &&
                            Math.abs(fark) > 0.005 && (
                              <TooltipProvider delay={0}>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <span
                                        className={cn(
                                          "absolute top-1/2 right-1.5 -translate-y-1/2 cursor-help",
                                          fark > 0
                                            ? "text-rose-500"
                                            : "text-emerald-600",
                                        )}
                                      />
                                    }
                                  >
                                    {fark > 0 ? (
                                      <TrendingUp className="size-3.5" />
                                    ) : (
                                      <TrendingDown className="size-3.5" />
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Son alışa göre{" "}
                                    {s.sonFiyat > 0 && (
                                      <span className="font-semibold tabular-nums">
                                        %
                                        {Math.abs(
                                          (fark / s.sonFiyat) * 100,
                                        ).toLocaleString("tr-TR", {
                                          maximumFractionDigits: 1,
                                        })}{" "}
                                      </span>
                                    )}
                                    {fark > 0 ? "pahalı" : "ucuz"} (
                                    {paraFmt(Math.abs(fark), s.doviz)} fark)
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </div>
                        <SearchSelect
                          items={["TL", "USD", "EUR"]}
                          value={s.doviz}
                          onValueChange={(v) =>
                            satirGuncelle(i, { doviz: (v as Doviz) || "TL" })
                          }
                          className="h-8 px-2"
                        />
                        <span className="flex flex-col items-end text-right">
                          <span className="text-sm font-medium tabular-nums">
                            {paraFmt(satirTutari(s), s.doviz)}
                          </span>
                          {s.doviz !== "TL" &&
                            (() => {
                              const tl = tlKarsiligi(satirTutari(s), s.doviz);
                              return (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {tl !== null
                                    ? `≈ ${formatTL(tl)}`
                                    : "kur yok"}
                                </span>
                              );
                            })()}
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
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Sağ: özet ── */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Alış Özeti
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {genelToplamTL !== null ? (
                <>
                  {dovizVar && (
                    <span className="mr-0.5 font-normal text-muted-foreground">
                      ≈
                    </span>
                  )}
                  {formatTL(genelToplamTL)}
                </>
              ) : (
                "—"
              )}
            </p>
            {/* Döviz kırılımı — birden fazla döviz varsa ayrı toplamlar */}
            {dovizVar && (
              <div className="mt-2 flex flex-col gap-1 rounded-md border bg-muted/30 p-2.5 text-xs">
                {dovizToplamlari.map(([d, n]) => {
                  const tl = tlKarsiligi(n, d);
                  return (
                    <div
                      key={d}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-medium tabular-nums">
                        {paraFmt(n, d)}
                      </span>
                      {d !== "TL" && (
                        <span className="text-muted-foreground tabular-nums">
                          {tl !== null
                            ? `≈ ${formatTL(tl)} (kur ${(kurMap.get(d) ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 4 })})`
                            : "kur yok"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {kurEksik && (
                  <p className="text-rose-600">
                    Kur bilgisi eksik — Ayarlar → Kurlar&apos;dan güncelleyin.
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kalem sayısı</span>
                <span className="tabular-nums">{gecerli.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">Toplam miktar</span>
                {birimToplamlari.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {birimToplamlari.map(([birim, m]) => (
                      <span
                        key={birim}
                        className="inline-flex items-baseline gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs whitespace-nowrap"
                      >
                        <span className="font-semibold tabular-nums">
                          {m.toLocaleString("tr-TR", {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-muted-foreground">{birim}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {firmaOzeti.length > 0 && (
              <div className="mt-3 rounded-md border bg-muted/30 p-2.5">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Tedarikçiler ({firmaOzeti.length})
                </p>
                <div className="mt-1.5 flex flex-col gap-1 text-xs">
                  {firmaOzeti.map((f) => (
                    <div
                      key={f.ad}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">{f.ad}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatTL(f.tutar)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {firmaZorunlu && !fisFirmaId && (
              <p className="mt-2 text-xs text-rose-600">
                Fiş bilgilerinde tedarikçi seçin.
              </p>
            )}

            <div className="my-3 h-px bg-border" />
            {talepModu ? (
              <p className="rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                Talep stoku ve cariyi etkilemez; onaylandıktan sonra tedarik
                sürecinde mal kabulle stoğa girer. Firma ve fiyatlar öneri
                olarak talebe yazılır.
              </p>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFiyatGuncelle((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFiyatGuncelle((v) => !v);
                  }
                }}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    Birim fiyatları güncelle
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Satır fiyatı malzemenin birim fiyatına yazılır (son alış).
                  </span>
                </span>
                <Switch
                  checked={fiyatGuncelle}
                  className="pointer-events-none mt-0.5 shrink-0 data-checked:bg-emerald-600"
                />
              </div>
            )}
            <div className="mt-3">
              <Textarea
                placeholder="Açıklama (opsiyonel)"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Firmalara dağıtma modalı (talep hazırlığı) */}
      {dagitIdx !== null && satirlar[dagitIdx] && (
        <DagitModal
          satir={satirlar[dagitIdx]}
          malzemeAd={
            malzemeMap.get(satirlar[dagitIdx].malzemeId)?.ad ??
            satirlar[dagitIdx].malzemeId
          }
          tedarikciler={tedarikciler}
          cariMap={cariMap}
          cariAdMap={cariAdMap}
          onKapat={() => setDagitIdx(null)}
          onUygula={(dagilim) => dagitUygula(dagitIdx, dagilim)}
        />
      )}

      {/* Yeni depo modalı */}
      <Dialog open={yeniDepoAcik} onOpenChange={setYeniDepoAcik}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Yeni Depo</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Depo adı"
            value={yeniDepoAd}
            onChange={(e) => setYeniDepoAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                depoEkle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniDepoAcik(false)}>
              İptal
            </Button>
            <Button onClick={depoEkle} disabled={!yeniDepoAd.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DAĞITMA MODALI (talep hazırlığı — malzemeyi firmalara böl)         */
/* ------------------------------------------------------------------ */
/** Dağıtım özet şeridindeki tek metrik — ya sayı+birim ya da durum metni. */
function DagitMetrik({
  etiket,
  deger,
  birim,
  metin,
  tone,
}: {
  etiket: string;
  /** Sayısal değer (metin verilmediyse). */
  deger?: string;
  birim?: string;
  /** Sayı yerine gösterilecek durum metni (örn. "Tamamı dağıtıldı"). */
  metin?: string;
  tone?: "emerald" | "rose" | "amber";
}) {
  const renk = cn(
    tone === "emerald" && "text-emerald-600",
    tone === "rose" && "text-rose-600",
    tone === "amber" && "text-amber-600",
  );
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {etiket}
      </div>
      {metin ? (
        // Durum metni sığmazsa kırpılmak yerine alt satıra iner.
        <div
          className={cn(
            "mt-0.5 text-base leading-tight font-semibold text-balance",
            renk,
          )}
        >
          {metin}
        </div>
      ) : (
        <div
          className={cn(
            "mt-0.5 truncate text-lg font-semibold tabular-nums",
            renk,
          )}
        >
          {deger}
          {birim && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {birim}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DagitModal({
  satir,
  malzemeAd,
  tedarikciler,
  cariMap,
  cariAdMap,
  onKapat,
  onUygula,
}: {
  satir: Satir;
  malzemeAd: string;
  tedarikciler: { id: string; ad: string }[];
  cariMap: Map<string, { id: string; ad: string }>;
  cariAdMap: Map<string, { id: string; ad: string }>;
  onKapat: () => void;
  onUygula: (
    dagilim: { cariId: string; miktar: number; fiyat: string; doviz: Doviz }[],
  ) => void;
}) {
  type Row = { cariAd: string | null; miktar: string; fiyat: string };
  const [rows, setRows] = React.useState<Row[]>([
    {
      cariAd: cariMap.get(satir.cariId)?.ad ?? null,
      miktar: String(satir.miktar),
      fiyat: satir.birimFiyat,
    },
  ]);

  // Yalnız firması seçili satırlar dağıtıma sayılır — yeni boş satır eklemek
  // kalanı düşürmez.
  const dolu = rows.filter((r) => r.cariAd);
  const toplam = dolu.reduce((t, r) => t + (Number(r.miktar) || 0), 0);
  const kalan = satir.miktar - toplam;
  const tam = Math.abs(kalan) < 1e-9;
  const asim = kalan < -1e-9;
  // Dağıtılan miktarın toplam içindeki payı (aşımda çubuk dolu kalır).
  const oran =
    satir.miktar > 0 ? Math.min(1, toplam / satir.miktar) : toplam > 0 ? 1 : 0;
  const toplamTutar = dolu.reduce(
    (t, r) => t + (Number(r.miktar) || 0) * paraDegeri(r.fiyat),
    0,
  );
  const seciliAdlar = dolu.map((r) => r.cariAd);
  // Firması boş satırlar yok sayılır; dolu olanların miktarı pozitif olmalı.
  const gecerli =
    dolu.length > 0 &&
    dolu.every((r) => Number(r.miktar) > 0) &&
    new Set(seciliAdlar).size === seciliAdlar.length;

  function guncelle(i: number, d: Partial<Row>) {
    setRows((arr) => arr.map((x, j) => (j === i ? { ...x, ...d } : x)));
  }
  function ekle() {
    setRows((arr) => [
      ...arr,
      {
        cariAd: null,
        miktar: String(Math.max(0, kalan)),
        fiyat: satir.birimFiyat,
      },
    ]);
  }
  function sil(i: number) {
    setRows((arr) => arr.filter((_, j) => j !== i));
  }

  function uygula() {
    if (!gecerli) return;
    onUygula(
      dolu.map((r) => ({
        cariId: cariAdMap.get(r.cariAd ?? "")?.id ?? "",
        miktar: Number(r.miktar),
        fiyat: r.fiyat,
        doviz: satir.doviz,
      })),
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Firmalara Dağıt — {malzemeAd}</DialogTitle>
          <DialogDescription className="sr-only">
            {malzemeAd} için istenen miktarı firmalara bölün.
          </DialogDescription>
        </DialogHeader>

        {/* Dağıtım özeti: toplam / dağıtılan / kalan + ilerleme çubuğu */}
        <div className="rounded-md border bg-muted/30 p-3">
          {/* Kalan sütunu geniş: "Tamamı dağıtıldı" gibi durum metni sığsın. */}
          <div className="grid grid-cols-[1fr_1fr_0.8fr_1.4fr] divide-x">
            <DagitMetrik
              etiket="İstenen"
              deger={satir.miktar.toLocaleString("tr-TR")}
              birim={satir.birim}
            />
            <DagitMetrik
              etiket="Dağıtılan"
              deger={toplam.toLocaleString("tr-TR", {
                maximumFractionDigits: 2,
              })}
              birim={satir.birim}
            />
            <DagitMetrik
              etiket="Firma"
              deger={String(dolu.length)}
              birim="firma"
            />
            {tam ? (
              // Tamamlandı — sayı yerine durum metni.
              <DagitMetrik
                etiket="Kalan"
                metin="Tamamı dağıtıldı"
                tone="emerald"
              />
            ) : (
              <DagitMetrik
                etiket={asim ? "Aşım" : "Kalan"}
                deger={Math.abs(kalan).toLocaleString("tr-TR", {
                  maximumFractionDigits: 2,
                })}
                birim={satir.birim}
                tone={asim ? "rose" : "amber"}
              />
            )}
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                tam ? "bg-emerald-500" : asim ? "bg-rose-500" : "bg-amber-500",
              )}
              style={{ width: `${oran * 100}%` }}
            />
          </div>

          {toplamTutar > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Dağıtılan tutar</span>
              <span className="font-medium tabular-nums">
                {formatTL(toplamTutar)}
                {satir.doviz !== "TL" && ` ${satir.doviz}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_110px_110px_32px] gap-2 px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <span>Firma</span>
            <span>Miktar</span>
            <span>Birim Fiyat</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_110px_110px_32px] items-center gap-2"
            >
              <SearchSelect
                items={tedarikciler
                  .filter(
                    (t) => t.ad === r.cariAd || !seciliAdlar.includes(t.ad),
                  )
                  .map((t) => t.ad)}
                value={r.cariAd}
                onValueChange={(v) => guncelle(i, { cariAd: v })}
                placeholder="Firma seç"
                emptyText="Tedarikçi yok"
                className={cn("h-8", !r.cariAd && "ring-1 ring-rose-300")}
              />
              <Input
                type="number"
                min={0}
                step="any"
                value={r.miktar}
                onChange={(e) => guncelle(i, { miktar: e.target.value })}
                className={cn(
                  "h-8 text-right tabular-nums",
                  !(Number(r.miktar) > 0) && "ring-1 ring-rose-300",
                )}
              />
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={r.fiyat}
                onChange={(e) =>
                  guncelle(i, { fiyat: paraMaskele(e.target.value) })
                }
                className="h-8 text-right tabular-nums"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Kaldır"
                disabled={rows.length === 1}
                onClick={() => sil(i)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <button
            type="button"
            onClick={ekle}
            disabled={rows.length >= tedarikciler.length}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Split className="size-3.5" /> Firma ekle
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Dağıtım, talepte firma başına ayrı satır olarak kaydedilir; sipariş
          değildir. Sipariş, tedarik süreci başladıktan sonra talep detayından
          verilir — firma ve miktar buradan hazır gelir. Toplam istenen miktarı
          aşamaz.
        </p>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Vazgeç
          </Button>
          <Button size="sm" disabled={!gecerli} onClick={uygula}>
            <Split className="size-3.5" /> Dağıt ({dolu.length} firma)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
