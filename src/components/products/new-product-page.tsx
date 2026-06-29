"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { BadgeAlertIcon } from "@/components/ui/icons/badge-alert";
import { FrameIcon } from "@/components/ui/icons/frame";
import { BlocksIcon } from "@/components/ui/icons/blocks";
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
  parcalar as TUM_PARCALAR,
  malzemeler as TUM_MALZEMELER,
  markaList,
  renkList,
  kumasList,
  type Kategori,
  type ParcaSatiri,
  type Urun,
  type UrunVaryant,
} from "@/lib/data";
import { modelMalzemeIhtiyaci } from "@/lib/bom";
import { urunKaydet } from "@/lib/db/actions";

const KATEGORILER: Kategori[] = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];

type Form = {
  ad: string;
  id: string;
  kategori: string;
  marka: string;
  barkod: string;
  fiyat: string;
  stok: string;
  minStok: string;
  agirlik: string;
  durum: "Aktif" | "Pasif";
  aciklama: string;
};

const bos: Form = {
  ad: "",
  id: "",
  kategori: "",
  marka: "",
  barkod: "",
  fiyat: "",
  stok: "",
  minStok: "",
  agirlik: "",
  durum: "Aktif",
  aciklama: "",
};

export function NewProductPage({ product }: { product?: Urun } = {}) {
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
        stok: String(product.stok),
        minStok: product.minStok ? String(product.minStok) : "",
        agirlik: product.agirlik ? String(product.agirlik) : "",
        durum: product.durum,
        aciklama: "",
      }
    : bos;
  const [form, setForm] = React.useState<Form>(baslangic);
  const [kategoriler, setKategoriler] = React.useState<string[]>([
    ...KATEGORILER,
  ]);
  const [katOpen, setKatOpen] = React.useState(false);
  const [yeniKat, setYeniKat] = React.useState("");
  const [urunParcalar, setUrunParcalar] = React.useState<ParcaSatiri[]>(
    product?.parcalar ? [...product.parcalar] : [],
  );
  const [gorseller, setGorseller] = React.useState<string[]>(
    product?.gorseller ? [...product.gorseller] : product?.gorsel ? [product.gorsel] : [],
  );
  const [yeniGorsel, setYeniGorsel] = React.useState("");
  const [varyantlar, setVaryantlar] = React.useState<UrunVaryant[]>(
    product?.varyantlar ? [...product.varyantlar] : [],
  );
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Ürün adı gerekli");
      return;
    }
    if (!form.kategori.trim()) {
      toast.error("Kategori gerekli");
      return;
    }
    const u: Urun = {
      id: form.id,
      ad: form.ad.trim(),
      kategori: form.kategori as Kategori,
      fiyat: Number(form.fiyat) || 0,
      stok: Number(form.stok) || 0,
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
    const res = await urunKaydet(u);
    if (!res.ok) {
      toast.error("Ürün kaydedilemedi");
      return;
    }
    toast.success(duzenleme ? "Ürün güncellendi" : "Ürün eklendi");
    router.push("/urunler");
  }

  function kategoriEkle() {
    const v = yeniKat.trim();
    if (!v) {
      toast.error("Kategori adı gerekli");
      return;
    }
    setKategoriler((k) => (k.includes(v) ? k : [...k, v]));
    set("kategori")(v);
    setKatOpen(false);
    toast.success("Kategori eklendi");
  }

  // Parça yönetimi — satır bazlı (her satırda kendi SearchSelect'i)
  function satirEkle() {
    setUrunParcalar((ps) => [...ps, { parcaId: "", miktar: 1 }]);
  }
  function satirParcaSec(i: number, v: string | null) {
    if (!v) return;
    const p = TUM_PARCALAR.find((x) => x.ad === v);
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
  function gorselEkle() {
    const v = yeniGorsel.trim();
    if (!v) return;
    setGorseller((g) => [...g, v]);
    setYeniGorsel("");
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
  function varyantGuncelle(i: number, alan: Partial<UrunVaryant>) {
    setVaryantlar((v) => v.map((x, j) => (j === i ? { ...x, ...alan } : x)));
  }
  function varyantSil(i: number) {
    setVaryantlar((v) => v.filter((_, j) => j !== i));
  }

  // Sadece parça seçilmiş satırları malzeme dökümüne dahil et.
  const seciliParcalar = urunParcalar.filter((p) => p.parcaId && p.miktar > 0);
  const malzemeOzeti = React.useMemo(
    () => modelMalzemeIhtiyaci(seciliParcalar, TUM_PARCALAR, TUM_MALZEMELER),
    [seciliParcalar],
  );
  const toplamMaliyet = malzemeOzeti.reduce((t, m) => t + m.toplamFiyat, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Üst başlık çubuğu */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/urunler" aria-label="Geri" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {duzenleme ? "Ürünü Düzenle" : "Yeni Ürün"}
        </h1>
        {duzenleme && product?.id && (
          <span className="font-mono text-xs text-muted-foreground">
            {product.id}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/urunler" />}>
            İptal
          </Button>
          <Button onClick={kaydet}>Kaydet</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sol: Bilgi kartı */}
        <div className="lg:col-span-2">
          <div className="rounded-md border bg-card">
            <div className="border-b px-4 py-2.5">
              <span className="text-sm font-medium">Ürün Bilgileri</span>
            </div>
            <div className="grid gap-3 p-4">
              <IconInput
                label="Ürün Adı"
                icon={RockingChairIcon}
                placeholder="Örn. Milano Koltuk Takımı"
                value={form.ad}
                onChange={(e) => set("ad")(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <IconInput
                  label="Kod"
                  icon={ScanTextIcon}
                  placeholder="URN-0000"
                  value={form.id}
                  onChange={(e) => set("id")(e.target.value)}
                />
                <IconInput
                  label="Barkod"
                  icon={ScanTextIcon}
                  placeholder="8690000000000"
                  value={form.barkod}
                  onChange={(e) => set("barkod")(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AnimatedField label="Kategori" icon={FolderOpenIcon}>
                  <SearchSelect
                    items={kategoriler}
                    value={form.kategori || null}
                    onValueChange={(v) => set("kategori")(v ?? "")}
                    placeholder="Kategori seç"
                    searchPlaceholder="Kategori ara..."
                    addLabel="Yeni kategori ekle"
                    onAdd={() => {
                      setYeniKat("");
                      setKatOpen(true);
                    }}
                  />
                </AnimatedField>
                <AnimatedField label="Marka" icon={BadgePercentIcon}>
                  <SearchSelect
                    items={markaList}
                    value={form.marka || null}
                    onValueChange={(v) => set("marka")(v ?? "")}
                    placeholder="Marka seç"
                    searchPlaceholder="Marka ara..."
                  />
                </AnimatedField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <IconInput
                  label="Fiyat (₺)"
                  type="number"
                  icon={TurkishLiraIcon}
                  placeholder="0"
                  value={form.fiyat}
                  onChange={(e) => set("fiyat")(e.target.value)}
                />
                <IconInput
                  label="Stok"
                  type="number"
                  icon={BoxesIcon}
                  placeholder="0"
                  value={form.stok}
                  onChange={(e) => set("stok")(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <IconInput
                  label="Ağırlık (kg)"
                  type="number"
                  icon={BoxesIcon}
                  placeholder="0"
                  value={form.agirlik}
                  onChange={(e) => set("agirlik")(e.target.value)}
                />
                <IconInput
                  label="Min Stok"
                  type="number"
                  icon={BadgeAlertIcon}
                  placeholder="0"
                  value={form.minStok}
                  onChange={(e) => set("minStok")(e.target.value)}
                />
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
                  <span className="text-xs text-muted-foreground">
                    {form.durum}
                  </span>
                  <Switch
                    checked={form.durum === "Aktif"}
                    className="pointer-events-none data-checked:bg-emerald-600"
                  />
                </span>
              </div>
              <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
                <textarea
                  rows={2}
                  placeholder="Kısa açıklama..."
                  value={form.aciklama}
                  onChange={(e) => set("aciklama")(e.target.value)}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                />
              </AnimatedField>
            </div>
          </div>
        </div>

        {/* Sağ: Görseller + Varyantlar + Parçalar */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Görseller kartı */}
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <FrameIcon size={15} className="text-muted-foreground" />
                Görseller
              </span>
              <span className="text-xs text-muted-foreground">
                {gorseller.length} görsel
              </span>
            </div>
            <div className="grid gap-2 p-4">
              {gorseller.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
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
              <div className="flex gap-2">
                <Input
                  placeholder="Görsel URL'si"
                  value={yeniGorsel}
                  onChange={(e) => setYeniGorsel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      gorselEkle();
                    }
                  }}
                  className="h-8 flex-1 text-xs"
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
            </div>
          </div>

          {/* Varyantlar kartı (renk × kumaş kombinasyonları) */}
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <BlocksIcon size={15} className="text-muted-foreground" />
                Varyantlar
              </span>
              <span className="text-xs text-muted-foreground">
                {varyantlar.length} varyant
              </span>
            </div>
            <div className="grid gap-3 p-4">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Renk</TableHead>
                      <TableHead>Kumaş</TableHead>
                      <TableHead className="w-20 text-right">+₺</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varyantlar.map((v, i) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <SearchSelect
                            items={renkList}
                            value={v.renk || null}
                            onValueChange={(val) =>
                              varyantGuncelle(i, { renk: val ?? "" })
                            }
                            placeholder="Renk"
                          />
                        </TableCell>
                        <TableCell>
                          <SearchSelect
                            items={kumasList}
                            value={v.kumas || null}
                            onValueChange={(val) =>
                              varyantGuncelle(i, { kumas: val ?? "" })
                            }
                            placeholder="Kumaş"
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
                            className="h-7 w-16 text-right tabular-nums"
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
              <button
                type="button"
                onClick={varyantSatirEkle}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
              >
                <Plus className="size-3.5" /> Varyant ekle
              </button>
            </div>
          </div>

          {/* Parçalar kartı (mevcut) */}
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-medium">Parçalar</span>
              <span className="text-xs text-muted-foreground">
                {seciliParcalar.length} parça
              </span>
            </div>
            <div className="grid gap-3 p-4">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Parça</TableHead>
                      <TableHead className="w-20 text-right">Adet</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urunParcalar.map((s, i) => {
                      const secili = TUM_PARCALAR.find(
                        (x) => x.id === s.parcaId,
                      );
                      // Bu satırda seçilebilir parçalar — diğer satırlardakiler hariç
                      const seciliBaskaIds = new Set(
                        urunParcalar
                          .filter((_, j) => j !== i)
                          .map((x) => x.parcaId)
                          .filter(Boolean),
                      );
                      const items = TUM_PARCALAR.filter(
                        (p) => p.durum === "Aktif" && !seciliBaskaIds.has(p.id),
                      ).map((p) => p.ad);
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <SearchSelect
                              items={items}
                              value={secili?.ad ?? null}
                              onValueChange={(v) => satirParcaSec(i, v)}
                              placeholder="Parça seç"
                              searchPlaceholder="Parça ara..."
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={s.miktar}
                              onChange={(e) =>
                                parcaMiktar(i, e.target.value)
                              }
                              className="h-7 w-16 text-right tabular-nums"
                            />
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
              <button
                type="button"
                onClick={satirEkle}
                disabled={
                  urunParcalar.filter((p) => p.parcaId).length >=
                  TUM_PARCALAR.filter((p) => p.durum === "Aktif").length
                }
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-3.5" /> Parça ekle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Otomatik malzeme dökümü — parçalar varsa */}
      {seciliParcalar.length > 0 && (
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              Toplam Malzeme İhtiyacı
              <Badge variant="secondary" className="text-[10px]">
                <Plus className="mr-1 size-2.5" /> Otomatik hesaplandı
              </Badge>
            </span>
            <span className="text-sm font-semibold tabular-nums">
              ₺
              {toplamMaliyet.toLocaleString("tr-TR", {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Malzeme</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Birim</TableHead>
                <TableHead className="text-right">Mevcut Stok</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {malzemeOzeti.map((m) => (
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
                    {m.malzeme.stok}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₺
                    {m.toplamFiyat.toLocaleString("tr-TR", {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Yeni kategori tanımlama modalı */}
      <Dialog open={katOpen} onOpenChange={setKatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Kategori</DialogTitle>
          </DialogHeader>
          <IconInput
            label="Kategori Adı"
            icon={FolderOpenIcon}
            placeholder="Örn. Bahçe Mobilyası"
            value={yeniKat}
            autoFocus
            onChange={(e) => setYeniKat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                kategoriEkle();
              }
            }}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">İptal</Button>} />
            <Button onClick={kategoriEkle}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
