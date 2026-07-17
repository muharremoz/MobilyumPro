"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { ListHeader } from "@/components/ui/list-header";
import { filtreCipleri } from "@/components/ui/filtre-cipleri";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import { usePropAynasi } from "@/hooks/use-prop-aynasi";
import { useOnay } from "@/components/ui/confirm-dialog";
import { SatirMenu } from "@/components/ui/satir-menu";
import { GrupAgaci } from "@/components/definitions/grup-agaci";
import type { StokGrup, TanimTip, TanimKalemi } from "@/lib/data";
import { tanimKaydet, tanimSil } from "@/lib/db/actions";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { SlidersHorizontalIcon } from "@/components/ui/icons/sliders-horizontal";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Tanim = {
  id: string;
  ad: string;
  adet: number;
  durum: "Aktif" | "Pasif";
  /** Yalnız renk: geçerli olduğu malzeme cinsleri (boş = hepsi). */
  cinsler?: string[];
};
export type TabKey =
  | "gruplar"
  | "tipler"
  | "markalar"
  | "koleksiyonlar"
  | "renkler"
  | "kumaslar"
  | "birimler";

export const TABS: Record<TabKey, { label: string; tekil: string }> = {
  gruplar: { label: "Gruplar", tekil: "Grup" },
  tipler: { label: "Tipler", tekil: "Tip" },
  markalar: { label: "Markalar", tekil: "Marka" },
  koleksiyonlar: { label: "Koleksiyonlar", tekil: "Koleksiyon" },
  renkler: { label: "Renkler", tekil: "Renk" },
  kumaslar: { label: "Kumaşlar", tekil: "Kumaş" },
  birimler: { label: "Birimler", tekil: "Birim" },
};

// Sol menü grupları (alt menü).
export const MENU: { label: string; keys: TabKey[] }[] = [
  { label: "Stok", keys: ["gruplar", "tipler"] },
  { label: "Model", keys: ["markalar", "koleksiyonlar"] },
  { label: "Özellik", keys: ["renkler", "kumaslar", "birimler"] },
];

type DuzTab = Exclude<TabKey, "gruplar">;

// Sekme → DB tanım tipi (tanim.tip kolonu).
const TIP_MAP: Record<DuzTab, TanimTip> = {
  tipler: "tip",
  markalar: "marka",
  koleksiyonlar: "koleksiyon",
  renkler: "renk",
  kumaslar: "kumas",
  birimler: "birim",
};

const BOS: Record<DuzTab, Tanim[]> = {
  tipler: [],
  markalar: [],
  koleksiyonlar: [],
  renkler: [],
  kumaslar: [],
  birimler: [],
};

function tanimlardanData(
  tanimlar?: Record<TanimTip, TanimKalemi[]>,
): Record<DuzTab, Tanim[]> {
  if (!tanimlar) return BOS;
  return {
    tipler: tanimlar.tip,
    markalar: tanimlar.marka,
    koleksiyonlar: tanimlar.koleksiyon,
    renkler: tanimlar.renk,
    kumaslar: tanimlar.kumas,
    birimler: tanimlar.birim,
  };
}

type SortKey = "ad" | "adet" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "ad", label: "Ad", aciklama: "Tanımın adı.", kilitli: true },
  {
    key: "adet",
    label: "Kullanım",
    aciklama: "Bu tanımı kullanan kayıt sayısı.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function DefinitionsPage({
  hideMenu = false,
  tip: tipProp,
  onTipChange,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
  gruplar = [],
  tanimlar,
}: {
  /** Sol gruplu menüyü gizler (üst kapsayıcı kendi menüsünü kullanır). */
  hideMenu?: boolean;
  /** Dış kontrollü tip (verilirse iç state yerine bu kullanılır). */
  tip?: TabKey;
  onTipChange?: (k: TabKey) => void;
  /** Kolon ayarları (liste_ayar "tanimlamalar"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
  /** Stok grup ağacı (DB'den). */
  gruplar?: StokGrup[];
  /** Düz tanımlar (DB'den, tip → kayıtlar). */
  tanimlar?: Record<TanimTip, TanimKalemi[]>;
} = {}) {
  const { onayla, onayDialog } = useOnay();
  // Türetilmiş veri önce memo'lanır: usePropAynasi kimlik (===) karşılaştırır,
  // her render'da yeniden hesaplanan nesne verilirse sonsuz döngü olur.
  const tanimVerisi = React.useMemo(
    () => tanimlardanData(tanimlar),
    [tanimlar],
  );
  const [data, setData] = usePropAynasi(tanimVerisi);
  const [tabState, setTabState] = React.useState<TabKey>("gruplar");
  // Renk sekmesinde seçilebilecek malzeme cinsleri (cins tanımları).
  const cinsAdlari = React.useMemo(
    () =>
      (tanimlar?.cins ?? [])
        .filter((c) => c.durum === "Aktif")
        .map((c) => c.ad),
    [tanimlar],
  );
  const tab = tipProp ?? tabState;
  const setTab = (k: TabKey) => {
    setTabState(k);
    onTipChange?.(k);
  };
  // Kolon filtreleri (başlık popover'larından)
  const [adFiltre, setAdFiltre] = React.useState("");
  const [adetAralik, setAdetAralik] = React.useState({ min: "", max: "" });
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "ad",
    dir: "asc",
  });
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Tanim | null>(null);
  const [acikGrup, setAcikGrup] = React.useState<Set<string>>(
    () => new Set(MENU.map((g) => g.label)),
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "tanimlamalar",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const aktifTab = TABS[tab];

  function grupAcKapa(label: string) {
    setAcikGrup((s) => {
      const n = new Set(s);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });
  }

  // Gruplar sekmesi ağaç olarak render edilir, düz liste yok. memo şart:
  // çıplak "[]" her render'da yeni dizi üretip alttaki memo'yu işlevsiz bırakır.
  const liste = React.useMemo(
    () => (tab === "gruplar" ? [] : data[tab]),
    [tab, data],
  );

  const filtreli = React.useMemo(() => {
    const qAd = adFiltre.toLowerCase();
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((x) => {
      const ad = x.ad.toLowerCase().includes(qAd);
      const adet = arada(x.adet, adetAralik.min, adetAralik.max);
      const dur = durum === "Tümü" || x.durum === durum;
      return ad && adet && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, adFiltre, adetAralik, durum, sort]);

  // Başlıktaki aktif filtre çipleri — proje standardı (ui/filtre-cipleri).
  const cip = filtreCipleri(liste);
  cip.metin("Ad", adFiltre, (x) => x.ad, () => setAdFiltre(""));
  cip.liste("Durum", durum, (x) => x.durum, () => setDurum("Tümü"));
  cip.sayi("Adet", adetAralik, (x) => x.adet, () =>
    setAdetAralik({ min: "", max: "" }),
  );

  const sayfalama = useSayfalama(filtreli, "tanimlamalar");
  const { sayfalik, setSayfa } = sayfalama;

  // Tip değişince filtre/seçim/sayfa sıfırla; filtre değişince sayfaya dön.
  React.useEffect(() => {
    setAdFiltre("");
    setAdetAralik({ min: "", max: "" });
    setDurum("Tümü");
    setSecili(new Set());
    setSayfa(1);
  }, [tab, setSayfa]);
  React.useEffect(
    () => setSayfa(1),
    [adFiltre, adetAralik, durum, setSayfa],
  );

  const sayfaIds = sayfalik.map((x) => x.id);
  const tumuSecili = sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function secimDegis(id: string, v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function tumunuSec(v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      sayfaIds.forEach((id) => (v ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  async function kaydet(degerler: {
    ad: string;
    durum: "Aktif" | "Pasif";
    cinsler?: string[];
  }) {
    if (tab === "gruplar") return;
    const t = tab;
    const onceki = data;
    const geciciId = `gecici-${Math.floor(Math.random() * 100000)}`;
    setData((d) => ({
      ...d,
      [t]: duzenlenen
        ? d[t].map((x) => (x.id === duzenlenen.id ? { ...x, ...degerler } : x))
        : [{ id: geciciId, adet: 0, ...degerler }, ...d[t]],
    }));
    const res = await tanimKaydet(TIP_MAP[t], {
      id: duzenlenen?.id,
      ...degerler,
    });
    if (!res.ok) {
      setData(onceki);
      toast.error(res.error ?? "Tanım kaydedilemedi.");
      return;
    }
    // Yeni kayıtta geçici id'yi DB id'siyle değiştir.
    if (!duzenlenen && res.id)
      setData((d) => ({
        ...d,
        [t]: d[t].map((x) => (x.id === geciciId ? { ...x, id: res.id! } : x)),
      }));
    toast.success(
      duzenlenen ? `${aktifTab.tekil} güncellendi` : `${aktifTab.tekil} eklendi`,
    );
  }

  async function sil(ids: string[]) {
    if (tab === "gruplar") return;
    const t = tab;
    const tekAd =
      ids.length === 1 ? data[t].find((x) => x.id === ids[0])?.ad : null;
    if (
      !(await onayla({
        title:
          ids.length === 1
            ? `"${tekAd ?? aktifTab.tekil}" silinsin mi?`
            : `${ids.length} kayıt silinsin mi?`,
        description: "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = data;
    setData((d) => ({ ...d, [t]: d[t].filter((x) => !ids.includes(x.id)) }));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await tanimSil(ids);
    if (!res.ok) {
      setData(onceki);
      toast.error(res.error ?? "Tanım silinemedi.");
      return;
    }
    toast.success(`${ids.length} kayıt silindi`);
  }

  // Kolon başlığı sıralama yardımcıı — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex gap-4">
      {/* Sol dikey menü — gruplu (alt menü) */}
      {!hideMenu && (
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1 rounded-md border bg-card p-1.5">
          {MENU.map((g) => {
            const acik = acikGrup.has(g.label);
            return (
              <div key={g.label}>
                <button
                  type="button"
                  onClick={() => grupAcKapa(g.label)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase transition-colors hover:text-foreground"
                >
                  <span>{g.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      !acik && "-rotate-90",
                    )}
                  />
                </button>
                {acik && (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {g.keys.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                          tab === k
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <span>{TABS[k].label}</span>
                        <span className="text-xs text-muted-foreground/70">
                          {k === "gruplar" ? gruplar.length : data[k].length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      )}

      {/* Sağ içerik — Gruplar sekmesi ağaç, diğerleri düz liste */}
      {tab === "gruplar" ? (
        <div className="min-w-0 flex-1">
          <GrupAgaci gruplar={gruplar} />
        </div>
      ) : (
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Toplu işlem çubuğu */}
        {secili.size > 0 && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">{secili.size} seçili</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-rose-600"
              onClick={() => sil([...secili])}
            >
              <Trash2 className="size-3.5" /> Seçilenleri sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSecili(new Set())}>
              Temizle
            </Button>
          </div>
        )}

        {/* Tablo — proje standardı liste kartı */}
        <div className="overflow-hidden rounded-md border bg-card">
          <ListHeader title={aktifTab.label} filtreler={cip.sonuc()}>
            {yonetici && <KolonAyarButonu kolon={kolon} />}
            <Button
              size="sm"
              onClick={() => {
                setDuzenlenen(null);
                setSheetOpen(true);
              }}
            >
              <Plus className="size-4" /> Yeni {aktifTab.tekil}
            </Button>
          </ListHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={tumuSecili}
                    indeterminate={!tumuSecili && baziSecili}
                    onCheckedChange={(v) => tumunuSec(v === true)}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <SiralaFiltreBaslik
                  sira={sira("ad")}
                  onSirala={sirala("ad")}
                  filtre={{ tip: "metin", deger: adFiltre, onDeger: setAdFiltre }}
                >
                  Ad
                </SiralaFiltreBaslik>
                {tab === "renkler" && <TableHead>Malzeme Cinsleri</TableHead>}
                {kolon.temelGorunur("adet") && (
                  <SiralaFiltreBaslik
                    className="text-right"
                    sira={sira("adet")}
                    onSirala={sirala("adet")}
                    filtre={{
                      tip: "sayi",
                      min: adetAralik.min,
                      max: adetAralik.max,
                      onDegis: (min, max) => setAdetAralik({ min, max }),
                    }}
                  >
                    Kullanım
                  </SiralaFiltreBaslik>
                )}
                {kolon.temelGorunur("durum") && (
                  <SiralaFiltreBaslik
                    sira={sira("durum")}
                    onSirala={sirala("durum")}
                    filtre={{
                      tip: "liste",
                      secenekler: ["Aktif", "Pasif"],
                      deger: durum,
                      onDeger: setDurum,
                    }}
                  >
                    Durum
                  </SiralaFiltreBaslik>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sayfalik.map((x) => (
                <SatirMenu
                  key={x.id}
                  aksiyonlar={[
                    {
                      etiket: "Düzenle",
                      ikon: Pencil,
                      onSecim: () => {
                        setDuzenlenen(x);
                        setSheetOpen(true);
                      },
                    },
                    {
                      etiket: "Sil",
                      ikon: Trash2,
                      tehlike: true,
                      ayracOnce: true,
                      onSecim: () => sil([x.id]),
                    },
                  ]}
                >
                <TableRow
                  data-state={secili.has(x.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => {
                    setDuzenlenen(x);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(x.id)}
                      onCheckedChange={(v) => secimDegis(x.id, v === true)}
                      aria-label={`${x.ad} seç`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{x.ad}</TableCell>
                  {tab === "renkler" && (
                    <TableCell>
                      {x.cinsler?.length ? (
                        <span className="flex flex-wrap gap-1">
                          {x.cinsler.map((c) => (
                            <Badge key={c} variant="secondary">
                              {c}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Tümü
                        </span>
                      )}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("adet") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {x.adet}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <Badge
                        variant={x.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {x.durum}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
                </SatirMenu>
              ))}
              {sayfalik.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={1 + kolon.gorunurTemelSayisi + (tab === "renkler" ? 1 : 0)}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Kayıt bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtreli.length} kayıt
            {secili.size > 0 ? ` · ${secili.size} seçili` : ""}
          </span>
          <SayfalamaKontrol sayfalama={sayfalama} />
        </div>
      </div>
      )}

      <DefinitionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        tekil={aktifTab.tekil}
        cinsSecenekleri={tab === "renkler" ? cinsAdlari : undefined}
        onSave={kaydet}
      />

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}

function DefinitionSheet({
  open,
  onOpenChange,
  item,
  tekil,
  cinsSecenekleri,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Tanim | null;
  tekil: string;
  /** Renk sekmesinde seçilebilecek malzeme cinsleri; boşsa alan gizlenir. */
  cinsSecenekleri?: string[];
  onSave: (v: {
    ad: string;
    durum: "Aktif" | "Pasif";
    cinsler?: string[];
  }) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">("Aktif");
  const [cinsler, setCinsler] = React.useState<string[]>([]);
  const durumRef = React.useRef<AnimatedIconHandle>(null);
  const renkMi = (cinsSecenekleri?.length ?? 0) > 0;

  React.useEffect(() => {
    if (!open) return;
    setAd(item?.ad ?? "");
    setDurum(item?.durum ?? "Aktif");
    setCinsler(item?.cinsler ?? []);
  }, [open, item]);

  const cinsDegis = (c: string) =>
    setCinsler((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));

  function kaydet() {
    if (!ad.trim()) {
      toast.error(`${tekil} adı gerekli`);
      return;
    }
    onSave({
      ad: ad.trim(),
      durum,
      cinsler: renkMi ? cinsler : undefined,
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `${tekil} Düzenle` : `Yeni ${tekil}`}
      icon={SlidersHorizontalIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label={`${tekil} Adı`}
          icon={SlidersHorizontalIcon}
          placeholder={`Örn. ${tekil} adı`}
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => setDurum((s) => (s === "Aktif" ? "Pasif" : "Aktif"))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDurum((s) => (s === "Aktif" ? "Pasif" : "Aktif"));
            }
          }}
          onMouseEnter={() => durumRef.current?.startAnimation()}
          onMouseLeave={() => durumRef.current?.stopAnimation()}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <CircleCheckIcon ref={durumRef} size={15} className="text-muted-foreground" />
            Durum
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{durum}</span>
            <Switch
              checked={durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>

        {/* Renk hangi malzeme cinslerinde kullanılabilir (örn. Sunta + MDF) */}
        {renkMi && (
          <div className="rounded-md border border-input p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">Malzeme Cinsleri</span>
              <span className="text-xs text-muted-foreground">
                {cinsler.length === 0 ? "Tümü" : `${cinsler.length} seçili`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cinsSecenekleri!.map((c) => {
                const secili = cinsler.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => cinsDegis(c)}
                    className={cn(
                      "cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors",
                      secili
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Boş bırakılırsa renk tüm malzemelerde geçerli sayılır.
            </p>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
