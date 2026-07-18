"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Hammer,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListHeader } from "@/components/ui/list-header";
import { SearchSelect } from "@/components/ui/search-select";
import { ModelParcaSecici } from "@/components/production/model-parca-secici";
import { GorselHucre } from "@/components/ui/liste-gorsel";
import { TarihAralikSecici } from "@/components/ui/tarih-aralik";
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
  type Model,
  type Depo,
  type Parca,
  type Malzeme,
  type UretimOncelik,
} from "@/lib/data";
import { malzemeYeterlilik, type MalzemeIhtiyac } from "@/lib/bom";
import { uretimEmriOlustur } from "@/lib/db/actions";

type Neden = "stok" | "siparis";
// Plan satırı model (mamül) ya da parça üretimi olabilir.
type SecimTip = "model" | "parca";
type Secim = {
  id: number;
  tip: SecimTip;
  urunId: string;
  adet: string;
  /**
   * Parça satırı bir modelin parça aktarma modalından geldiyse o modelin id'si.
   * Tabloda satırlar bu alana göre model başlığı altında gruplanır; doğrudan
   * "Parça · X" ile eklenen satırlarda boştur.
   */
  kaynakModelId?: string;
};
type MusteriSecim = { id: string; ad: string; sehir: string };
/** Model seçilince açılan parça aktarma modalının satırı. */
type ModalSatiri = {
  parcaId: string;
  ad: string;
  adet: string;
  secili: boolean;
};

const ONCELIKLER: UretimOncelik[] = ["Düşük", "Normal", "Yüksek", "Acil"];

export function ProductionPlan({
  urunler,
  depolar,
  musteriler,
  parcalar,
  malzemeler,
  mevcutKullaniciId = "",
}: {
  urunler: Model[];
  depolar: Depo[];
  musteriler: MusteriSecim[];
  parcalar: Parca[];
  malzemeler: Malzeme[];
  /** Talep audit'i için — TODO: oturum gelince sunucudan çözülecek. */
  mevcutKullaniciId?: string;
}) {
  const router = useRouter();
  const modeller = React.useMemo(
    () => urunler.filter((u) => u.parcalar && u.parcalar.length > 0),
    [urunler],
  );
  const urunMap = React.useMemo(
    () => new Map(urunler.map((u) => [u.id, u])),
    [urunler],
  );
  const parcaMap = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p])),
    [parcalar],
  );

  // Görsel kolonu: modelin galerisi + bağlı parçaların resimleri (sıralı).
  const planResimleri = React.useCallback(
    (m?: Model): string[] => {
      if (!m) return [];
      const model = m.gorseller ?? (m.gorsel ? [m.gorsel] : []);
      const parca = (m.parcalar ?? []).flatMap((ps) => {
        const p = parcaMap.get(ps.parcaId);
        return p?.gorseller ?? (p?.gorsel ? [p.gorsel] : []);
      });
      return [...model, ...parca];
    },
    [parcaMap],
  );
  const aktifDepolar = React.useMemo(
    () => depolar.filter((d) => d.durum === "Aktif"),
    [depolar],
  );

  const [neden, setNeden] = React.useState<Neden>("stok");
  const [depoId, setDepoId] = React.useState<string | null>(null);
  const [musteriId, setMusteriId] = React.useState<string | null>(null);
  // Üretim penceresi: başlangıç – bitiş (termin)
  const [terminBas, setTerminBas] = React.useState("");
  const [termin, setTermin] = React.useState("");
  const [oncelik, setOncelik] = React.useState<UretimOncelik>("Normal");
  // İlk açılışta bir boş satır hazır gelir.
  const [secimler, setSecimler] = React.useState<Secim[]>([
    { id: 0, tip: "model", urunId: "", adet: "1" },
  ]);
  const idRef = React.useRef(1);
  const [gorunen, setGorunen] = React.useState(5);
  // Model seçilince parçalarını aktarma modalı.
  const [parcaModal, setParcaModal] = React.useState<{
    model: Model;
    hedefId: number;
    satirlar: ModalSatiri[];
  } | null>(null);

  const seciliModelIds = new Set(
    secimler.filter((s) => s.tip === "model").map((s) => s.urunId),
  );
  const seciliParcaIds = new Set(
    secimler.filter((s) => s.tip === "parca").map((s) => s.urunId),
  );
  const aktifParcalar = React.useMemo(
    () => parcalar.filter((p) => p.durum === "Aktif"),
    [parcalar],
  );
  const eklenebilir = modeller.filter((m) => !seciliModelIds.has(m.id));
  const eklenebilirParcalar = aktifParcalar.filter(
    (p) => !seciliParcaIds.has(p.id),
  );
  /** Bir plan satırının parça bileşenleri (model → BOM, parça → kendisi). */
  const satirBilesenleri = React.useCallback(
    (s: Secim): { parcaId: string; miktar: number }[] => {
      const a = Number(s.adet);
      if (!s.urunId || !Number.isFinite(a) || a < 1) return [];
      if (s.tip === "parca") return [{ parcaId: s.urunId, miktar: a }];
      const u = urunMap.get(s.urunId);
      return (u?.parcalar ?? []).map((p) => ({
        parcaId: p.parcaId,
        miktar: p.miktar * a,
      }));
    },
    [urunMap],
  );

  const yeterlilik = React.useMemo(() => {
    const birlesik = secimler.flatMap(satirBilesenleri);
    if (birlesik.length === 0) return null;
    return malzemeYeterlilik(birlesik, parcalar, malzemeler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secimler, satirBilesenleri]);

  // Parça detayı açık olan plan satırları (secim id).
  const [detaylar, setDetaylar] = React.useState<Set<number>>(new Set());
  function detayToggle(id: number) {
    setDetaylar((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // ── Model gruplama ────────────────────────────────────────────────────────
  // Kaynak modeli olan parça satırları, tabloda o modelin başlığı altında
  // toplanır; katlanmış grupların id'si burada tutulur.
  const [kapaliGruplar, setKapaliGruplar] = React.useState<Set<string>>(
    new Set(),
  );
  function grupToggle(modelId: string) {
    setKapaliGruplar((s) => {
      const n = new Set(s);
      if (n.has(modelId)) n.delete(modelId);
      else n.add(modelId);
      return n;
    });
  }
  /** Grubu tümüyle plandan çıkarır (modelden aktarılan tüm parça satırları). */
  function grupSil(modelId: string) {
    setSecimler((arr) => arr.filter((s) => s.kaynakModelId !== modelId));
  }

  type Blok =
    | { tip: "grup"; modelId: string; satirlar: Secim[] }
    | { tip: "satir"; secim: Secim };
  /** Satırları render bloklarına böler; grup, ilk üyesinin yerinde toplanır. */
  const bloklar = React.useMemo<Blok[]>(() => {
    const out: Blok[] = [];
    const gorulen = new Set<string>();
    for (const s of secimler) {
      const k = s.kaynakModelId;
      if (!k) {
        out.push({ tip: "satir", secim: s });
        continue;
      }
      if (gorulen.has(k)) continue;
      gorulen.add(k);
      out.push({
        tip: "grup",
        modelId: k,
        satirlar: secimler.filter((x) => x.kaynakModelId === k),
      });
    }
    return out;
  }, [secimler]);

  /** Görünen sıra no — grup katlansa da numaralar kaymasın diye önceden. */
  const siraNo = React.useMemo(() => {
    const m = new Map<number, number>();
    let n = 0;
    for (const b of bloklar) {
      if (b.tip === "satir") m.set(b.secim.id, ++n);
      else for (const s of b.satirlar) m.set(s.id, ++n);
    }
    return m;
  }, [bloklar]);

  // Boş bir satır ekle (henüz seçim yapılmadı).
  function satirEkle() {
    setSecimler((arr) => [
      ...arr,
      { id: idRef.current++, tip: "model", urunId: "", adet: "1" },
    ]);
  }
  /** "Model · X" → parça aktarma modalı; "Parça · Y" → doğrudan parça satırı. */
  function secimYap(id: number, etiket: string) {
    if (etiket.startsWith("Model · ")) {
      const ad = etiket.slice("Model · ".length);
      const m = modeller.find((x) => x.ad === ad);
      if (!m) return;
      setParcaModal({
        model: m,
        hedefId: id,
        satirlar: (m.parcalar ?? []).map((ps) => ({
          parcaId: ps.parcaId,
          ad: parcaMap.get(ps.parcaId)?.ad ?? ps.parcaId,
          adet: String(ps.miktar),
          secili: false,
        })),
      });
      return;
    }
    const ad = etiket.slice("Parça · ".length);
    const p = aktifParcalar.find((x) => x.ad === ad);
    if (!p || seciliParcaIds.has(p.id)) return;
    setSecimler((arr) =>
      arr.map((s) => (s.id === id ? { ...s, tip: "parca", urunId: p.id } : s)),
    );
  }

  /** Modaldaki parçaları plana aktar (hepsi ya da yalnız işaretliler). */
  function modaldanAktar(hepsi: boolean) {
    if (!parcaModal) return;
    const aktarilacak = parcaModal.satirlar.filter(
      (r) => (hepsi || r.secili) && Number(r.adet) >= 1,
    );
    if (aktarilacak.length === 0) {
      toast.error("Aktarılacak parça yok.");
      return;
    }
    const modelId = parcaModal.model.id;
    setSecimler((arr) => {
      // Modalı açan boş satır düşer; AYNI modelden gelen parça satırlarının
      // adedi artar. Başka modelden gelen aynı parça ayrı satır kalır — yoksa
      // hangi grubun altında duracağı belirsizleşirdi.
      let sonuc = arr.filter(
        (s) => !(s.id === parcaModal.hedefId && !s.urunId),
      );
      for (const r of aktarilacak) {
        const mevcut = sonuc.find(
          (s) =>
            s.tip === "parca" &&
            s.urunId === r.parcaId &&
            s.kaynakModelId === modelId,
        );
        if (mevcut) {
          sonuc = sonuc.map((s) =>
            s === mevcut
              ? {
                  ...s,
                  adet: String((Number(s.adet) || 0) + Number(r.adet)),
                }
              : s,
          );
        } else {
          sonuc = [
            ...sonuc,
            {
              id: idRef.current++,
              tip: "parca",
              urunId: r.parcaId,
              adet: r.adet,
              kaynakModelId: modelId,
            },
          ];
        }
      }
      return sonuc;
    });
    toast.success(
      `${aktarilacak.length} parça plana eklendi (${parcaModal.model.ad})`,
    );
    setParcaModal(null);
  }
  function adetGuncelle(id: number, deger: string) {
    const t = deger.replace(/[^\d]/g, "");
    setSecimler((arr) =>
      arr.map((s) =>
        s.id === id
          ? { ...s, adet: t === "" ? "" : String(Math.max(1, Number(t))) }
          : s,
      ),
    );
  }
  function sil(id: number) {
    setSecimler((arr) => arr.filter((s) => s.id !== id));
  }

  /** Satırın görünen adı (model ya da parça). */
  function satirAd(s: Secim): string | undefined {
    return s.tip === "parca"
      ? parcaMap.get(s.urunId)?.ad
      : urunMap.get(s.urunId)?.ad;
  }

  // Bir satırın tek başına (girilen adet için) malzemesi stokta yeterli mi?
  function satirDurum(s: Secim): "yeterli" | "eksik" | null {
    const bilesenler = satirBilesenleri(s);
    if (bilesenler.length === 0) return null;
    return malzemeYeterlilik(bilesenler, parcalar, malzemeler).yeterli
      ? "yeterli"
      : "eksik";
  }

  const dolu = secimler.filter((s) => s.urunId);
  const modelGecerli =
    dolu.length > 0 && dolu.every((s) => Number(s.adet) >= 1);
  const hedefGecerli = neden === "stok" ? depoId !== null : musteriId !== null;
  const yeterli = yeterlilik?.yeterli ?? false;
  const toplamAdet = secimler.reduce((t, s) => t + (Number(s.adet) || 0), 0);

  // Eksik malzeme seçimi (varsayılan: hepsi seçili).
  const eksikIds = (yeterlilik?.eksik ?? []).map((m) => m.malzeme.id);
  const eksikKey = eksikIds.join("|");
  const [seciliEksik, setSeciliEksik] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    setSeciliEksik(new Set(eksikKey ? eksikKey.split("|") : []));
  }, [eksikKey]);

  const secilenEksik = (yeterlilik?.eksik ?? []).filter((m) =>
    seciliEksik.has(m.malzeme.id),
  );
  // Seçili eksiklerin tahmini satın alma maliyeti: (gerekli − stok) × birim fiyat.
  const eksikMaliyet = secilenEksik.reduce(
    (t, m) => t + (m.toplamMiktar - m.malzeme.stok) * m.malzeme.birimFiyat,
    0,
  );
  const tumuEksikSecili =
    eksikIds.length > 0 && eksikIds.every((id) => seciliEksik.has(id));
  const baziEksikSecili = eksikIds.some((id) => seciliEksik.has(id));

  function eksikSecimDegis(id: string, v: boolean) {
    setSeciliEksik((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function tumEksikSec(v: boolean) {
    setSeciliEksik(v ? new Set(eksikIds) : new Set());
  }

  function satinAlmaTalebineGit() {
    if (secilenEksik.length === 0) {
      toast.error("Talep için en az bir eksik malzeme seçin.");
      return;
    }
    // Seçili eksikler açık miktarla (gerekli − stok) talep hazırlığına taşınır:
    // Yeni Alış sayfası talep modunda açılır (malzeme + firma + fiyat hazır),
    // talep oradan oluşturulur.
    const kalem = secilenEksik
      .map((m) => {
        const acik = Math.max(0, m.toplamMiktar - m.malzeme.stok);
        return `${m.malzeme.id}:${Math.round(acik * 100) / 100}`;
      })
      .join(",");
    const p = new URLSearchParams({ mod: "talep", kalem });
    const modeller = secimler
      .filter((s) => s.urunId)
      .map((s) => `${satirAd(s)} × ${s.adet}`)
      .join(", ");
    if (modeller) p.set("modeller", modeller);
    // Mal kabulde önerilecek depo: plandaki hedef depo (stok üretimi).
    const depoAd =
      neden === "stok"
        ? aktifDepolar.find((d) => d.id === depoId)?.ad
        : undefined;
    if (depoAd) p.set("depo", depoAd);
    // Üretim bağlamı: talep hangi üretim için açıldı (müşteri/termin/öncelik).
    const musteriAd =
      neden === "siparis"
        ? musteriler.find((m) => m.id === musteriId)?.ad
        : undefined;
    if (musteriAd) p.set("musteri", musteriAd);
    if (termin) p.set("termin", termin);
    if (oncelik) p.set("oncelik", oncelik);
    router.push(`/satin-alma/yeni?${p.toString()}`);
  }

  const gonderEngel = !modelGecerli
    ? "En az bir model/parça ekleyin"
    : !hedefGecerli
      ? neden === "stok"
        ? "Hedef depo seçin"
        : "Müşteri seçin"
      : !yeterli
        ? "Stok yetersiz — yalnız taslak kaydedebilirsiniz"
        : null;

  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  async function olustur(durum: "Üretimde" | "Planlandı") {
    const gecerli = secimler
      .map((s) => ({ s, ad: satirAd(s), adet: Number(s.adet) }))
      .filter((x) => x.s.urunId && x.ad && x.adet >= 1);
    if (gecerli.length === 0) {
      toast.error("En az bir model/parça ve adet girin.");
      return;
    }
    setKaydediliyor(true);
    try {
      const payload = gecerli.map(({ s, ad, adet }) => ({
        refTip: s.tip,
        urunId: s.urunId,
        urunAd: ad!,
        adet,
        durum,
        oncelik,
        terminBaslangic: terminBas || undefined,
        termin: termin || undefined,
        musteri:
          neden === "siparis"
            ? musteriler.find((m) => m.id === musteriId)?.ad
            : undefined,
        hedefDepo: neden === "stok" ? (depoId ?? undefined) : undefined,
      }));
      const res = await uretimEmriOlustur(payload);
      if (!res.ok) {
        toast.error("Kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      toast.success(
        durum === "Üretimde"
          ? `${res.ids.length} üretim emri oluşturuldu.`
          : `${res.ids.length} taslak kaydedildi.`,
      );
      // Stok yetersizliği uyarıları (negatife düşüş / Planlandı'ya bekletme).
      for (const u of res.uyarilar ?? []) toast.warning(u, { duration: 8000 });
      router.push("/uretim/emirler");
    } catch {
      toast.error("Kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  /**
   * Tek plan satırı. grupIci=true ise satır bir model başlığının altındadır ve
   * girintili çizilir. Bileşen değil düz fonksiyon — çağrıldığı yerde JSX üretir.
   */
  function satirRender(s: Secim, grupIci = false) {
    const m = s.tip === "model" ? urunMap.get(s.urunId) : undefined;
    const parca = s.tip === "parca" ? parcaMap.get(s.urunId) : undefined;
    const durum = satirDurum(s);
    const detayAcik = detaylar.has(s.id);
    return (
      <React.Fragment key={s.id}>
        <TableRow>
          <TableCell
            className={cn(
              "text-muted-foreground tabular-nums",
              grupIci && "pl-8",
            )}
          >
            {siraNo.get(s.id)}
          </TableCell>
          <TableCell>
            <GorselHucre
              gorseller={
                parca
                  ? (parca.gorseller ?? (parca.gorsel ? [parca.gorsel] : []))
                  : planResimleri(m)
              }
              alt={satirAd(s) ?? "Satır"}
            />
          </TableCell>
          <TableCell>
            {s.urunId ? (
              <span className="flex items-center gap-2">
                {/* min-w: rozetler satırlar arası aynı hizada başlasın. Sabit
                    genişlik değil — uzun ad kırpılmaz, rozeti sağa iter. */}
                <span className="min-w-64 font-medium" title={satirAd(s)}>
                  {satirAd(s)}
                </span>
                {parca && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-violet-100 text-[10px] text-violet-800"
                  >
                    Parça
                  </Badge>
                )}
                {(m?.parcalar?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => detayToggle(s.id)}
                    aria-expanded={detayAcik}
                    className="flex cursor-pointer items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {m!.parcalar!.length} parça
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform",
                        detayAcik && "rotate-180",
                      )}
                    />
                  </button>
                )}
              </span>
            ) : (
              <ModelParcaSecici
                sekmeler={[
                  {
                    key: "model",
                    label: "Model",
                    items: eklenebilir.map((m) => `Model · ${m.ad}`),
                  },
                  {
                    key: "parca",
                    label: "Parça",
                    items: eklenebilirParcalar.map((p) => `Parça · ${p.ad}`),
                  },
                ]}
                onValueChange={(v) => secimYap(s.id, v)}
                placeholder="Model veya parça seç"
              />
            )}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {m?.kategori ?? parca?.kategori ?? "—"}
          </TableCell>
          <TableCell className="tabular-nums">
            {m ? (
              m.stok > 0 ? (
                <span>
                  {m.stok.toLocaleString("tr-TR")}{" "}
                  <span className="text-xs text-muted-foreground">adet</span>
                </span>
              ) : (
                <span className="text-rose-600">Tükendi</span>
              )
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell>
            {durum === "eksik" ? (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                Eksik var
              </Badge>
            ) : durum === "yeterli" ? (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-800"
              >
                Eksik yok
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right">
            <Input
              type="number"
              min={1}
              value={s.adet}
              aria-label="Adet"
              onChange={(e) => adetGuncelle(s.id, e.target.value)}
              onBlur={() => {
                if (!(Number(s.adet) >= 1)) adetGuncelle(s.id, "1");
              }}
              className="ml-auto h-8 w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => sil(s.id)}
              aria-label="Sil"
            >
              <Trash2 className="size-4" />
            </Button>
          </TableCell>
        </TableRow>
        {detayAcik && m?.parcalar && (
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableCell colSpan={8} className="p-0">
              <div className="flex flex-col gap-1 px-12 py-2">
                {m.parcalar.map((ps) => {
                  const p = parcaMap.get(ps.parcaId);
                  const adet = Number(s.adet) || 1;
                  return (
                    <div
                      key={ps.parcaId}
                      className="flex items-center gap-3 text-sm"
                    >
                      <GorselHucre
                        gorseller={p?.gorseller}
                        alt={p?.ad ?? ps.parcaId}
                      />
                      <span className="font-medium">{p?.ad ?? ps.parcaId}</span>
                      <span className="text-xs text-muted-foreground">
                        {p?.kategori}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {ps.miktar} × {adet} ={" "}
                        <span className="font-medium text-foreground">
                          {(ps.miktar * adet).toLocaleString("tr-TR")} adet
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Plan bilgileri — standart liste kartı kabuğu */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Plan Bilgileri" ikon={ClipboardList} />
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Alan label="Üretim nedeni">
            <SearchSelect
              items={["Stok için", "Müşteri için"]}
              value={neden === "stok" ? "Stok için" : "Müşteri için"}
              onValueChange={(v) =>
                setNeden(v === "Müşteri için" ? "siparis" : "stok")
              }
              placeholder="Neden"
              searchPlaceholder="Ara..."
            />
          </Alan>

          {neden === "stok" ? (
            <Alan label="Hedef depo">
              <SearchSelect
                items={aktifDepolar.map((d) => `${d.ad} · ${d.sehir}`)}
                value={
                  depoId
                    ? (() => {
                        const d = aktifDepolar.find((x) => x.id === depoId);
                        return d ? `${d.ad} · ${d.sehir}` : null;
                      })()
                    : null
                }
                onValueChange={(v) => {
                  if (!v) return setDepoId(null);
                  const ad = v.split(" · ")[0];
                  setDepoId(aktifDepolar.find((x) => x.ad === ad)?.id ?? null);
                }}
                placeholder="Depo seç"
                searchPlaceholder="Depo ara..."
              />
            </Alan>
          ) : (
            <Alan label="Müşteri">
              <SearchSelect
                items={musteriler.map((m) => `${m.ad} · ${m.sehir}`)}
                value={
                  musteriId
                    ? (() => {
                        const m = musteriler.find((x) => x.id === musteriId);
                        return m ? `${m.ad} · ${m.sehir}` : null;
                      })()
                    : null
                }
                onValueChange={(v) => {
                  if (!v) return setMusteriId(null);
                  const ad = v.split(" · ")[0];
                  setMusteriId(musteriler.find((x) => x.ad === ad)?.id ?? null);
                }}
                placeholder="Müşteri seç"
                searchPlaceholder="Müşteri ara..."
              />
            </Alan>
          )}

          <Alan label="Termin (başlangıç – bitiş)">
            <TarihAralikSecici
              baslangic={terminBas}
              bitis={termin}
              onChange={(bas, bit) => {
                setTerminBas(bas);
                setTermin(bit);
              }}
            />
          </Alan>

          <Alan label="Öncelik">
            <SearchSelect
              items={ONCELIKLER}
              value={oncelik}
              onValueChange={(v) =>
                setOncelik((v as UretimOncelik) ?? "Normal")
              }
              placeholder="Öncelik"
              searchPlaceholder="Ara..."
            />
          </Alan>
        </div>
      </div>

      {/* Üretim planı tablosu — standart liste kartı kabuğu */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Üretim Planı" ikon={Hammer}>
          <Button
            size="sm"
            variant="outline"
            onClick={satirEkle}
            disabled={eklenebilir.length === 0}
          >
            <Plus className="size-4" /> Model / Parça Ekle
          </Button>
        </ListHeader>
        {/* Plan satırları liste standardından (h-10) yüksek: hücrelerin içinde
            h-10 seçiciler var, kompakt yükseklikte sıkışık duruyor. Yalnız bu
            tabloya — paylaşılan Table bileşenine dokunulmuyor. */}
        <Table className="[&_tbody_td]:h-14 [&_tbody_td]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-16">Görsel</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-44">Kategori</TableHead>
              <TableHead className="w-36">Stok Durumu</TableHead>
              <TableHead className="w-32">Malzeme Durumu</TableHead>
              <TableHead className="w-24 text-right">Adet</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {secimler.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Henüz satır yok. “Model / Parça Ekle” ile başlayın.
                </TableCell>
              </TableRow>
            ) : (
              bloklar.map((blok) => {
                if (blok.tip === "satir") return satirRender(blok.secim);
                const model = urunMap.get(blok.modelId);
                const kapali = kapaliGruplar.has(blok.modelId);
                const ad = model?.ad ?? blok.modelId;
                return (
                  <React.Fragment key={`grup-${blok.modelId}`}>
                    {/* Model başlığı — altındaki parçalar bu modelden aktarıldı */}
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableCell colSpan={8} className="py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => grupToggle(blok.modelId)}
                            aria-expanded={!kapali}
                            aria-label={`${ad} grubunu ${kapali ? "aç" : "kapat"}`}
                            className="flex cursor-pointer items-center rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                kapali && "-rotate-90",
                              )}
                            />
                          </button>
                          <GorselHucre
                            gorseller={planResimleri(model)}
                            alt={ad}
                          />
                          <span className="font-medium">{ad}</span>
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-[10px] text-primary"
                          >
                            Model
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {blok.satirlar.length} parça
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="ml-auto text-muted-foreground"
                            onClick={() => grupSil(blok.modelId)}
                            aria-label={`${ad} grubunu sil`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {!kapali && blok.satirlar.map((s) => satirRender(s, true))}
                  </React.Fragment>
                );
              })
            )}
            {eklenebilir.length > 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-2">
                  <button
                    type="button"
                    onClick={satirEkle}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                  >
                    <Plus className="size-3.5" /> Model / Parça Ekle
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Malzeme ihtiyacı — standart liste kartı kabuğu */}
      {yeterlilik && (
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title="Malzeme İhtiyacı" ikon={Boxes}>
            {yeterli ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-100 text-emerald-800"
              >
                <CheckCircle2 className="size-3" /> Stok yeterli
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-100 text-amber-800"
              >
                <AlertTriangle className="size-3" /> {yeterlilik.eksik.length}{" "}
                malzeme eksik
              </Badge>
            )}
          </ListHeader>

          <MalzemeTablosu
            ihtiyac={yeterlilik.ihtiyac.slice(0, gorunen)}
            secim={
              yeterli
                ? undefined
                : {
                    has: (id) => seciliEksik.has(id),
                    toggle: eksikSecimDegis,
                    tumu: tumuEksikSecili,
                    bazi: baziEksikSecili,
                    tumSec: tumEksikSec,
                  }
            }
          />

          {gorunen < yeterlilik.ihtiyac.length && (
            <button
              type="button"
              onClick={() =>
                setGorunen((g) => Math.min(g + 5, yeterlilik.ihtiyac.length))
              }
              className="flex w-full items-center justify-center gap-2 border-t py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <ChevronDown className="size-4" /> Devamını gör (
              {yeterlilik.ihtiyac.length - gorunen} kaldı)
            </button>
          )}

          {!yeterli && (
            <div className="border-t p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border border-amber-300/60 bg-amber-50/70 px-2.5 py-1.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <span className="text-sm text-amber-900">
                  <strong>
                    {secilenEksik.length}/{yeterlilik.eksik.length}
                  </strong>{" "}
                  eksik seçili
                </span>
                <span className="text-xs text-muted-foreground">
                  tahmini maliyet{" "}
                  <span className="font-medium text-foreground">
                    {formatTL(eksikMaliyet)}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={satinAlmaTalebineGit}
                  disabled={secilenEksik.length === 0}
                  className="ml-auto border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                >
                  <ShoppingCart className="size-3" /> Satın Alma Talebi Oluştur
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-muted-foreground tabular-nums">
              {secimler.length} model · {toplamAdet} adet
            </span>
            <span className="font-semibold tabular-nums">
              {formatTL(yeterlilik.toplamMaliyet)}
            </span>
          </div>
        </div>
      )}

      {/* Alt aksiyon */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => olustur("Planlandı")}
          disabled={!modelGecerli || kaydediliyor}
        >
          <FileText className="size-4" /> Taslak Kaydet
        </Button>
        <Button
          onClick={() => olustur("Üretimde")}
          disabled={!!gonderEngel || kaydediliyor}
          title={gonderEngel ?? undefined}
        >
          <Hammer className="size-4" /> Üretime Gönder
        </Button>
      </div>

      {/* ── Model → parça aktarma modalı ── */}
      <Dialog
        open={parcaModal !== null}
        onOpenChange={(o) => !o && setParcaModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          {parcaModal && (
            <>
              <DialogHeader>
                <DialogTitle>{parcaModal.model.ad} — Parçalar</DialogTitle>
                <DialogDescription>
                  Modele bağlı parçalar; işaretleyip adet girerek plana
                  aktarabilirsin. Adetler 1 model içindir.
                </DialogDescription>
              </DialogHeader>
              <div className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto rounded-md border p-1.5">
                {parcaModal.satirlar.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Modele bağlı parça yok.
                  </p>
                )}
                {parcaModal.satirlar.map((r) => (
                  <label
                    key={r.parcaId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/50",
                      // Seçili satır primary tonunda belirginleşir.
                      r.secili &&
                        "border-primary/30 bg-primary/10 hover:bg-primary/15",
                    )}
                  >
                    <Checkbox
                      checked={r.secili}
                      onCheckedChange={(v) =>
                        setParcaModal((pm) =>
                          pm
                            ? {
                                ...pm,
                                satirlar: pm.satirlar.map((x) =>
                                  x.parcaId === r.parcaId
                                    ? { ...x, secili: v === true }
                                    : x,
                                ),
                              }
                            : pm,
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {r.ad}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={r.adet}
                      aria-label="Adet"
                      onClick={(e) => e.preventDefault()}
                      onChange={(e) =>
                        setParcaModal((pm) =>
                          pm
                            ? {
                                ...pm,
                                satirlar: pm.satirlar.map((x) =>
                                  x.parcaId === r.parcaId
                                    ? {
                                        ...x,
                                        adet: e.target.value.replace(
                                          /[^\d]/g,
                                          "",
                                        ),
                                      }
                                    : x,
                                ),
                              }
                            : pm,
                        )
                      }
                      className="h-7 w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setParcaModal(null)}
                >
                  Vazgeç
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => modaldanAktar(true)}
                  disabled={parcaModal.satirlar.length === 0}
                >
                  Hepsini Aktar
                </Button>
                {parcaModal.satirlar.some((r) => r.secili) && (
                  <Button size="sm" onClick={() => modaldanAktar(false)}>
                    Seçileni Aktar (
                    {parcaModal.satirlar.filter((r) => r.secili).length})
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Alan({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function MalzemeTablosu({
  ihtiyac,
  secim,
}: {
  ihtiyac: MalzemeIhtiyac[];
  secim?: {
    has: (id: string) => boolean;
    toggle: (id: string, v: boolean) => void;
    tumu: boolean;
    bazi: boolean;
    tumSec: (v: boolean) => void;
  };
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {secim && (
            <TableHead className="w-8">
              <Checkbox
                checked={secim.tumu}
                indeterminate={!secim.tumu && secim.bazi}
                onCheckedChange={(v) => secim.tumSec(v === true)}
                aria-label="Tüm eksikleri seç"
              />
            </TableHead>
          )}
          <TableHead className="w-10">#</TableHead>
          <TableHead className="w-16">Görsel</TableHead>
          <TableHead>Malzeme</TableHead>
          <TableHead className="text-right">Gerekli</TableHead>
          <TableHead className="text-right">Stok</TableHead>
          <TableHead className="text-right">Tutar</TableHead>
          <TableHead>Durum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ihtiyac.map((m, i) => {
          const yetersiz = m.toplamMiktar > m.malzeme.stok;
          return (
            <TableRow key={m.malzeme.id}>
              {secim && (
                <TableCell>
                  {yetersiz ? (
                    <Checkbox
                      checked={secim.has(m.malzeme.id)}
                      onCheckedChange={(v) =>
                        secim.toggle(m.malzeme.id, v === true)
                      }
                      aria-label={m.malzeme.ad}
                    />
                  ) : (
                    <span className="block size-4" />
                  )}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell>
                <GorselHucre
                  gorseller={m.malzeme.gorseller}
                  alt={m.malzeme.ad}
                />
              </TableCell>
              <TableCell className="font-medium">{m.malzeme.ad}</TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  yetersiz && "font-medium text-rose-600",
                )}
              >
                {m.toplamMiktar.toLocaleString("tr-TR", {
                  maximumFractionDigits: 2,
                })}{" "}
                {m.malzeme.birim}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {m.malzeme.stok.toLocaleString("tr-TR")} {m.malzeme.birim}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTL(m.toplamFiyat)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    yetersiz
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }
                >
                  {yetersiz ? "Eksik" : "Yeterli"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
