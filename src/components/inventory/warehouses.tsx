"use client";

import * as React from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { SatirMenu } from "@/components/ui/satir-menu";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOnay } from "@/components/ui/confirm-dialog";
import type { Depo } from "@/lib/data";
import { depoKaydet, depoSil } from "@/lib/db/actions";

type SortKey = "id" | "ad" | "sehir" | "kapasite" | "doluluk" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Kod", aciklama: "Depo kodu (DEP-####)." },
  { key: "ad", label: "Depo", aciklama: "Deponun adı.", kilitli: true },
  { key: "sehir", label: "Şehir", aciklama: "Deponun bulunduğu şehir." },
  { key: "kapasite", label: "Kapasite", aciklama: "Toplam kapasite (adet)." },
  { key: "doluluk", label: "Doluluk", aciklama: "Dolu miktar ve oranı." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function Warehouses({
  depolar,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  depolar: Depo[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const { onayla, onayDialog } = useOnay();
  const [liste, setListe] = React.useState<Depo[]>(depolar);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({
    id: "",
    ad: "",
    sehir: "",
  });
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"kapasite" | "doluluk", { min: string; max: string }>
  >({ kapasite: { min: "", max: "" }, doluluk: { min: "", max: "" } });
  const [durumF, setDurumF] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "ad", dir: "asc" },
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<Depo | null>(null);

  React.useEffect(() => setListe(depolar), [depolar]);

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "depolar",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((d) => {
      const kod = d.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = d.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const sehir = d.sehir
        .toLowerCase()
        .includes(metinFiltre.sehir.toLowerCase());
      const kap = arada(
        d.kapasite,
        sayiFiltre.kapasite.min,
        sayiFiltre.kapasite.max,
      );
      const dol = arada(
        d.doluluk,
        sayiFiltre.doluluk.min,
        sayiFiltre.doluluk.max,
      );
      const dur = durumF === "Tümü" || d.durum === durumF;
      return kod && ad && sehir && kap && dol && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, metinFiltre, sayiFiltre, durumF, sort]);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  async function kaydet(d: Depo) {
    const yeni = !d.id;
    const gecici: Depo = yeni ? { ...d, id: `DEP-yeni-${Date.now()}` } : d;
    const onceki = liste;
    setListe((l) => {
      const i = l.findIndex((x) => x.id === gecici.id);
      if (i >= 0) {
        const n = [...l];
        n[i] = gecici;
        return n;
      }
      return [gecici, ...l];
    });
    const sonuc = await depoKaydet(yeni ? { ...d, id: "" } : d);
    if (!sonuc.ok) {
      setListe(onceki);
      toast.error("Depo kaydedilemedi");
      return;
    }
    if (yeni) {
      setListe((l) =>
        l.map((x) => (x.id === gecici.id ? { ...x, id: sonuc.id } : x)),
      );
    }
    toast.success(yeni ? "Depo eklendi" : "Depo güncellendi");
  }

  async function sil(id: string) {
    const ad = liste.find((x) => x.id === id)?.ad;
    if (
      !(await onayla({
        title: `"${ad ?? "Depo"}" silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== id));
    const sonuc = await depoSil([id]);
    if (!sonuc.ok) {
      setListe(onceki);
      toast.error(sonuc.error ?? "Depo silinemedi");
      return;
    }
    toast.success("Depo silindi");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Depolar">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            onClick={() => {
              setDuzenlenen(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" /> Yeni Depo
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {kolon.temelGorunur("id") && (
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.id,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, id: v })),
                  }}
                >
                  Kod
                </SiralaFiltreBaslik>
              )}
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{
                  tip: "metin",
                  deger: metinFiltre.ad,
                  onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                }}
              >
                Depo
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("sehir") && (
                <SiralaFiltreBaslik
                  sira={sira("sehir")}
                  onSirala={sirala("sehir")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.sehir,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, sehir: v })),
                  }}
                >
                  Şehir
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("kapasite") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("kapasite")}
                  onSirala={sirala("kapasite")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.kapasite.min,
                    max: sayiFiltre.kapasite.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, kapasite: { min, max } })),
                  }}
                >
                  Kapasite
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("doluluk") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("doluluk")}
                  onSirala={sirala("doluluk")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.doluluk.min,
                    max: sayiFiltre.doluluk.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, doluluk: { min, max } })),
                  }}
                >
                  Doluluk
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Aktif", "Pasif"],
                    deger: durumF,
                    onDeger: setDurumF,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((d) => {
              const yuzde = d.kapasite
                ? Math.round((d.doluluk / d.kapasite) * 100)
                : 0;
              return (
                <SatirMenu
                  key={d.id}
                  aksiyonlar={[
                    {
                      etiket: "Düzenle",
                      ikon: Pencil,
                      onSecim: () => {
                        setDuzenlenen(d);
                        setSheetOpen(true);
                      },
                    },
                    {
                      etiket: "Sil",
                      ikon: Trash2,
                      tehlike: true,
                      ayracOnce: true,
                      onSecim: () => sil(d.id),
                    },
                  ]}
                >
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => {
                      setDuzenlenen(d);
                      setSheetOpen(true);
                    }}
                  >
                    {kolon.temelGorunur("id") && (
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.id}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{d.ad}</TableCell>
                    {kolon.temelGorunur("sehir") && (
                      <TableCell className="text-muted-foreground">
                        {d.sehir}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("kapasite") && (
                      <TableCell className="text-right tabular-nums">
                        {d.kapasite}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("doluluk") && (
                      <TableCell className="text-right tabular-nums">
                        {d.doluluk}{" "}
                        <span className="text-muted-foreground">
                          ({yuzde}%)
                        </span>
                      </TableCell>
                    )}
                    {kolon.temelGorunur("durum") && (
                      <TableCell>
                        <Badge
                          variant={
                            d.durum === "Aktif" ? "default" : "secondary"
                          }
                        >
                          {d.durum}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="İşlemler"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() => {
                              setDuzenlenen(d);
                              setSheetOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => sil(d.id)}
                          >
                            <Trash2 className="mr-2 size-4" /> Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </SatirMenu>
              );
            })}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={1 + kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Depo bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} depo
      </span>

      <DepoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        onSave={kaydet}
      />

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}

function DepoSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Depo | null;
  onSave: (d: Depo) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [sehir, setSehir] = React.useState("");
  const [kapasite, setKapasite] = React.useState("");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">("Aktif");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(item?.ad ?? "");
    setSehir(item?.sehir ?? "");
    setKapasite(item?.kapasite ? String(item.kapasite) : "");
    setDurum(item?.durum ?? "Aktif");
  }, [open, item]);

  function kaydet() {
    if (!ad.trim()) {
      toast.error("Depo adı gerekli");
      return;
    }
    onSave({
      id: item?.id ?? "",
      ad: ad.trim(),
      sehir: sehir.trim(),
      kapasite: Number(kapasite) || 0,
      doluluk: item?.doluluk ?? 0,
      durum,
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Depoyu Düzenle" : "Yeni Depo"}
      icon={BlocksIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Depo Adı"
          icon={BlocksIcon}
          placeholder="Örn. Ana Depo"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <AnimatedField label="Şehir" icon={BlocksIcon}>
          <input
            type="text"
            placeholder="Örn. İstanbul"
            value={sehir}
            onChange={(e) => setSehir(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
        <IconInput
          label="Kapasite (adet)"
          icon={BlocksIcon}
          type="number"
          placeholder="0"
          value={kapasite}
          onChange={(e) => setKapasite(e.target.value)}
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
            <CircleCheckIcon
              ref={durumRef}
              size={15}
              className="text-muted-foreground"
            />
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
      </div>
    </FormSheet>
  );
}
