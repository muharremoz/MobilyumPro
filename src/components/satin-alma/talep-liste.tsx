"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ExternalLink,
  PackageCheck,
  Play,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListHeader } from "@/components/ui/list-header";
import { SearchSelect } from "@/components/ui/search-select";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useOnay } from "@/components/ui/confirm-dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  type SatinAlmaTalep,
  type TalepSatiri,
  type TalepDurum,
  type TalepSatirDurum,
} from "@/lib/data";
import {
  talepOnayla,
  talepReddet,
  talepBaslat,
  siparisOlustur,
  talepSil,
} from "@/lib/db/actions";
import { paraDegeri, paraMaskele, paraMetni } from "@/lib/para";

const DURUM_RENK: Record<TalepDurum, string> = {
  Beklemede: "bg-amber-100 text-amber-800",
  Onaylandı: "bg-blue-100 text-blue-800",
  Reddedildi: "bg-rose-100 text-rose-800",
  "Tedarik Sürecinde": "bg-violet-100 text-violet-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
};

const SATIR_DURUM_RENK: Record<TalepSatirDurum, string> = {
  Bekliyor: "bg-slate-100 text-slate-700",
  "Sipariş Verildi": "bg-blue-100 text-blue-800",
  Kısmi: "bg-amber-100 text-amber-800",
  "Tedarik Edildi": "bg-emerald-100 text-emerald-800",
};

const DURUMLAR: TalepDurum[] = [
  "Beklemede",
  "Onaylandı",
  "Reddedildi",
  "Tedarik Sürecinde",
  "Tamamlandı",
];

function DurumBadge({ durum }: { durum: TalepDurum }) {
  return (
    <Badge variant="secondary" className={DURUM_RENK[durum]}>
      {durum}
    </Badge>
  );
}

/** "Ad × N, Ad2 × M" metnini adlara ve toplam adede ayırır (Adet kolonu). */
function modelParcala(modeller?: string): {
  adlar: string;
  adet: number | null;
} {
  if (!modeller) return { adlar: "", adet: null };
  let toplam = 0;
  let bulundu = false;
  const adlar = modeller.split(", ").map((parca) => {
    const m = /^(.*) × (\d+)$/.exec(parca.trim());
    if (!m) return parca;
    toplam += Number(m[2]);
    bulundu = true;
    return m[1];
  });
  return { adlar: adlar.join(", "), adet: bulundu ? toplam : null };
}

/** Tam tedarik edilen satır sayısı. */
const tamamSatir = (t: SatinAlmaTalep) =>
  t.satirlar.filter((s) => s.durum === "Tedarik Edildi").length;

/** Miktar ağırlıklı tedarik oranı (0–1) — kısmi teslimatlar da sayılır. */
function tedarikOrani(t: SatinAlmaTalep) {
  if (t.satirlar.length === 0) return 0;
  const oran = t.satirlar.reduce(
    (top, s) =>
      top + Math.min(1, s.miktar > 0 ? s.tedarikEdilen / s.miktar : 0),
    0,
  );
  return oran / t.satirlar.length;
}

/** Bir firma grubundaki tek kalem. Aynı talep satırı birden çok firmaya
 *  sipariş edilebildiği için satır, sipariş verilen HER firmanın grubunda
 *  o firmanın rakamlarıyla görünür. */
type GrupSatiri = {
  satir: TalepSatiri;
  /** Bu firmaya verilen sipariş miktarı. */
  siparisMiktar: number;
  /** Bu firmadan gelen (fatura eşleşmesi). */
  tedarik: number;
  /** Tedariki karşılayan alış fişleri (ALS-####). */
  alisIds?: string[];
  /** Henüz hiç sipariş verilmemiş kalan — yalnız satırın kendi (talepte
   *  seçilen) firmasının grubunda gösterilir; diğer firmaları ilgilendirmez. */
  kalan?: number;
};

/** Talep satırlarının firma bazlı grubu — bir grup = bir sipariş belgesi. */
type FirmaGrubu = {
  cariId: string;
  cariAd: string;
  satirlar: GrupSatiri[];
  /** Bu firmaya kesilmiş sipariş belgeleri (SIP-####). */
  siparisBelgeleri: string[];
  tahminiTutar: number;
  /** Henüz sipariş verilmemiş kalem var mı? */
  siparisKalanVar: boolean;
};

/** Satırları firmaya göre gruplar:
 *  - sipariş verilmiş her firma kendi grubunda o siparişin miktarıyla,
 *  - sipariş verilmemiş kalan ise satırın talepteki firmasının grubunda. */
function firmaGruplari(
  t: SatinAlmaTalep,
  tedarikciler: { id: string; ad: string }[],
): FirmaGrubu[] {
  const m = new Map<string, FirmaGrubu>();
  const grup = (cariId: string, cariAd: string) => {
    const g = m.get(cariId) ?? {
      cariId,
      cariAd,
      satirlar: [] as GrupSatiri[],
      siparisBelgeleri: [] as string[],
      tahminiTutar: 0,
      siparisKalanVar: false,
    };
    m.set(cariId, g);
    return g;
  };

  for (const s of t.satirlar) {
    const fiyat = s.tahminiFiyat ?? 0;
    // 1) Sipariş verilen firmalar — her biri kendi grubunda.
    for (const o of s.siparisler) {
      const g = grup(o.cariId, o.cariAd);
      g.satirlar.push({
        satir: s,
        siparisMiktar: o.miktar,
        tedarik: o.tedarikEdilen,
        alisIds: o.alisIds,
      });
      g.tahminiTutar += o.miktar * (o.fiyat ?? fiyat);
      if (o.siparisId && !g.siparisBelgeleri.includes(o.siparisId))
        g.siparisBelgeleri.push(o.siparisId);
    }
    // 2) Sipariş verilmemiş kalan — satırın talepteki firmasında bekler.
    const siparilen = s.siparisler.reduce((n, o) => n + o.miktar, 0);
    const kalan = s.miktar - siparilen;
    if (kalan > 0.0005) {
      const cariId = s.ureticiCariId ?? "";
      const cariAd =
        tedarikciler.find((x) => x.id === cariId)?.ad ?? "Firma atanmamış";
      const g = grup(cariId, cariAd);
      // Aynı firmaya zaten sipariş varsa kalanı o satıra iliştir.
      const mevcut = g.satirlar.find((e) => e.satir.id === s.id);
      if (mevcut) mevcut.kalan = kalan;
      else g.satirlar.push({ satir: s, siparisMiktar: 0, tedarik: 0, kalan });
      g.tahminiTutar += kalan * fiyat;
      g.siparisKalanVar = true;
    }
  }
  return [...m.values()];
}

type SortKey = "id" | "tarih" | "kaynak" | "tutar" | "durum";

export function TalepListe({
  talepler,
  tedarikciler,
  mevcutKullanici,
}: {
  talepler: SatinAlmaTalep[];
  tedarikciler: { id: string; ad: string }[];
  /** TODO: oturum altyapısı gelince gerçek giriş yapan kullanıcı. */
  mevcutKullanici: { id: string; ad: string; rol: string; departman?: string };
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();

  const yonetici = mevcutKullanici.rol === "Yönetici";
  const satinAlmaci =
    yonetici ||
    (mevcutKullanici.departman ?? "")
      .toLocaleLowerCase("tr")
      .includes("satın alma");

  const [noFiltre, setNoFiltre] = React.useState("");
  const [kaynak, setKaynak] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "desc" },
  );
  const [mesgul, setMesgul] = React.useState<string | null>(null);

  // Dialoglar id ile açılır; içerik props'tan türetilir ki router.refresh
  // sonrası güncel veri görünsün (örn. Başlat sonrası Tedarik Et butonları).
  const [detayId, setDetayId] = React.useState<string | null>(null);
  const [redId, setRedId] = React.useState<string | null>(null);
  const [redNeden, setRedNeden] = React.useState("");
  // Sipariş oluşturma hedefi: talep + firma (grup).
  const [siparisHedef, setSiparisHedef] = React.useState<{
    talepId: string;
    cariId: string;
  } | null>(null);
  // Malzeme Durumu satırına tıklayınca açılan detay sheet'i (malzeme id).
  const [malzemeDetayId, setMalzemeDetayId] = React.useState<string | null>(
    null,
  );

  const detay = talepler.find((t) => t.id === detayId) ?? null;
  const redTalep = talepler.find((t) => t.id === redId) ?? null;
  const siparisTalep =
    talepler.find((t) => t.id === siparisHedef?.talepId) ?? null;
  const siparisGrup = siparisTalep
    ? (firmaGruplari(siparisTalep, tedarikciler).find(
        (g) => g.cariId === siparisHedef?.cariId,
      ) ?? null)
    : null;

  const kaynaklar = React.useMemo(
    () => [...new Set(talepler.map((t) => t.kaynak))],
    [talepler],
  );

  const filtreli = React.useMemo(() => {
    const q = noFiltre.toLowerCase();
    const arr = talepler.filter(
      (t) =>
        t.id.toLowerCase().includes(q) &&
        (kaynak === "Tümü" || t.kaynak === kaynak) &&
        (durum === "Tümü" || t.durum === durum),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "tutar") return (a.tahminiTutar - b.tahminiTutar) * yon;
      return String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * yon;
    });
  }, [talepler, noFiltre, kaynak, durum, sort]);

  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  // ── Durum panosu: sekmeler ──────────────────────────────────────────────
  const [tab, setTab] = React.useState<"talepler" | "malzeme">("talepler");
  // Panoda reddedilenler hariç aktif talepler.
  const aktifTalepler = React.useMemo(
    () => talepler.filter((t) => t.durum !== "Reddedildi"),
    [talepler],
  );

  // Malzeme bazlı durum — tüm aktif talepler toplanır.
  const malzemeDurum = React.useMemo(() => {
    const m = new Map<
      string,
      {
        malzemeAd: string;
        birim: string;
        istenen: number;
        siparis: number;
        tedarik: number;
      }
    >();
    for (const t of aktifTalepler) {
      for (const s of t.satirlar) {
        const g = m.get(s.malzemeId) ?? {
          malzemeAd: s.malzemeAd,
          birim: s.birim,
          istenen: 0,
          siparis: 0,
          tedarik: 0,
        };
        g.istenen += s.miktar;
        g.siparis += s.siparisler.reduce((n, o) => n + o.miktar, 0);
        g.tedarik += s.tedarikEdilen;
        m.set(s.malzemeId, g);
      }
    }
    return [...m.entries()]
      .map(([id, g]) => ({
        malzemeId: id,
        ...g,
        bekleyen: Math.max(0, g.istenen - g.tedarik),
      }))
      .sort((a, b) => b.bekleyen - a.bekleyen);
  }, [aktifTalepler]);

  // ── Aksiyonlar ────────────────────────────────────────────────────────
  async function onaylaAksiyon(t: SatinAlmaTalep) {
    if (
      !(await onayla({
        title: `${t.id} onaylansın mı?`,
        description:
          "Onaylanan talebi Satın Alma departmanı tedarik sürecine alabilir.",
        confirmLabel: "Onayla",
        destructive: false,
      }))
    )
      return;
    setMesgul(t.id);
    const res = await talepOnayla(t.id, mevcutKullanici.id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep onaylanamadı.");
      return;
    }
    toast.success(`${t.id} onaylandı`);
    router.refresh();
  }

  async function reddetAksiyon() {
    if (!redTalep) return;
    setMesgul(redTalep.id);
    const res = await talepReddet(redTalep.id, mevcutKullanici.id, redNeden);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep reddedilemedi.");
      return;
    }
    toast.success(`${redTalep.id} reddedildi`);
    setRedId(null);
    setRedNeden("");
    router.refresh();
  }

  async function baslatAksiyon(t: SatinAlmaTalep) {
    setMesgul(t.id);
    const res = await talepBaslat(t.id, mevcutKullanici.id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Talep başlatılamadı.");
      return;
    }
    toast.success(`${t.id} tedarik sürecine alındı`);
    setDetayId(t.id); // mal kabul detay modalında yapılır
    router.refresh();
  }

  /** Fatura gir: talebin siparişleri tek firmaysa o firmayla alış aç,
   *  birden fazla firma varsa Bekleyen Siparişler'e (firma bazlı giriş) yönlendir. */
  function faturaGir(t: SatinAlmaTalep) {
    const firmalar = [
      ...new Set(
        t.satirlar.flatMap((s) =>
          s.siparisler
            .filter((o) => o.tedarikEdilen < o.miktar - 1e-9)
            .map((o) => o.cariId),
        ),
      ),
    ];
    if (firmalar.length === 1)
      router.push(`/satin-alma/yeni?siparisFirma=${firmalar[0]}`);
    else router.push("/satin-alma/siparisler");
  }

  async function sil(id: string) {
    setMesgul(id);
    const res = await talepSil(id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Talep silindi");
    router.refresh();
  }

  const sekmeler: { key: typeof tab; etiket: string }[] = [
    { key: "talepler", etiket: "Model Durumu" },
    { key: "malzeme", etiket: "Malzeme Durumu" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Sekmeler */}
      <div className="flex gap-1 border-b">
        {sekmeler.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === s.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {tab === "malzeme" && (
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title="Malzeme Durumu" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Malzeme</TableHead>
                <TableHead className="text-right">İstenen</TableHead>
                <TableHead className="text-right">Sipariş Verilen</TableHead>
                <TableHead className="text-right">Tedarik Edilen</TableHead>
                <TableHead className="text-right">Bekleyen</TableHead>
                <TableHead className="w-32">İlerleme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {malzemeDurum.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aktif talep yok.
                  </TableCell>
                </TableRow>
              ) : (
                malzemeDurum.map((d) => {
                  const oran =
                    d.istenen > 0 ? Math.min(1, d.tedarik / d.istenen) : 0;
                  return (
                    <TableRow
                      key={d.malzemeId}
                      className="cursor-pointer"
                      onClick={() => setMalzemeDetayId(d.malzemeId)}
                    >
                      <TableCell className="font-medium">
                        {d.malzemeAd}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.istenen.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-blue-700">
                        {d.siparis.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {d.tedarik.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          d.bekleyen > 0
                            ? "font-medium text-amber-700"
                            : "text-muted-foreground",
                        )}
                      >
                        {d.bekleyen.toLocaleString("tr-TR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {d.birim}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                oran >= 1 ? "bg-emerald-500" : "bg-violet-500",
                              )}
                              style={{ width: `${Math.round(oran * 100)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">
                            %{Math.round(oran * 100)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "talepler" && (
        <>
          <div className="overflow-hidden rounded-md border bg-card">
            <ListHeader title="Satın Alma Talepleri" />
            <Table>
              <TableHeader>
                <TableRow>
                  <SiralaFiltreBaslik
                    sira={sira("id")}
                    onSirala={sirala("id")}
                    filtre={{
                      tip: "metin",
                      deger: noFiltre,
                      onDeger: setNoFiltre,
                    }}
                  >
                    Talep No
                  </SiralaFiltreBaslik>
                  <SiralaFiltreBaslik
                    sira={sira("tarih")}
                    onSirala={sirala("tarih")}
                  >
                    Tarih
                  </SiralaFiltreBaslik>
                  <SiralaFiltreBaslik
                    sira={sira("kaynak")}
                    onSirala={sirala("kaynak")}
                    filtre={{
                      tip: "liste",
                      secenekler: kaynaklar,
                      deger: kaynak,
                      onDeger: setKaynak,
                    }}
                  >
                    Kaynak
                  </SiralaFiltreBaslik>
                  <TableHead>Model</TableHead>
                  <TableHead className="w-16 text-right">Adet</TableHead>
                  <TableHead>Oluşturan</TableHead>
                  <TableHead>Tedarik</TableHead>
                  <SiralaFiltreBaslik
                    className="text-right"
                    sira={sira("tutar")}
                    onSirala={sirala("tutar")}
                  >
                    Tahmini Tutar
                  </SiralaFiltreBaslik>
                  <SiralaFiltreBaslik
                    sira={sira("durum")}
                    onSirala={sirala("durum")}
                    filtre={{
                      tip: "liste",
                      secenekler: DURUMLAR,
                      deger: durum,
                      onDeger: setDurum,
                    }}
                  >
                    Durum
                  </SiralaFiltreBaslik>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtreli.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Talep yok. Üretim Planı&apos;nda eksik malzemeleri seçip
                      &quot;Satın Alma Talebi Oluştur&quot; ile başlayın.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtreli.map((t) => (
                    <SatirMenu
                      key={t.id}
                      className="w-56"
                      aksiyonlar={[
                        {
                          etiket: "Detay",
                          ikon: ExternalLink,
                          onSecim: () => setDetayId(t.id),
                        },
                        {
                          etiket: "Onayla",
                          ikon: Check,
                          gizli: !(t.durum === "Beklemede" && yonetici),
                          pasif: mesgul === t.id,
                          ayracOnce: true,
                          onSecim: () => onaylaAksiyon(t),
                        },
                        {
                          etiket: "Reddet",
                          ikon: Ban,
                          gizli: !(t.durum === "Beklemede" && yonetici),
                          pasif: mesgul === t.id,
                          onSecim: () => {
                            setRedNeden("");
                            setRedId(t.id);
                          },
                        },
                        {
                          etiket: "Tedarike Başla",
                          ikon: Play,
                          gizli: !(t.durum === "Onaylandı" && satinAlmaci),
                          pasif: mesgul === t.id,
                          onSecim: () => baslatAksiyon(t),
                        },
                        {
                          etiket: "Fatura Gir",
                          ikon: Receipt,
                          gizli: !(
                            t.durum === "Tedarik Sürecinde" &&
                            satinAlmaci &&
                            t.satirlar.some(
                              (s) =>
                                s.durum === "Sipariş Verildi" ||
                                s.durum === "Kısmi",
                            )
                          ),
                          onSecim: () => faturaGir(t),
                        },
                        {
                          etiket: "Alış Fişini Gör",
                          ikon: Receipt,
                          gizli: !t.alisId,
                          onSecim: () => router.push(`/satin-alma/${t.alisId}`),
                        },
                        {
                          etiket: "Sil",
                          ikon: Trash2,
                          tehlike: true,
                          ayracOnce: true,
                          gizli: !(
                            t.durum === "Beklemede" || t.durum === "Reddedildi"
                          ),
                          pasif: mesgul === t.id,
                          onSecim: () => sil(t.id),
                        },
                      ]}
                    >
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setDetayId(t.id)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {t.id}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTarih(t.tarih)}
                        </TableCell>
                        <TableCell className="text-sm">{t.kaynak}</TableCell>
                        <TableCell className="max-w-48">
                          {t.modeller ? (
                            <span
                              title={t.modeller}
                              className="block truncate text-sm font-medium"
                            >
                              {modelParcala(t.modeller).adlar}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {modelParcala(t.modeller).adet ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.olusturanAd ?? "—"}
                        </TableCell>
                        <TableCell>
                          <TedarikIlerleme talep={t} />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatTL(t.tahminiTutar)}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <DurumBadge durum={t.durum} />
                            {t.alisId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/satin-alma/${t.alisId}`);
                                }}
                                className="cursor-pointer font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                              >
                                {t.alisId}
                              </button>
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    </SatirMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <span className="text-sm text-muted-foreground">
            {filtreli.length} talep
          </span>
        </>
      )}

      {/* ── Detay sheet'i ── */}
      <FormSheet
        open={detay !== null}
        onOpenChange={(o) => !o && setDetayId(null)}
        title={detay ? `${detay.id} · Satın Alma Talebi` : ""}
        sheetClassName="data-[side=right]:w-auto data-[side=right]:min-w-[24rem] data-[side=right]:sm:max-w-[min(72rem,calc(100vw-1rem))]"
        contentClassName="flex flex-col gap-3"
        footer={
          detay && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
              <span className="text-sm text-muted-foreground tabular-nums">
                {tamamSatir(detay)}/{detay.satirlar.length} malzeme tedarik
                edildi · tahmini {formatTL(detay.tahminiTutar)}
              </span>
              <div className="flex items-center gap-2">
                {detay.durum === "Beklemede" && yonetici && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mesgul === detay.id}
                      onClick={() => {
                        setRedNeden("");
                        setRedId(detay.id);
                      }}
                    >
                      <Ban className="size-3.5" /> Reddet
                    </Button>
                    <Button
                      size="sm"
                      disabled={mesgul === detay.id}
                      onClick={() => onaylaAksiyon(detay)}
                    >
                      <Check className="size-3.5" /> Onayla
                    </Button>
                  </>
                )}
                {detay.durum === "Onaylandı" && satinAlmaci && (
                  <Button
                    size="sm"
                    disabled={mesgul === detay.id}
                    onClick={() => baslatAksiyon(detay)}
                  >
                    <Play className="size-3.5" /> Tedarike Başla
                  </Button>
                )}
                {detay.durum === "Tedarik Sürecinde" &&
                  satinAlmaci &&
                  detay.satirlar.some(
                    (s) => s.durum === "Sipariş Verildi" || s.durum === "Kısmi",
                  ) && (
                    <Button size="sm" onClick={() => faturaGir(detay)}>
                      <Receipt className="size-3.5" /> Fatura Gir
                    </Button>
                  )}
              </div>
            </div>
          )
        }
      >
        {detay && (
          <>
            {/* Üst meta satırı */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <DurumBadge durum={detay.durum} />
              <span>
                {detay.kaynak} · {formatTarih(detay.tarih)}
                {detay.olusturanAd && <> · {detay.olusturanAd}</>}
              </span>
            </div>
            {detay.modeller && (
              <p className="px-0.5 text-sm font-medium">{detay.modeller}</p>
            )}

            {/* Audit izi */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
              {detay.olusturanAd && (
                <span>
                  Oluşturan:{" "}
                  <span className="text-foreground">{detay.olusturanAd}</span>
                </span>
              )}
              {detay.onaylayanAd && (
                <span>
                  {detay.durum === "Reddedildi" ? "Reddeden" : "Onaylayan"}:{" "}
                  <span className="text-foreground">{detay.onaylayanAd}</span>
                  {detay.onayTarihi && <> ({formatTarih(detay.onayTarihi)})</>}
                </span>
              )}
              {detay.baslatanAd && (
                <span>
                  Başlatan:{" "}
                  <span className="text-foreground">{detay.baslatanAd}</span>
                  {detay.baslatmaTarihi && (
                    <> ({formatTarih(detay.baslatmaTarihi)})</>
                  )}
                </span>
              )}
              {detay.depo && (
                <span>
                  Hedef depo:{" "}
                  <span className="text-foreground">{detay.depo}</span>
                </span>
              )}
              {/* Talebi doğuran üretim: kim için, ne zamana, hangi öncelikte */}
              {detay.uretimMusteri && (
                <span>
                  Müşteri:{" "}
                  <span className="text-foreground">{detay.uretimMusteri}</span>
                </span>
              )}
              {detay.uretimTermin && (
                <span>
                  Termin:{" "}
                  <span className="text-foreground">
                    {formatTarih(detay.uretimTermin)}
                  </span>
                </span>
              )}
              {detay.uretimOncelik && detay.uretimOncelik !== "Normal" && (
                <span>
                  Öncelik:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      detay.uretimOncelik === "Acil"
                        ? "text-rose-600"
                        : "text-amber-700",
                    )}
                  >
                    {detay.uretimOncelik}
                  </span>
                </span>
              )}
              {/* Bu talepten doğan üretim emirleri */}
              {detay.uretimEmirleri?.length ? (
                <span className="flex items-center gap-1">
                  Üretim:
                  {detay.uretimEmirleri.map((ue) => (
                    <button
                      key={ue}
                      type="button"
                      onClick={() => router.push("/uretim/emirler")}
                      className="cursor-pointer font-mono text-foreground underline-offset-2 hover:underline"
                    >
                      {ue}
                    </button>
                  ))}
                </span>
              ) : null}
              {detay.alisId && (
                <button
                  type="button"
                  onClick={() => router.push(`/satin-alma/${detay.alisId}`)}
                  className="cursor-pointer font-mono underline-offset-2 hover:underline"
                >
                  Alış: {detay.alisId}
                </button>
              )}
              {detay.redNedeni && (
                <span className="text-rose-600">
                  Red nedeni: {detay.redNedeni}
                </span>
              )}
            </div>

            {/* Firma bazlı gruplar — bir firma = bir sipariş belgesi */}
            <div className="flex max-h-[55dvh] flex-col gap-3 overflow-y-auto pr-1">
              {firmaGruplari(detay, tedarikciler).map((g) => {
                // Başlıkta sipariş bekleyen toplam (birim bazında).
                const bekleyenler = new Map<string, number>();
                for (const e of g.satirlar)
                  if (e.kalan)
                    bekleyenler.set(
                      e.satir.birim,
                      (bekleyenler.get(e.satir.birim) ?? 0) + e.kalan,
                    );
                const bekleyenMetni = [...bekleyenler]
                  .map(
                    ([b, n]) =>
                      `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${b}`,
                  )
                  .join(" + ");
                return (
                  <div key={g.cariId || "yok"} className="rounded-md border">
                    <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {g.cariAd}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.satirlar.length} kalem · {formatTL(g.tahminiTutar)}
                          {g.siparisBelgeleri.length > 0 && " · "}
                          {g.siparisBelgeleri.map((sip, i) => (
                            <React.Fragment key={sip}>
                              {i > 0 && ", "}
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/satin-alma/siparis/${sip}`)
                                }
                                className="cursor-pointer font-mono underline-offset-2 hover:underline"
                              >
                                {sip}
                              </button>
                            </React.Fragment>
                          ))}
                          {bekleyenMetni && (
                            <>
                              {" · "}
                              <span className="font-medium text-amber-700">
                                {bekleyenMetni} sipariş bekliyor
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      {detay.durum === "Tedarik Sürecinde" &&
                        satinAlmaci &&
                        g.siparisKalanVar && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setSiparisHedef({
                                talepId: detay.id,
                                cariId: g.cariId,
                              })
                            }
                          >
                            <PackageCheck className="size-3.5" /> Sipariş
                            Oluştur
                          </Button>
                        )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Malzeme</TableHead>
                          <TableHead className="text-right">İstenen</TableHead>
                          <TableHead className="text-right">Sipariş</TableHead>
                          <TableHead className="text-right">Tedarik</TableHead>
                          <TableHead className="text-right">
                            Sipariş Kalan
                          </TableHead>
                          <TableHead>Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.satirlar.map((e) => {
                          const s = e.satir;
                          return (
                            <TableRow key={`${s.id}-${g.cariId}`}>
                              <TableCell className="font-medium">
                                {s.malzemeAd}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {s.miktar.toLocaleString("tr-TR", {
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {s.birim}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {e.siparisMiktar > 0 ? (
                                  <>
                                    {e.siparisMiktar.toLocaleString("tr-TR", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    {s.birim}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {e.tedarik.toLocaleString("tr-TR", {
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {s.birim}
                              </TableCell>
                              {/* Sipariş verilmemiş kalan — yalnız satırın
                                  kendi firmasının grubunda anlamlı. */}
                              <TableCell
                                className={cn(
                                  "text-right tabular-nums",
                                  e.kalan
                                    ? "font-medium text-amber-700"
                                    : "text-muted-foreground",
                                )}
                              >
                                {e.kalan ? (
                                  <>
                                    {e.kalan.toLocaleString("tr-TR", {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    {s.birim}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={SATIR_DURUM_RENK[s.durum]}
                                  >
                                    {s.durum}
                                  </Badge>
                                  {/* Tedariki karşılayan alış fişleri */}
                                  {e.alisIds?.map((a) => (
                                    <button
                                      key={a}
                                      type="button"
                                      onClick={() =>
                                        router.push(`/satin-alma/${a}`)
                                      }
                                      className="cursor-pointer font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                    >
                                      {a}
                                    </button>
                                  ))}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>

            {detay.aciklama && (
              <p className="px-1 text-xs text-muted-foreground">
                {detay.aciklama}
              </p>
            )}
          </>
        )}
      </FormSheet>

      {/* ── Red dialogu ── */}
      <Dialog
        open={redTalep !== null}
        onOpenChange={(o) => !o && setRedId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Talebi reddet</DialogTitle>
            <DialogDescription>
              {redTalep?.id} reddedilecek. İsterseniz bir neden yazın.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="Red nedeni (opsiyonel)"
            value={redNeden}
            onChange={(e) => setRedNeden(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setRedId(null)}>
              Vazgeç
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={mesgul !== null}
              onClick={reddetAksiyon}
            >
              <Ban className="size-3.5" /> Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sipariş oluşturma dialogu (firma bazlı) ── */}
      {siparisTalep && siparisGrup && (
        <SiparisDialog
          talep={siparisTalep}
          grup={siparisGrup}
          tedarikciler={tedarikciler}
          kullaniciId={mevcutKullanici.id}
          onKapat={() => setSiparisHedef(null)}
          onKaydedildi={(id) => {
            setSiparisHedef(null);
            router.refresh();
            router.push(`/satin-alma/siparis/${id}`);
          }}
        />
      )}

      {/* ── Malzeme durum detay sheet'i ── */}
      <FormSheet
        open={malzemeDetayId !== null}
        onOpenChange={(o) => !o && setMalzemeDetayId(null)}
        title={
          malzemeDetayId
            ? (aktifTalepler
                .flatMap((t) => t.satirlar)
                .find((s) => s.malzemeId === malzemeDetayId)?.malzemeAd ??
              malzemeDetayId)
            : ""
        }
        sheetClassName="data-[side=right]:sm:max-w-2xl"
        contentClassName="flex flex-col gap-4"
        footer={<div className="border-t p-2" />}
      >
        {malzemeDetayId &&
          (() => {
            // Bu malzemeyi içeren talepler + o taleplerdeki ilgili satır(lar).
            const kayitlar = aktifTalepler
              .map((t) => ({
                talep: t,
                satirlar: t.satirlar.filter(
                  (s) => s.malzemeId === malzemeDetayId,
                ),
              }))
              .filter((x) => x.satirlar.length > 0);
            const toplamIstenen = kayitlar
              .flatMap((x) => x.satirlar)
              .reduce((n, s) => n + s.miktar, 0);
            const toplamTedarik = kayitlar
              .flatMap((x) => x.satirlar)
              .reduce((n, s) => n + s.tedarikEdilen, 0);
            return (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {kayitlar.length} talepte geçiyor · toplam istenen{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {toplamIstenen.toLocaleString("tr-TR", {
                      maximumFractionDigits: 2,
                    })}
                  </span>{" "}
                  · tedarik edilen{" "}
                  <span className="font-medium text-emerald-700 tabular-nums">
                    {toplamTedarik.toLocaleString("tr-TR", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Talep</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">İstenen</TableHead>
                        <TableHead>Sipariş Firması</TableHead>
                        <TableHead className="text-right">Tedarik</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kayitlar.flatMap((x) =>
                        x.satirlar.map((s) => (
                          <TableRow key={`${x.talep.id}-${s.id}`}>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => {
                                  setMalzemeDetayId(null);
                                  setDetayId(x.talep.id);
                                }}
                                className="cursor-pointer font-mono text-xs font-medium underline-offset-2 hover:underline"
                              >
                                {x.talep.id}
                              </button>
                            </TableCell>
                            <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                              {x.talep.modeller?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {s.miktar.toLocaleString("tr-TR", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {s.birim}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.siparisler.length > 0 ? (
                                s.siparisler.map((o) => o.cariAd).join(", ")
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {s.tedarikEdilen.toLocaleString("tr-TR", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {s.birim}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={SATIR_DURUM_RENK[s.durum]}
                              >
                                {s.durum}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
      </FormSheet>

      {onayDialog}
    </div>
  );
}

/** Liste kolonundaki tedarik ilerlemesi: "5/10 kalem" + mini bar.
 *  Hover'da talebin kalemleri (malzeme · miktar · durum) listelenir. */
function TedarikIlerleme({ talep }: { talep: SatinAlmaTalep }) {
  const tedarikte =
    talep.durum === "Tedarik Sürecinde" || talep.durum === "Tamamlandı";
  if (talep.durum === "Reddedildi")
    return <span className="text-sm text-muted-foreground">—</span>;
  const oran = tedarikOrani(talep);
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={
          tedarikte ? (
            <div className="flex cursor-help items-center gap-2">
              <span className="text-sm tabular-nums">
                {tamamSatir(talep)}/{talep.satirlar.length} kalem
              </span>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    oran >= 1 ? "bg-emerald-500" : "bg-violet-500",
                  )}
                  style={{ width: `${Math.round(oran * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="cursor-help text-sm text-muted-foreground">
              {talep.satirlar.length} kalem
            </span>
          )
        }
      />
      <HoverCardContent align="start" className="w-96 text-xs">
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {talep.satirlar.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-3">
              {/* Ad kırpılmaz — sığmazsa alt satıra sarar. */}
              <span className="min-w-0">{s.malzemeAd}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground tabular-nums">
                  {s.miktar.toLocaleString("tr-TR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {s.birim}
                </span>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px]", SATIR_DURUM_RENK[s.durum])}
                >
                  {s.durum}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/** Bir firmaya SİPARİŞ BELGESİ oluşturur (grup = firma).
 *  Kalemler tek tek gözden geçirilir: miktar düşürülürse kalan satırda bekler
 *  (kısmi sipariş), fiyat talepteki tahminden saparsa uyarılır.
 *  Stok ve cari etkilenmez; giriş fatura/mal kabulde olur. */
function SiparisDialog({
  talep,
  grup,
  tedarikciler,
  kullaniciId,
  onKapat,
  onKaydedildi,
}: {
  talep: SatinAlmaTalep;
  grup: FirmaGrubu;
  tedarikciler: { id: string; ad: string }[];
  kullaniciId: string;
  onKapat: () => void;
  onKaydedildi: (siparisId: string) => void;
}) {
  // Yalnız sipariş verilecek kalanı olan satırlar.
  const acik = grup.satirlar
    .filter((e) => (e.kalan ?? 0) > 0.0005)
    .map((e) => ({ satir: e.satir, kalan: e.kalan ?? 0 }));
  type Kalem = { satirId: number; miktar: string; fiyat: string };
  const [kalemler, setKalemler] = React.useState<Kalem[]>(() =>
    acik.map((e) => ({
      satirId: e.satir.id,
      miktar: String(e.kalan),
      fiyat: paraMetni(e.satir.tahminiFiyat),
    })),
  );
  const [cariAd, setCariAd] = React.useState<string | null>(
    grup.cariId ? grup.cariAd : null,
  );
  const [notlar, setNotlar] = React.useState("");
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const cari = tedarikciler.find((t) => t.ad === cariAd);
  const satirMap = new Map(acik.map((e) => [e.satir.id, e]));
  const guncelle = (satirId: number, d: Partial<Kalem>) =>
    setKalemler((arr) =>
      arr.map((k) => (k.satirId === satirId ? { ...k, ...d } : k)),
    );

  const net = kalemler.filter((k) => Number(k.miktar) > 0);
  const toplam = net.reduce(
    (t, k) => t + Number(k.miktar) * paraDegeri(k.fiyat),
    0,
  );
  // Hiçbir kalem satırın sipariş kalanını aşamaz.
  const asan = kalemler.some((k) => {
    const e = satirMap.get(k.satirId);
    return e ? Number(k.miktar) > e.kalan + 1e-9 : false;
  });
  const gecerli = Boolean(cari) && net.length > 0 && !asan;

  async function kaydet() {
    if (!gecerli || !cari) return;
    setKaydediliyor(true);
    const res = await siparisOlustur({
      talepId: talep.id,
      cariId: cari.id,
      cariAd: cari.ad,
      kalemler: net.map((k) => ({
        satirId: k.satirId,
        miktar: Number(k.miktar),
        fiyat: paraDegeri(k.fiyat) || undefined,
      })),
      notlar: notlar.trim() || undefined,
      kullaniciId,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Sipariş oluşturulamadı.");
      return;
    }
    toast.success(res.id + " · " + cari.ad + " siparişi oluşturuldu");
    onKaydedildi(res.id);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sipariş Oluştur — {grup.cariAd}</DialogTitle>
          <DialogDescription>
            {talep.id} · {acik.length} kalem. Miktarı düşürürseniz kalan talepte
            bekler, sonra tekrar sipariş verebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Tedarikçi
          </span>
          <SearchSelect
            items={tedarikciler.map((t) => t.ad)}
            value={cariAd}
            onValueChange={setCariAd}
            placeholder="Firma seç"
            emptyText="Tedarikçi yok"
            className={cn(!cari && "ring-1 ring-rose-300")}
          />
        </div>

        <div className="max-h-[45dvh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Malzeme</TableHead>
                <TableHead className="text-right">Kalan</TableHead>
                <TableHead className="w-28 text-right">Miktar</TableHead>
                <TableHead className="w-28 text-right">Birim Fiyat</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kalemler.map((k) => {
                const e = satirMap.get(k.satirId);
                if (!e) return null;
                const s = e.satir;
                const kalan = e.kalan;
                const m = Number(k.miktar) || 0;
                const f = paraDegeri(k.fiyat);
                const sapma =
                  s.tahminiFiyat > 0 && f > 0
                    ? (f - s.tahminiFiyat) / s.tahminiFiyat
                    : 0;
                return (
                  <TableRow key={k.satirId}>
                    {/* Ad kırpılmaz — sığmazsa sarar (yatay kaydırma yerine). */}
                    <TableCell className="font-medium break-words whitespace-normal">
                      {s.malzemeAd}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {kalan.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {s.birim}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={k.miktar}
                        onChange={(e) =>
                          guncelle(k.satirId, { miktar: e.target.value })
                        }
                        className={cn(
                          "h-8 text-right tabular-nums",
                          m > kalan + 1e-9 && "ring-1 ring-rose-300",
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-0.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={k.fiyat}
                          onChange={(e) =>
                            guncelle(k.satirId, {
                              fiyat: paraMaskele(e.target.value),
                            })
                          }
                          className="h-8 text-right tabular-nums"
                        />
                        {Math.abs(sapma) >= 0.1 && (
                          <span
                            className={cn(
                              "text-[10px] leading-none",
                              sapma > 0 ? "text-rose-600" : "text-emerald-600",
                            )}
                          >
                            talebe göre %
                            {Math.abs(sapma * 100).toLocaleString("tr-TR", {
                              maximumFractionDigits: 0,
                            })}{" "}
                            {sapma > 0 ? "yüksek" : "düşük"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatTL(m * f)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Textarea
          placeholder="Sipariş notu (tedarikçiye giden çıktıda görünür)"
          value={notlar}
          onChange={(e) => setNotlar(e.target.value)}
          rows={2}
        />

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Vazgeç
          </Button>
          <Button
            size="sm"
            disabled={!gecerli || kaydediliyor}
            onClick={kaydet}
          >
            <PackageCheck className="size-3.5" />
            {kaydediliyor
              ? "Oluşturuluyor..."
              : `${net.length} kalem · ${formatTL(toplam)} sipariş ver`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
