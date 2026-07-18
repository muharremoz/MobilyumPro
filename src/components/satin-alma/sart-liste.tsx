"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { FormSheet } from "@/components/ui/form-sheet";
import { AnimatedField } from "@/components/ui/animated-field";
import { TarihSecici } from "@/components/ui/tarih-secici";
import { IconInput } from "@/components/ui/icon-input";
import { SearchSelect } from "@/components/ui/search-select";
import { ErrorShakeField } from "@/components/ui/error-shake";
import { useOnay } from "@/components/ui/confirm-dialog";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Doviz, type Malzeme, type SatinAlmaSarti } from "@/lib/data";
import { paraDegeri, paraMaskele, paraMetni } from "@/lib/para";
import { stokUreticiKaydet, stokUreticiSil } from "@/lib/db/actions";

const DOVIZ_SEMBOL: Record<Doviz, string> = { TL: "₺", USD: "$", EUR: "€" };
const fiyatYaz = (n: number, d: Doviz) =>
  `${DOVIZ_SEMBOL[d]}${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

type SortKey = "malzeme" | "firma" | "fiyat" | "tedarik";

/** Fiyat kaç gün sonra "eski" sayılır (firmanın listesi yoksa tek ölçü budur). */
const ESKI_GUN = 180;

type Bayatlik = { seviye: "bayat" | "eski" | "bilinmiyor"; mesaj: string };

/**
 * Şart fiyatının güncelliği. İki ayrı durum var:
 *  - "bayat": firmanın fiyat listesi, fiyatın girildiği tarihten YENİ →
 *    liste değişmiş ama şart güncellenmemiş olabilir (asıl uyarı budur).
 *  - "eski": liste yok ama fiyat 6 aydan uzun süredir dokunulmamış.
 * PDF'in içi okunmaz; yalnız tarihler karşılaştırılır.
 */
function bayatlik(s: SatinAlmaSarti): Bayatlik | null {
  const listeTarih = s.fiyatListesi?.gecerlilik;
  // Tarih yoksa fiyatın eski OLDUĞUNU bilmiyoruz — yalnız bilmediğimizi biliyoruz.
  // Bu yüzden "bayat" demiyor; sessiz bir bilgi işareti bırakıyoruz. Şart bir kez
  // kaydedilince tarih damgalanır ve işaret kendiliğinden kaybolur.
  if (!s.fiyatTarihi) {
    return listeTarih
      ? {
          seviye: "bilinmiyor",
          mesaj: `Bu fiyatın ne zaman girildiği kayıtlı değil, bu yüzden güncelliği ölçülemiyor. Firmanın ${tarihYaz(listeTarih)} tarihli fiyat listesi var; karşılaştırıp şartı bir kez kaydedersen tarih damgalanır.`,
        }
      : null;
  }
  if (listeTarih && listeTarih > s.fiyatTarihi)
    return {
      seviye: "bayat",
      mesaj: `Firmanın fiyat listesi ${tarihYaz(listeTarih)} tarihli; şarttaki fiyat ise ${tarihYaz(s.fiyatTarihi)} tarihinden kalma.`,
    };
  const gun = Math.floor(
    (Date.now() - new Date(s.fiyatTarihi).getTime()) / 86_400_000,
  );
  if (gun > ESKI_GUN)
    return {
      seviye: "eski",
      mesaj: `Fiyat ${gun} gündür güncellenmedi (${tarihYaz(s.fiyatTarihi)}).`,
    };
  return null;
}

const tarihYaz = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Seçili firmanın fiyat listesi — sheet'te fiyat girilirken referans olsun diye
 * gösterilir. Belge yalnızca açılır; içeriğinden fiyat okunmaz.
 */
function FiyatListesiNotu({
  sartlar,
  cariId,
}: {
  sartlar: SatinAlmaSarti[];
  cariId: string;
}) {
  const liste = cariId
    ? sartlar.find((x) => x.cariId === cariId && x.fiyatListesi)?.fiyatListesi
    : undefined;
  if (!liste) return null;
  return (
    <a
      href={liste.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs transition-colors hover:bg-muted"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{liste.ad}</span>
      {liste.gecerlilik && (
        <span className="shrink-0 text-muted-foreground">
          {tarihYaz(liste.gecerlilik)}
        </span>
      )}
    </a>
  );
}

/** Fiyatın yanındaki uyarı işareti — sebebi hover'da açılır. */
function BayatlikIsareti({ sart }: { sart: SatinAlmaSarti }) {
  const b = bayatlik(sart);
  if (!b) return null;
  const bayat = b.seviye === "bayat";
  const Ikon = bayat ? AlertTriangle : Clock;
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={
          <span
            className={
              bayat
                ? "cursor-help text-amber-600"
                : "cursor-help text-muted-foreground/60"
            }
          />
        }
      >
        <Ikon className="size-3.5" />
      </HoverCardTrigger>
      <HoverCardContent className="w-72 text-xs">
        <p className="font-medium">
          {b.seviye === "bayat"
            ? "Fiyat listeden eski"
            : b.seviye === "eski"
              ? "Fiyat uzun süredir güncellenmedi"
              : "Fiyat tarihi bilinmiyor"}
        </p>
        <p className="mt-1 text-muted-foreground">{b.mesaj}</p>
        {sart.fiyatListesi && (
          <a
            href={sart.fiyatListesi.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-primary underline underline-offset-2"
          >
            <FileText className="size-3" />
            {sart.fiyatListesi.ad}
          </a>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

type Form = {
  id?: number;
  stokId: string;
  cariId: string;
  fiyat: string; // maskeli
  doviz: Doviz;
  minSiparis: string;
  tedarikGun: string;
  ureticiKodu: string;
  /** Fiyatın geçerli olduğu tarih; boş bırakılırsa kayıt anı damgalanır. */
  fiyatTarihi: string;
};

const BOS: Form = {
  stokId: "",
  cariId: "",
  fiyat: "",
  doviz: "TL",
  minSiparis: "",
  tedarikGun: "",
  ureticiKodu: "",
  fiyatTarihi: "",
};

/**
 * Malzeme adları uzun; liste kendini en uzun ada göre genişletince sheet'i
 * aşıyordu. Genişliği alanla sınırlayıp uzun adları alt satıra sardırıyoruz —
 * ad kesilmiyor, taşma da olmuyor.
 */
const SARAN_LISTE =
  "max-w-(--anchor-width) [&_[data-slot=combobox-item]]:h-auto [&_[data-slot=combobox-item]]:py-2 [&_[data-slot=combobox-item]]:whitespace-normal";

export function SartListe({
  sartlar,
  malzemeler,
  tedarikciler,
}: {
  sartlar: SatinAlmaSarti[];
  malzemeler: Malzeme[];
  tedarikciler: { id: string; ad: string }[];
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();

  const malzemeByAd = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.ad, m])),
    [malzemeler],
  );
  const malzemeById = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const cariByAd = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.ad, t])),
    [tedarikciler],
  );
  const cariById = React.useMemo(
    () => new Map(tedarikciler.map((t) => [t.id, t])),
    [tedarikciler],
  );

  // Kolon filtreleri + sıralama (proje standardı)
  const [malzemeF, setMalzemeF] = React.useState("");
  const [firmaF, setFirmaF] = React.useState("Tümü");
  const [fiyatAralik, setFiyatAralik] = React.useState({ min: "", max: "" });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "malzeme", dir: "asc" },
  );
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  const firmalar = React.useMemo(
    () =>
      [...new Set(sartlar.map((s) => s.cariAd))].sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [sartlar],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = sartlar.filter(
      (s) =>
        s.malzemeAd.toLowerCase().includes(malzemeF.toLowerCase()) &&
        (firmaF === "Tümü" || s.cariAd === firmaF) &&
        arada(s.fiyat, fiyatAralik.min, fiyatAralik.max),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      switch (sort.key) {
        case "fiyat":
          return (a.fiyat - b.fiyat) * yon;
        case "tedarik":
          return ((a.tedarikGun ?? 0) - (b.tedarikGun ?? 0)) * yon;
        case "firma":
          return a.cariAd.localeCompare(b.cariAd, "tr") * yon;
        default:
          return a.malzemeAd.localeCompare(b.malzemeAd, "tr") * yon;
      }
    });
  }, [sartlar, malzemeF, firmaF, fiyatAralik, sort]);

  // Her malzemenin en ucuz şartı (rozet için) — yalnız TL karşılaştırılır.
  const enUcuz = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sartlar) {
      if (s.doviz !== "TL") continue;
      const mevcut = m.get(s.stokId);
      if (mevcut === undefined || s.fiyat < mevcut) m.set(s.stokId, s.fiyat);
    }
    return m;
  }, [sartlar]);

  // ── Sheet (yeni / düzenle) ────────────────────────────────────────────
  const [acik, setAcik] = React.useState(false);
  const [form, setForm] = React.useState<Form>(BOS);
  const [hatalar, setHatalar] = React.useState<{
    stokId?: string;
    cariId?: string;
    fiyat?: string;
  }>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  function yeniAc() {
    setForm(BOS);
    setHatalar({});
    setAcik(true);
  }
  function duzenleAc(s: SatinAlmaSarti) {
    setForm({
      id: s.id,
      stokId: s.stokId,
      cariId: s.cariId,
      fiyat: paraMetni(s.fiyat),
      doviz: s.doviz,
      minSiparis: s.minSiparis != null ? String(s.minSiparis) : "",
      tedarikGun: s.tedarikGun != null ? String(s.tedarikGun) : "",
      ureticiKodu: s.ureticiKodu ?? "",
      fiyatTarihi: s.fiyatTarihi ?? "",
    });
    setHatalar({});
    setAcik(true);
  }

  async function kaydet() {
    const h: typeof hatalar = {};
    if (!form.stokId) h.stokId = "Malzeme seçin.";
    if (!form.cariId) h.cariId = "Firma seçin.";
    if (!(paraDegeri(form.fiyat) > 0)) h.fiyat = "Fiyat girin.";
    if (h.stokId || h.cariId || h.fiyat) {
      setHatalar(h);
      setShakeNonce((n) => n + 1);
      return;
    }
    // Aynı malzeme+firma için ikinci şart açılmasın (düzenleme hariç).
    const mevcut = sartlar.find(
      (s) =>
        s.stokId === form.stokId &&
        s.cariId === form.cariId &&
        s.id !== form.id,
    );
    if (mevcut) {
      toast.error(
        `${mevcut.malzemeAd} için ${mevcut.cariAd} şartı zaten var — onu düzenleyin.`,
      );
      return;
    }
    setKaydediliyor(true);
    const res = await stokUreticiKaydet({
      id: form.id,
      stokId: form.stokId,
      cariId: form.cariId,
      cariAd: cariById.get(form.cariId)?.ad ?? "",
      fiyat: paraDegeri(form.fiyat),
      doviz: form.doviz,
      minSiparis: form.minSiparis ? Number(form.minSiparis) : undefined,
      tedarikGun: form.tedarikGun ? Number(form.tedarikGun) : undefined,
      ureticiKodu: form.ureticiKodu.trim() || undefined,
      fiyatTarihi: form.fiyatTarihi || undefined,
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Şart kaydedilemedi.");
      return;
    }
    toast.success(form.id ? "Şart güncellendi" : "Şart eklendi");
    setAcik(false);
    router.refresh();
  }

  async function sil(s: SatinAlmaSarti) {
    if (
      !(await onayla({
        title: `${s.malzemeAd} — ${s.cariAd} şartı silinsin mi?`,
        description: "Stok kartının Üretici sekmesinden de kalkar.",
      }))
    )
      return;
    const res = await stokUreticiSil(s.id, s.stokId);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Şart silindi");
    router.refresh();
  }

  const seciliMalzeme = malzemeById.get(form.stokId);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Satın Alma Şartları">
          <Button size="sm" onClick={yeniAc}>
            <Plus className="size-4" /> Yeni Şart
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("malzeme")}
                onSirala={sirala("malzeme")}
                filtre={{ tip: "metin", deger: malzemeF, onDeger: setMalzemeF }}
              >
                Malzeme
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("firma")}
                onSirala={sirala("firma")}
                filtre={{
                  tip: "liste",
                  secenekler: firmalar,
                  deger: firmaF,
                  onDeger: setFirmaF,
                }}
              >
                Firma
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("fiyat")}
                onSirala={sirala("fiyat")}
                filtre={{
                  tip: "sayi",
                  min: fiyatAralik.min,
                  max: fiyatAralik.max,
                  onDegis: (min, max) => setFiyatAralik({ min, max }),
                }}
              >
                Anlaşma Fiyatı
              </SiralaFiltreBaslik>
              <TableHead>Min. Sipariş</TableHead>
              <SiralaFiltreBaslik
                sira={sira("tedarik")}
                onSirala={sirala("tedarik")}
              >
                Tedarik Süresi
              </SiralaFiltreBaslik>
              <TableHead>Üretici Kodu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Şart yok. &quot;Yeni Şart&quot; ile malzeme–firma–fiyat
                  anlaşması tanımlayın.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((s) => (
                <SatirMenu
                  key={s.id}
                  className="w-44"
                  aksiyonlar={[
                    {
                      etiket: "Düzenle",
                      ikon: Pencil,
                      onSecim: () => duzenleAc(s),
                    },
                    {
                      etiket: "Sil",
                      ikon: Trash2,
                      tehlike: true,
                      onSecim: () => sil(s),
                    },
                  ]}
                >
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => duzenleAc(s)}
                  >
                    <TableCell className="font-medium">{s.malzemeAd}</TableCell>
                    <TableCell>{s.cariAd}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold tabular-nums">
                          {fiyatYaz(s.fiyat, s.doviz)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {s.birim}
                        </span>
                        {s.doviz === "TL" &&
                          enUcuz.get(s.stokId) === s.fiyat &&
                          sartlar.filter((x) => x.stokId === s.stokId).length >
                            1 && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-[10px] text-emerald-800"
                            >
                              En uygun
                            </Badge>
                          )}
                        <BayatlikIsareti sart={s} />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {s.minSiparis != null
                        ? `${s.minSiparis.toLocaleString("tr-TR")} ${s.birim}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {s.tedarikGun != null ? `${s.tedarikGun} gün` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.ureticiKodu ?? "—"}
                    </TableCell>
                  </TableRow>
                </SatirMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} şart
      </span>

      {/* Yeni / düzenle sheet'i — proje standardı FormSheet */}
      <FormSheet
        open={acik}
        onOpenChange={setAcik}
        title={form.id ? "Şartı Düzenle" : "Yeni Satın Alma Şartı"}
        icon={BadgePercentIcon}
        onSave={kaydet}
        saveLabel={
          kaydediliyor ? "Kaydediliyor..." : form.id ? "Güncelle" : "Ekle"
        }
        sheetClassName="data-[side=right]:sm:max-w-xl"
        contentClassName="flex flex-col gap-4"
      >
        <ErrorShakeField error={hatalar.stokId} shakeNonce={shakeNonce}>
          <AnimatedField label="Malzeme" icon={BoxesIcon}>
            <SearchSelect
              items={malzemeler.map((m) => m.ad)}
              value={seciliMalzeme?.ad ?? null}
              onValueChange={(v) => {
                setForm((f) => ({
                  ...f,
                  stokId: v ? (malzemeByAd.get(v)?.id ?? "") : "",
                }));
                setHatalar((h) => ({ ...h, stokId: undefined }));
              }}
              placeholder="Malzeme seç"
              listeClassName={SARAN_LISTE}
            />
          </AnimatedField>
        </ErrorShakeField>
        <ErrorShakeField error={hatalar.cariId} shakeNonce={shakeNonce}>
          <AnimatedField label="Firma" icon={BadgePercentIcon}>
            <SearchSelect
              items={tedarikciler.map((t) => t.ad)}
              value={cariById.get(form.cariId)?.ad ?? null}
              onValueChange={(v) => {
                setForm((f) => ({
                  ...f,
                  cariId: v ? (cariByAd.get(v)?.id ?? "") : "",
                }));
                setHatalar((h) => ({ ...h, cariId: undefined }));
              }}
              placeholder="Tedarikçi seç"
            />
          </AnimatedField>
        </ErrorShakeField>
        <FiyatListesiNotu sartlar={sartlar} cariId={form.cariId} />
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <ErrorShakeField error={hatalar.fiyat} shakeNonce={shakeNonce}>
            <IconInput
              label={`Anlaşma Fiyatı${seciliMalzeme ? ` (${seciliMalzeme.birim} başına)` : ""}`}
              icon={TurkishLiraIcon}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.fiyat}
              onChange={(e) => {
                setForm((f) => ({ ...f, fiyat: paraMaskele(e.target.value) }));
                setHatalar((h) => ({ ...h, fiyat: undefined }));
              }}
            />
          </ErrorShakeField>
          <AnimatedField label="Döviz" icon={TurkishLiraIcon}>
            <SearchSelect
              items={["TL", "USD", "EUR"]}
              value={form.doviz}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, doviz: (v as Doviz) || "TL" }))
              }
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <IconInput
            label={`Min. Sipariş${seciliMalzeme ? ` (${seciliMalzeme.birim})` : ""}`}
            icon={BoxesIcon}
            type="number"
            placeholder="ops."
            value={form.minSiparis}
            onChange={(e) =>
              setForm((f) => ({ ...f, minSiparis: e.target.value }))
            }
          />
          <IconInput
            label="Tedarik Süresi (gün)"
            icon={ScanTextIcon}
            type="number"
            placeholder="ops."
            value={form.tedarikGun}
            onChange={(e) =>
              setForm((f) => ({ ...f, tedarikGun: e.target.value }))
            }
          />
        </div>
        <IconInput
          label="Üretici Kodu"
          icon={ScanTextIcon}
          placeholder="Firmanın bu malzeme için kodu (ops.)"
          value={form.ureticiKodu}
          onChange={(e) =>
            setForm((f) => ({ ...f, ureticiKodu: e.target.value }))
          }
        />
        <AnimatedField label="Fiyat Tarihi" icon={CalendarDaysIcon}>
          <TarihSecici
            deger={form.fiyatTarihi}
            onChange={(iso) => setForm((f) => ({ ...f, fiyatTarihi: iso }))}
            placeholder="Kayıt tarihi kullanılır"
          />
        </AnimatedField>
        <p className="-mt-2 text-xs text-muted-foreground">
          Fiyatın hangi tarihli listeden alındığı. Boş bırakılırsa kayıt tarihi
          kullanılır; güncelliği bu tarihe göre ölçülür.
        </p>
        <p className="text-xs text-muted-foreground">
          Şartlar stok kartının Üretici sekmesiyle aynı kayıtlardır; alış
          formunda firma seçilince anlaşma fiyatı otomatik önerilir.
        </p>
      </FormSheet>

      {onayDialog}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CARİ SATIN ALMA LİSTESİ SEKMESİ                                    */
/* ------------------------------------------------------------------ */
/**
 * Cari kartındaki "Satın Alma Listesi" sekmesi — bu firmadan alınan
 * malzemelerin anlaşma şartları. Kayıtlar Satın Alma Şartları modülüyle
 * aynı tablodan (stok_uretici) gelir; buradan da eklenebilir.
 */
export function CariSartlarTab({
  cariId,
  cariAd,
  sartlar,
  malzemeler,
}: {
  cariId: string;
  cariAd: string;
  sartlar: SatinAlmaSarti[];
  malzemeler: Malzeme[];
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();

  const malzemeByAd = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.ad, m])),
    [malzemeler],
  );
  const malzemeById = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );

  const [acik, setAcik] = React.useState(false);
  const [form, setForm] = React.useState<Form>(BOS);
  const [hatalar, setHatalar] = React.useState<{
    stokId?: string;
    fiyat?: string;
  }>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  function yeniAc() {
    setForm({ ...BOS, cariId });
    setHatalar({});
    setAcik(true);
  }
  function duzenleAc(s: SatinAlmaSarti) {
    setForm({
      id: s.id,
      stokId: s.stokId,
      cariId,
      fiyat: paraMetni(s.fiyat),
      doviz: s.doviz,
      minSiparis: s.minSiparis != null ? String(s.minSiparis) : "",
      tedarikGun: s.tedarikGun != null ? String(s.tedarikGun) : "",
      ureticiKodu: s.ureticiKodu ?? "",
      fiyatTarihi: s.fiyatTarihi ?? "",
    });
    setHatalar({});
    setAcik(true);
  }

  async function kaydet() {
    const h: typeof hatalar = {};
    if (!form.stokId) h.stokId = "Malzeme seçin.";
    if (!(paraDegeri(form.fiyat) > 0)) h.fiyat = "Fiyat girin.";
    if (h.stokId || h.fiyat) {
      setHatalar(h);
      setShakeNonce((n) => n + 1);
      return;
    }
    const mevcut = sartlar.find(
      (s) => s.stokId === form.stokId && s.id !== form.id,
    );
    if (mevcut) {
      toast.error(`${mevcut.malzemeAd} şartı zaten var — onu düzenleyin.`);
      return;
    }
    setKaydediliyor(true);
    const res = await stokUreticiKaydet({
      id: form.id,
      stokId: form.stokId,
      cariId,
      cariAd,
      fiyat: paraDegeri(form.fiyat),
      doviz: form.doviz,
      minSiparis: form.minSiparis ? Number(form.minSiparis) : undefined,
      tedarikGun: form.tedarikGun ? Number(form.tedarikGun) : undefined,
      ureticiKodu: form.ureticiKodu.trim() || undefined,
      fiyatTarihi: form.fiyatTarihi || undefined,
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Şart kaydedilemedi.");
      return;
    }
    toast.success(form.id ? "Şart güncellendi" : "Şart eklendi");
    setAcik(false);
    router.refresh();
  }

  async function sil(s: SatinAlmaSarti) {
    if (
      !(await onayla({
        title: `${s.malzemeAd} şartı silinsin mi?`,
        description:
          "Satın Alma Şartları modülünden ve stok kartından da kalkar.",
      }))
    )
      return;
    const res = await stokUreticiSil(s.id, s.stokId);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Şart silindi");
    router.refresh();
  }

  const seciliMalzeme = malzemeById.get(form.stokId);

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <ListHeader title="Satın Alma Listesi">
        <Button size="sm" onClick={yeniAc}>
          <Plus className="size-4" /> Yeni Şart
        </Button>
      </ListHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Malzeme</TableHead>
            <TableHead>Anlaşma Fiyatı</TableHead>
            <TableHead>Min. Sipariş</TableHead>
            <TableHead>Tedarik Süresi</TableHead>
            <TableHead>Üretici Kodu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sartlar.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                Bu firmadan alınan malzeme şartı yok. &quot;Yeni Şart&quot; ile
                ekleyin.
              </TableCell>
            </TableRow>
          ) : (
            sartlar.map((s) => (
              <SatirMenu
                key={s.id}
                className="w-44"
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => duzenleAc(s),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    onSecim: () => sil(s),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => duzenleAc(s)}
                >
                  <TableCell className="font-medium">{s.malzemeAd}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {fiyatYaz(s.fiyat, s.doviz)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {s.birim}
                      </span>
                      <BayatlikIsareti sart={s} />
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {s.minSiparis != null
                      ? `${s.minSiparis.toLocaleString("tr-TR")} ${s.birim}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {s.tedarikGun != null ? `${s.tedarikGun} gün` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.ureticiKodu ?? "—"}
                  </TableCell>
                </TableRow>
              </SatirMenu>
            ))
          )}
        </TableBody>
      </Table>

      <FormSheet
        open={acik}
        onOpenChange={setAcik}
        title={form.id ? "Şartı Düzenle" : `Yeni Şart — ${cariAd}`}
        icon={BadgePercentIcon}
        onSave={kaydet}
        saveLabel={
          kaydediliyor ? "Kaydediliyor..." : form.id ? "Güncelle" : "Ekle"
        }
        sheetClassName="data-[side=right]:sm:max-w-xl"
        contentClassName="flex flex-col gap-4"
      >
        <ErrorShakeField error={hatalar.stokId} shakeNonce={shakeNonce}>
          <AnimatedField label="Malzeme" icon={BoxesIcon}>
            <SearchSelect
              items={malzemeler.map((m) => m.ad)}
              value={seciliMalzeme?.ad ?? null}
              onValueChange={(v) => {
                setForm((f) => ({
                  ...f,
                  stokId: v ? (malzemeByAd.get(v)?.id ?? "") : "",
                }));
                setHatalar((h) => ({ ...h, stokId: undefined }));
              }}
              placeholder="Malzeme seç"
              listeClassName={SARAN_LISTE}
            />
          </AnimatedField>
        </ErrorShakeField>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <ErrorShakeField error={hatalar.fiyat} shakeNonce={shakeNonce}>
            <IconInput
              label={`Anlaşma Fiyatı${seciliMalzeme ? ` (${seciliMalzeme.birim} başına)` : ""}`}
              icon={TurkishLiraIcon}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.fiyat}
              onChange={(e) => {
                setForm((f) => ({ ...f, fiyat: paraMaskele(e.target.value) }));
                setHatalar((h) => ({ ...h, fiyat: undefined }));
              }}
            />
          </ErrorShakeField>
          <AnimatedField label="Döviz" icon={TurkishLiraIcon}>
            <SearchSelect
              items={["TL", "USD", "EUR"]}
              value={form.doviz}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, doviz: (v as Doviz) || "TL" }))
              }
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <IconInput
            label={`Min. Sipariş${seciliMalzeme ? ` (${seciliMalzeme.birim})` : ""}`}
            icon={BoxesIcon}
            type="number"
            placeholder="ops."
            value={form.minSiparis}
            onChange={(e) =>
              setForm((f) => ({ ...f, minSiparis: e.target.value }))
            }
          />
          <IconInput
            label="Tedarik Süresi (gün)"
            icon={ScanTextIcon}
            type="number"
            placeholder="ops."
            value={form.tedarikGun}
            onChange={(e) =>
              setForm((f) => ({ ...f, tedarikGun: e.target.value }))
            }
          />
        </div>
        <IconInput
          label="Üretici Kodu"
          icon={ScanTextIcon}
          placeholder="Firmanın bu malzeme için kodu (ops.)"
          value={form.ureticiKodu}
          onChange={(e) =>
            setForm((f) => ({ ...f, ureticiKodu: e.target.value }))
          }
        />
        <AnimatedField label="Fiyat Tarihi" icon={CalendarDaysIcon}>
          <TarihSecici
            deger={form.fiyatTarihi}
            onChange={(iso) => setForm((f) => ({ ...f, fiyatTarihi: iso }))}
            placeholder="Kayıt tarihi kullanılır"
          />
        </AnimatedField>
        <p className="-mt-2 text-xs text-muted-foreground">
          Fiyatın hangi tarihli listeden alındığı. Boş bırakılırsa kayıt tarihi
          kullanılır; güncelliği bu tarihe göre ölçülür.
        </p>
      </FormSheet>

      {onayDialog}
    </div>
  );
}
