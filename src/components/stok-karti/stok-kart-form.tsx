"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Factory,
  Users,
  FileImage,
  FileText,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FormSheet } from "@/components/ui/form-sheet";
import { TabIcerik } from "@/components/ui/tab-icerik";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { GrupSecici } from "@/components/ui/grup-secici";
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
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { UsersIcon } from "@/components/ui/icons/users";
import { TruckIcon } from "@/components/ui/icons/truck";
import { LayersIcon } from "@/components/ui/icons/layers";
import {
  formatTL,
  type Doviz,
  type StokDokuman,
  type StokDokumanTipi,
  type StokGrup,
  type StokGrubu,
  type StokKarti,
  type StokMusteri,
  type StokUretici,
} from "@/lib/data";
import {
  stokKaydet,
  stokUreticiKaydet,
  stokUreticiSil,
  stokMusteriKaydet,
  stokMusteriSil,
  stokDokumanKaydet,
  stokDokumanSil,
} from "@/lib/db/actions";

/**
 * Stok kartının alt kayıtları — queries.getStok(id).detay ile aynı şekil.
 * (queries.ts "server-only" olduğundan tip burada yerel tanımlı.)
 */
export type StokDetay = {
  ureticiler: StokUretici[];
  musteriler: StokMusteri[];
  dokumanlar: StokDokuman[];
};

const GRUPLAR: StokGrubu[] = ["Hammadde", "Yarı Mamül", "Mamül", "Hizmet"];
const DOVIZLER: Doviz[] = ["TL", "USD", "EUR"];
const DOKUMAN_TIPLERI: StokDokumanTipi[] = [
  "Ürün Resmi",
  "Teknik Resim",
  "PDF",
  "Kalite Belgesi",
  "Video",
  "Diğer",
];

const GRUP_RENK: Record<StokGrubu, string> = {
  Hammadde: "bg-blue-100 text-blue-800",
  "Yarı Mamül": "bg-violet-100 text-violet-800",
  Mamül: "bg-emerald-100 text-emerald-800",
  Hizmet: "bg-slate-100 text-slate-800",
};

/** Ledger miktarına göre stok durumu rozeti (Hizmet'te yok). */
function stokDurumu(
  kart: StokKarti,
): { etiket: string; renk: string } | null {
  if (kart.grup === "Hizmet") return null;
  if (kart.miktar <= 0)
    return { etiket: "Tükendi", renk: "bg-rose-100 text-rose-700" };
  if (kart.minStok != null && kart.miktar <= kart.minStok)
    return { etiket: "Kritik Stok", renk: "bg-amber-100 text-amber-700" };
  if (kart.maxStok != null && kart.miktar >= kart.maxStok)
    return { etiket: "Fazla Stok", renk: "bg-sky-100 text-sky-700" };
  return { etiket: "Normal", renk: "bg-emerald-100 text-emerald-700" };
}

const DOKUMAN_TIP_RENK: Record<StokDokumanTipi, string> = {
  "Ürün Resmi": "bg-emerald-100 text-emerald-800",
  "Teknik Resim": "bg-violet-100 text-violet-800",
  PDF: "bg-rose-100 text-rose-800",
  "Kalite Belgesi": "bg-amber-100 text-amber-800",
  Video: "bg-blue-100 text-blue-800",
  Diğer: "bg-slate-100 text-slate-800",
};

// Varsayılan prop'lar MODÜL sabiti olmalı: inline `= []` / `?? []` her
// render'da yeni referans üretir ve [prop] bağımlı useEffect'leri sonsuz
// döngüye sokar.
const BOS_DETAY: StokDetay = { ureticiler: [], musteriler: [], dokumanlar: [] };
const BOS_GRUPLAR: StokGrup[] = [];
const BOS_MARKALAR: string[] = [];
const BOS_BIRIMLER: string[] = [];
const BOS_PARCALAR: { id: string; ad: string }[] = [];
const BOS_CARILER: { id: string; ad: string }[] = [];
/** Tanımlarda birim yoksa kullanılan varsayılan birim listesi. */
const VARSAYILAN_BIRIMLER = ["adet", "m", "m²", "m³", "kg", "lt", "takım"];

type Form = {
  id: string;
  kod: string;
  ad: string;
  tur: string;
  cins: string;
  grup: StokGrubu;
  altGrup: string;
  detayGrup: string;
  kategori: string;
  marka: string;
  model: string;
  stokBirimi: string;
  puan: string;
  yukseklik: string;
  genislik: string;
  boy: string;
  agirlik: string;
  minSiparis: string;
  minStok: string;
  maxStok: string;
  muhasebeKodu: string;
  receteParcaId: string;
  ureticiCariId: string;
  ureticiKodu: string;
  bolum: string;
  renkKodu: string;
  barkod: string;
  aciklama: string;
  durum: "Aktif" | "Pasif";
  maliyetFiyati: string;
  maliyetBirimi: Doviz;
  satisFiyat1: string;
  satisBirim1: Doviz;
  satisFiyat2: string;
  satisBirim2: Doviz;
  satisFiyat3: string;
  satisBirim3: Doviz;
  satisFiyat4: string;
  satisBirim4: Doviz;
  satisFiyat5: string;
  satisBirim5: Doviz;
};

const bos: Form = {
  id: "",
  kod: "",
  ad: "",
  tur: "",
  cins: "",
  grup: "Hammadde",
  altGrup: "",
  detayGrup: "",
  kategori: "",
  marka: "",
  model: "",
  stokBirimi: "adet",
  puan: "",
  yukseklik: "",
  genislik: "",
  boy: "",
  agirlik: "",
  minSiparis: "",
  minStok: "",
  maxStok: "",
  muhasebeKodu: "",
  receteParcaId: "",
  ureticiCariId: "",
  ureticiKodu: "",
  bolum: "",
  renkKodu: "",
  barkod: "",
  aciklama: "",
  durum: "Aktif",
  maliyetFiyati: "",
  maliyetBirimi: "TL",
  satisFiyat1: "",
  satisBirim1: "TL",
  satisFiyat2: "",
  satisBirim2: "TL",
  satisFiyat3: "",
  satisBirim3: "TL",
  satisFiyat4: "",
  satisBirim4: "TL",
  satisFiyat5: "",
  satisBirim5: "TL",
};

/** Sayı gösterimi: 0 iken boş bırak (kayıtta forma çevirirken). */
function s(n: number | undefined): string {
  return n != null && n !== 0 ? String(n) : "";
}

type Tab = "genel" | "fiyat" | "uretici" | "musteriler" | "dokumanlar";

export function StokKartForm({
  kart,
  detay = BOS_DETAY,
  sonrakiKod = "",
  gruplar = BOS_GRUPLAR,
  markalar = BOS_MARKALAR,
  birimler = BOS_BIRIMLER,
  parcalar = BOS_PARCALAR,
  tedarikciler = BOS_CARILER,
  musteriCariler = BOS_CARILER,
}: {
  kart?: StokKarti;
  detay?: StokDetay;
  /** Yeni kart için sunucuda hesaplanan sıradaki kod (önizleme). */
  sonrakiKod?: string;
  /** Tanımlamalar → Gruplar ağacı (Alt Grup / Detay Grup seçimi). */
  gruplar?: StokGrup[];
  /** Tanımlamalar → Markalar. */
  markalar?: string[];
  /** Tanımlamalar → Birimler (boşsa varsayılan liste). */
  birimler?: string[];
  /** Reçete havuzu (Parçalar). */
  parcalar?: { id: string; ad: string }[];
  /** Tedarikçi tipli cariler (Üretici seçimi). */
  tedarikciler?: { id: string; ad: string }[];
  /** Müşteri tipli cariler (Müşteriler sekmesi). */
  musteriCariler?: { id: string; ad: string }[];
} = {}) {
  const router = useRouter();
  const duzenleme = !!kart;
  const baslangic: Form = kart
    ? {
        id: kart.id,
        kod: kart.kod ?? "",
        ad: kart.ad,
        tur: kart.tur ?? "",
        cins: kart.cins ?? "",
        grup: kart.grup,
        altGrup: kart.altGrup ?? "",
        detayGrup: kart.detayGrup ?? "",
        kategori: kart.kategori ?? "",
        marka: kart.marka ?? "",
        model: kart.model ?? "",
        stokBirimi: kart.stokBirimi,
        puan: s(kart.puan),
        yukseklik: s(kart.yukseklik),
        genislik: s(kart.genislik),
        boy: s(kart.boy),
        agirlik: s(kart.agirlik),
        minSiparis: s(kart.minSiparis),
        minStok: s(kart.minStok),
        maxStok: s(kart.maxStok),
        muhasebeKodu: kart.muhasebeKodu ?? "",
        receteParcaId: kart.receteParcaId ?? "",
        ureticiCariId: kart.ureticiCariId ?? "",
        ureticiKodu: kart.ureticiKodu ?? "",
        bolum: kart.bolum ?? "",
        renkKodu: kart.renkKodu ?? "",
        barkod: kart.barkod ?? "",
        aciklama: kart.aciklama ?? "",
        durum: kart.durum,
        maliyetFiyati: s(kart.maliyetFiyati),
        maliyetBirimi: kart.maliyetBirimi,
        satisFiyat1: s(kart.satisFiyat1),
        satisBirim1: kart.satisBirim1,
        satisFiyat2: s(kart.satisFiyat2),
        satisBirim2: kart.satisBirim2,
        satisFiyat3: s(kart.satisFiyat3),
        satisBirim3: kart.satisBirim3,
        satisFiyat4: s(kart.satisFiyat4),
        satisBirim4: kart.satisBirim4,
        satisFiyat5: s(kart.satisFiyat5),
        satisBirim5: kart.satisBirim5,
      }
    : { ...bos, id: sonrakiKod };
  const [form, setForm] = React.useState<Form>(baslangic);
  const [tab, setTab] = React.useState<Tab>("genel");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Ad gerekli");
      setTab("genel");
      return;
    }
    if (!form.grup) {
      toast.error("Grup gerekli");
      setTab("genel");
      return;
    }
    const t = (v: string) => v.trim() || undefined;
    const num = (v: string) => (v.trim() ? Number(v) : undefined);
    const fiyat = (v: string) => (v.trim() ? Number(v) : 0);
    const yeniKart: Omit<StokKarti, "miktar"> = {
      id: form.id,
      kod: t(form.kod),
      ad: form.ad.trim(),
      tur: t(form.tur),
      cins: t(form.cins),
      grup: form.grup,
      altGrup: t(form.altGrup),
      detayGrup: t(form.detayGrup),
      kategori: t(form.kategori),
      marka: t(form.marka),
      model: t(form.model),
      stokBirimi: form.stokBirimi.trim() || "adet",
      puan: num(form.puan),
      yukseklik: num(form.yukseklik),
      genislik: num(form.genislik),
      boy: num(form.boy),
      agirlik: num(form.agirlik),
      minSiparis: num(form.minSiparis),
      minStok: num(form.minStok),
      maxStok: num(form.maxStok),
      muhasebeKodu: t(form.muhasebeKodu),
      receteParcaId: t(form.receteParcaId),
      rota: "Standart Fabrika Rotası",
      ureticiCariId: t(form.ureticiCariId),
      ureticiKodu: t(form.ureticiKodu),
      bolum: t(form.bolum),
      renkKodu: t(form.renkKodu),
      barkod: t(form.barkod),
      aciklama: t(form.aciklama),
      durum: form.durum,
      maliyetFiyati: fiyat(form.maliyetFiyati),
      maliyetBirimi: form.maliyetBirimi,
      satisFiyat1: fiyat(form.satisFiyat1),
      satisBirim1: form.satisBirim1,
      satisFiyat2: fiyat(form.satisFiyat2),
      satisBirim2: form.satisBirim2,
      satisFiyat3: fiyat(form.satisFiyat3),
      satisBirim3: form.satisBirim3,
      satisFiyat4: fiyat(form.satisFiyat4),
      satisBirim4: form.satisBirim4,
      satisFiyat5: fiyat(form.satisFiyat5),
      satisBirim5: form.satisBirim5,
    };
    const res = await stokKaydet(yeniKart, !duzenleme);
    if (!res.ok) {
      toast.error(res.error ?? "Stok kartı kaydedilemedi");
      return;
    }
    if (!duzenleme) {
      toast.success(`Stok kartı eklendi (${res.id})`);
      router.push(`/stok-karti/${res.id}`);
      return;
    }
    toast.success("Stok kartı güncellendi");
    router.push("/stok-karti");
  }

  return (
    <div className="flex flex-col gap-4">
      {!duzenleme && <h1 className="text-xl font-semibold">Yeni Stok Kartı</h1>}

      {/* Kart başlığı — sadece düzenlemede */}
      {duzenleme && kart && <StokKartiSerit kart={kart} />}

      {/* Sekmeler — alt kayıt sekmeleri yalnız düzenlemede (id ister) */}
      <div className="flex flex-wrap gap-1 border-b">
        <TabBtn aktif={tab === "genel"} onClick={() => setTab("genel")}>
          Genel
        </TabBtn>
        <TabBtn aktif={tab === "fiyat"} onClick={() => setTab("fiyat")}>
          Fiyat
        </TabBtn>
        {duzenleme && (
          <>
            <TabBtn aktif={tab === "uretici"} onClick={() => setTab("uretici")}>
              Üretici
            </TabBtn>
            <TabBtn
              aktif={tab === "musteriler"}
              onClick={() => setTab("musteriler")}
            >
              Müşteriler
            </TabBtn>
            <TabBtn
              aktif={tab === "dokumanlar"}
              onClick={() => setTab("dokumanlar")}
            >
              Dokümanlar
            </TabBtn>
          </>
        )}
      </div>

      <TabIcerik tabKey={tab}>
        {(tab === "genel" || tab === "fiyat") && (
          <>
            {tab === "genel" && (
              <GenelTab
                form={form}
                setForm={setForm}
                set={set}
                durumRef={durumRef}
                gruplar={gruplar}
                markalar={markalar}
                birimler={birimler}
                parcalar={parcalar}
                tedarikciler={tedarikciler}
              />
            )}
            {tab === "fiyat" && <FiyatTab form={form} setForm={setForm} set={set} />}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/stok-karti" />}
              >
                İptal
              </Button>
              <Button onClick={kaydet}>Kaydet</Button>
            </div>
          </>
        )}

        {duzenleme && kart && tab === "uretici" && (
          <UreticiTab
            stokId={kart.id}
            kayitlar={detay.ureticiler}
            tedarikciler={tedarikciler}
          />
        )}
        {duzenleme && kart && tab === "musteriler" && (
          <MusterilerTab
            stokId={kart.id}
            kayitlar={detay.musteriler}
            musteriCariler={musteriCariler}
          />
        )}
        {duzenleme && kart && tab === "dokumanlar" && (
          <DokumanlarTab stokId={kart.id} kayitlar={detay.dokumanlar} />
        )}
      </TabIcerik>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer border-b-2 px-4 py-2 text-sm transition-colors",
        aktif
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
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
 * Kart başlığı şeridi — hangi stok kartıyla çalıştığımızı gösterir.
 * Kimlik + orta mini-metrikler + sağda miktar/durum.
 */
function StokKartiSerit({ kart }: { kart: StokKarti }) {
  const durum = stokDurumu(kart);
  const paraGoster = (n: number, doviz: string) =>
    doviz === "TL" ? formatTL(n) : `${n.toLocaleString("tr-TR")} ${doviz}`;

  // Sadece dolu metrikleri göster.
  const metrikler: { etiket: string; deger: React.ReactNode }[] = [];
  if (kart.maliyetFiyati > 0)
    metrikler.push({
      etiket: "Maliyet",
      deger: paraGoster(kart.maliyetFiyati, kart.maliyetBirimi),
    });
  if (kart.satisFiyat1 > 0)
    metrikler.push({
      etiket: "Satış Fiyatı",
      deger: paraGoster(kart.satisFiyat1, kart.satisBirim1),
    });
  if (kart.kategori)
    metrikler.push({ etiket: "Kategori", deger: kart.kategori });
  if (kart.muhasebeKodu)
    metrikler.push({ etiket: "Muhasebe Kodu", deger: kart.muhasebeKodu });

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        {/* Kimlik: ad + kod + rozetler */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <h2 className="truncate text-lg leading-tight font-semibold">
              {kart.ad}
            </h2>
            <span aria-hidden className="h-4 w-px bg-border" />
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
              {kart.kod || kart.id}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={GRUP_RENK[kart.grup]}>
              {kart.grup}
            </Badge>
            {kart.altGrup && (
              <Badge variant="outline" className="font-normal">
                {kart.altGrup}
              </Badge>
            )}
            {kart.marka && (
              <Badge variant="outline" className="font-normal">
                {kart.marka}
              </Badge>
            )}
            {kart.durum === "Pasif" && (
              <Badge variant="secondary" className="bg-muted">
                Pasif
              </Badge>
            )}
          </div>
        </div>

        {/* Orta: mini metrikler */}
        {metrikler.length > 0 && (
          <div className="flex shrink-0 items-center gap-5 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            {metrikler.map((m) => (
              <SeritMetrik key={m.etiket} etiket={m.etiket} deger={m.deger} />
            ))}
          </div>
        )}

        {/* Sağ: mevcut miktar + durum */}
        <div className="shrink-0 border-t pt-3 text-left lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 lg:text-right">
          {kart.grup === "Hizmet" ? (
            <>
              <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Kalem Tipi
              </div>
              <div className="mt-0.5 text-2xl font-semibold">Hizmet</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Stok takibi yapılmaz
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Mevcut Miktar
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5 lg:justify-end">
                <span
                  className={cn(
                    "text-3xl leading-none font-semibold tabular-nums",
                    kart.miktar <= 0 && "text-rose-600",
                  )}
                >
                  {kart.miktar.toLocaleString("tr-TR")}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {kart.stokBirimi}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 lg:justify-end">
                {durum && (
                  <Badge variant="secondary" className={durum.renk}>
                    {durum.etiket}
                  </Badge>
                )}
                {(kart.minStok != null || kart.maxStok != null) && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {kart.minStok != null && `Min ${kart.minStok}`}
                    {kart.minStok != null && kart.maxStok != null && " · "}
                    {kart.maxStok != null && `Max ${kart.maxStok}`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GENEL SEKMESİ                                                      */
/* ------------------------------------------------------------------ */
const textareaCls =
  "w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

function GenelTab({
  form,
  setForm,
  set,
  durumRef,
  gruplar,
  markalar,
  birimler,
  parcalar,
  tedarikciler,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  set: (k: keyof Form) => (v: string) => void;
  durumRef: React.RefObject<AnimatedIconHandle | null>;
  gruplar: StokGrup[];
  markalar: string[];
  birimler: string[];
  parcalar: { id: string; ad: string }[];
  tedarikciler: { id: string; ad: string }[];
}) {
  const birimSecenekleri =
    birimler.length > 0 ? birimler : VARSAYILAN_BIRIMLER;

  const receteAd =
    parcalar.find((p) => p.id === form.receteParcaId)?.ad ?? null;
  const ureticiAd =
    tedarikciler.find((c) => c.id === form.ureticiCariId)?.ad ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Sol: Genel + Sınıflama + Üretim kartları */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* ── Genel ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Genel</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Ad"
                icon={LayersIcon}
                placeholder="Örn. Ceviz Yemek Masası"
                value={form.ad}
                onChange={(e) => set("ad")(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <IconInput
                  label="Kod"
                  icon={ScanTextIcon}
                  value={form.id}
                  readOnly
                  className="text-muted-foreground"
                />
                <IconInput
                  label="Kullanıcı Kodu"
                  icon={ScanTextIcon}
                  placeholder="Serbest kod"
                  value={form.kod}
                  onChange={(e) => set("kod")(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Tür"
                icon={FolderOpenIcon}
                placeholder="Örn. Mobilya"
                value={form.tur}
                onChange={(e) => set("tur")(e.target.value)}
              />
              <IconInput
                label="Cins"
                icon={FolderOpenIcon}
                placeholder="Örn. Masa"
                value={form.cins}
                onChange={(e) => set("cins")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <AnimatedField label="Grup" icon={FolderOpenIcon}>
                <SearchSelect
                  items={GRUPLAR}
                  value={form.grup}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      grup: (v as StokGrubu) ?? "Hammadde",
                    }))
                  }
                  placeholder="Grup seç"
                />
              </AnimatedField>
              <AnimatedField label="Stok Birimi" icon={BlocksIcon}>
                <SearchSelect
                  items={birimSecenekleri}
                  value={form.stokBirimi || null}
                  onValueChange={(v) => set("stokBirimi")(v ?? "")}
                  placeholder="Birim seç"
                />
              </AnimatedField>
              <IconInput
                label="Barkod"
                icon={ScanTextIcon}
                placeholder="Barkod numarası"
                value={form.barkod}
                onChange={(e) => set("barkod")(e.target.value)}
              />
            </div>
            <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
              <textarea
                rows={2}
                placeholder="Stok kartı ile ilgili notlar..."
                value={form.aciklama}
                onChange={(e) => set("aciklama")(e.target.value)}
                className={textareaCls}
              />
            </AnimatedField>
          </div>
        </div>

        {/* ── Sınıflama ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Sınıflama</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <AnimatedField label="Alt Grup" icon={FolderOpenIcon}>
                <GrupSecici
                  gruplar={gruplar}
                  value={form.altGrup || null}
                  onValueChange={(v) => set("altGrup")(v ?? "")}
                  placeholder="Alt grup seç"
                />
              </AnimatedField>
              <AnimatedField label="Detay Grup" icon={FolderOpenIcon}>
                <GrupSecici
                  gruplar={gruplar}
                  value={form.detayGrup || null}
                  onValueChange={(v) => set("detayGrup")(v ?? "")}
                  placeholder="Detay grup seç"
                />
              </AnimatedField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <IconInput
                label="Kategori"
                icon={FolderOpenIcon}
                placeholder="Örn. Yemek Odası"
                value={form.kategori}
                onChange={(e) => set("kategori")(e.target.value)}
              />
              <AnimatedField label="Marka" icon={BadgePercentIcon}>
                <SearchSelect
                  items={markalar}
                  value={form.marka || null}
                  onValueChange={(v) => set("marka")(v ?? "")}
                  placeholder="Marka seç"
                />
              </AnimatedField>
              <IconInput
                label="Model"
                icon={ScanTextIcon}
                placeholder="Örn. 2026 Serisi"
                value={form.model}
                onChange={(e) => set("model")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Bölüm"
                icon={BlocksIcon}
                placeholder="Örn. Döşeme"
                value={form.bolum}
                onChange={(e) => set("bolum")(e.target.value)}
              />
              <IconInput
                label="Renk Kodu"
                icon={ScanTextIcon}
                placeholder="Örn. RAL 9010"
                value={form.renkKodu}
                onChange={(e) => set("renkKodu")(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Üretim ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Üretim</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-0.5">
                <AnimatedField label="Reçete" icon={LayersIcon}>
                  {parcalar.length > 0 ? (
                    <SearchSelect
                      items={parcalar.map((p) => p.ad)}
                      value={receteAd}
                      onValueChange={(v) =>
                        set("receteParcaId")(
                          parcalar.find((p) => p.ad === v)?.id ?? "",
                        )
                      }
                      placeholder="Reçete seç"
                    />
                  ) : (
                    <Input
                      readOnly
                      value=""
                      placeholder="Reçete yok — Reçete Oluşturma'dan ekleyin"
                      className="text-muted-foreground"
                    />
                  )}
                </AnimatedField>
                <p className="text-[11px] text-muted-foreground">
                  Reçete, Parçalar havuzundan seçilir.
                </p>
              </div>
              <div className="grid gap-0.5">
                <IconInput
                  label="Rota"
                  icon={TruckIcon}
                  value="Standart Fabrika Rotası"
                  readOnly
                  className="text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Rota tanımları ileride; şimdilik tüm üretim fabrika rotasını
                  izler.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AnimatedField label="Varsayılan Üretici" icon={UsersIcon}>
                <SearchSelect
                  items={tedarikciler.map((c) => c.ad)}
                  value={ureticiAd}
                  onValueChange={(v) =>
                    set("ureticiCariId")(
                      tedarikciler.find((c) => c.ad === v)?.id ?? "",
                    )
                  }
                  placeholder="Tedarikçi seç"
                />
              </AnimatedField>
              <IconInput
                label="Üretici Kodu"
                icon={ScanTextIcon}
                placeholder="Üreticideki stok kodu"
                value={form.ureticiKodu}
                onChange={(e) => set("ureticiKodu")(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sağ: Ölçüler + Stok Limitleri + Muhasebe + Durum */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Ölçüler</span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <IconInput
              label="Puan"
              icon={ScanTextIcon}
              type="number"
              placeholder="0"
              value={form.puan}
              onChange={(e) => set("puan")(e.target.value)}
            />
            <IconInput
              label="Yükseklik (cm)"
              icon={ScanTextIcon}
              type="number"
              placeholder="0"
              value={form.yukseklik}
              onChange={(e) => set("yukseklik")(e.target.value)}
            />
            <IconInput
              label="Genişlik (cm)"
              icon={ScanTextIcon}
              type="number"
              placeholder="0"
              value={form.genislik}
              onChange={(e) => set("genislik")(e.target.value)}
            />
            <IconInput
              label="Boy (cm)"
              icon={ScanTextIcon}
              type="number"
              placeholder="0"
              value={form.boy}
              onChange={(e) => set("boy")(e.target.value)}
            />
            <IconInput
              label="Ağırlık (kg)"
              icon={ScanTextIcon}
              type="number"
              placeholder="0"
              value={form.agirlik}
              onChange={(e) => set("agirlik")(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Stok Limitleri</span>
          </div>
          <div className="grid gap-3 p-4">
            <IconInput
              label="Min Sipariş"
              icon={BlocksIcon}
              type="number"
              placeholder="0"
              value={form.minSiparis}
              onChange={(e) => set("minSiparis")(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Min Stok"
                icon={BlocksIcon}
                type="number"
                placeholder="0"
                value={form.minStok}
                onChange={(e) => set("minStok")(e.target.value)}
              />
              <IconInput
                label="Max Stok"
                icon={BlocksIcon}
                type="number"
                placeholder="0"
                value={form.maxStok}
                onChange={(e) => set("maxStok")(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Muhasebe</span>
          </div>
          <div className="grid gap-3 p-4">
            <IconInput
              label="Muhasebe Kodu"
              icon={ScanTextIcon}
              placeholder="Örn. 150.01.001"
              value={form.muhasebeKodu}
              onChange={(e) => set("muhasebeKodu")(e.target.value)}
            />
          </div>
        </div>

        {/* ── Durum ── */}
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
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
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
            <span className="text-xs text-muted-foreground">{form.durum}</span>
            <Switch
              checked={form.durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FİYAT SEKMESİ                                                      */
/* ------------------------------------------------------------------ */
function FiyatTab({
  form,
  setForm,
  set,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  set: (k: keyof Form) => (v: string) => void;
}) {
  const satirlar: {
    etiket: string;
    fiyatKey: keyof Form;
    dovizKey: keyof Form;
  }[] = [
    { etiket: "Maliyet Fiyatı", fiyatKey: "maliyetFiyati", dovizKey: "maliyetBirimi" },
    { etiket: "Satış Fiyatı 1", fiyatKey: "satisFiyat1", dovizKey: "satisBirim1" },
    { etiket: "Satış Fiyatı 2", fiyatKey: "satisFiyat2", dovizKey: "satisBirim2" },
    { etiket: "Satış Fiyatı 3", fiyatKey: "satisFiyat3", dovizKey: "satisBirim3" },
    { etiket: "Satış Fiyatı 4", fiyatKey: "satisFiyat4", dovizKey: "satisBirim4" },
    { etiket: "Satış Fiyatı 5", fiyatKey: "satisFiyat5", dovizKey: "satisBirim5" },
  ];

  return (
    <div className="rounded-md border bg-card lg:max-w-xl">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">Fiyatlar</span>
        <span className="text-xs text-muted-foreground">
          Tutar + döviz — boş bırakılan fiyat 0 kabul edilir
        </span>
      </div>
      <div className="grid gap-2.5 p-4">
        {satirlar.map(({ etiket, fiyatKey, dovizKey }) => (
          <div
            key={fiyatKey}
            className="grid grid-cols-[8.5rem_1fr_6rem] items-center gap-3"
          >
            <span className="text-sm text-muted-foreground">{etiket}</span>
            <Input
              type="number"
              min={0}
              placeholder="0,00"
              value={form[fiyatKey]}
              onChange={(e) => set(fiyatKey)(e.target.value)}
              className="text-right tabular-nums"
            />
            <SearchSelect
              items={DOVIZLER}
              value={form[dovizKey]}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, [dovizKey]: (v as Doviz) ?? "TL" }))
              }
              placeholder="TL"
              className="w-24"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ALT KAYIT ORTAK PARÇALARI                                          */
/* ------------------------------------------------------------------ */

/** Alt kayıt listesi kabuğu — başlık + adet + ekle butonu, altında içerik. */
function AltListeKart({
  baslik,
  adet,
  adetEtiket,
  ekleEtiket,
  onEkle,
  ikon,
  children,
}: {
  baslik: string;
  adet: number;
  adetEtiket: string;
  ekleEtiket: string;
  onEkle: () => void;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {ikon}
          <span className="text-sm font-medium">{baslik}</span>
          <span className="text-xs text-muted-foreground">
            · {adet} {adetEtiket}
          </span>
        </div>
        <Button size="sm" onClick={onEkle}>
          <Plus className="size-4" /> {ekleEtiket}
        </Button>
      </div>
      {children}
    </div>
  );
}

/** Satır sonu işlem menüsü — Düzenle / Sil. */
function SatirMenu({
  onDuzenle,
  onSil,
}: {
  onDuzenle: () => void;
  onSil: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onDuzenle}>
          <Pencil className="mr-2 size-4" /> Düzenle
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onSil}>
          <Trash2 className="mr-2 size-4" /> Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Optimistic ekleme için geçici (negatif) id üretir. */
function geciciId(): number {
  return -Math.floor(Math.random() * 1_000_000_000) - 1;
}

/** Fiyatı dövizine göre yazar. */
function fiyatYaz(n: number, doviz: Doviz): string {
  if (doviz === "TL") return formatTL(n);
  return `${n.toLocaleString("tr-TR")} ${doviz}`;
}

/* ------------------------------------------------------------------ */
/* ÜRETİCİ SEKMESİ                                                    */
/* ------------------------------------------------------------------ */
function UreticiTab({
  stokId,
  kayitlar,
  tedarikciler,
}: {
  stokId: string;
  kayitlar: StokUretici[];
  tedarikciler: { id: string; ad: string }[];
}) {
  const [liste, setListe] = React.useState<StokUretici[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<StokUretici | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(u: StokUretici) {
    setDuzenlenen(u);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<StokUretici, "id" | "stokId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await stokUreticiKaydet({ ...f, id: duzenlenen.id, stokId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Üretici kaydedilemedi");
        return;
      }
      toast.success("Üretici güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, stokId }]);
    const res = await stokUreticiKaydet({ ...f, stokId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Üretici kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Üretici eklendi");
  }

  async function sil(u: StokUretici) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== u.id));
    const res = await stokUreticiSil(u.id, stokId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Üretici silinemedi");
      return;
    }
    toast.success("Üretici silindi");
  }

  return (
    <AltListeKart
      baslik="Üreticiler"
      adet={liste.length}
      adetEtiket="üretici"
      ekleEtiket="Üretici Ekle"
      onEkle={ekleAc}
      ikon={<Factory className="size-4 text-muted-foreground" />}
    >
      <UreticiSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        tedarikciler={tedarikciler}
        onSave={kaydetKayit}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Üretici</TableHead>
            <TableHead>Üretici Kodu</TableHead>
            <TableHead className="text-right">Fiyat</TableHead>
            <TableHead>Döviz</TableHead>
            <TableHead className="text-right">Min Sipariş</TableHead>
            <TableHead className="text-right">Tedarik (gün)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.cariAd}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {u.ureticiKodu ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fiyatYaz(u.fiyat, u.doviz)}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.doviz}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {u.minSiparis ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {u.tedarikGun ?? "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(u)}
                  onSil={() => sil(u)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Bu stok kartı için kayıtlı üretici yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function UreticiSheet({
  open,
  onOpenChange,
  kayit,
  tedarikciler,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: StokUretici | null;
  tedarikciler: { id: string; ad: string }[];
  onSave: (f: Omit<StokUretici, "id" | "stokId">) => void;
}) {
  const [form, setForm] = React.useState({
    cariId: "",
    cariAd: "",
    ureticiKodu: "",
    fiyat: "",
    doviz: "TL" as Doviz,
    minSiparis: "",
    tedarikGun: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      cariId: kayit?.cariId ?? "",
      cariAd: kayit?.cariAd ?? "",
      ureticiKodu: kayit?.ureticiKodu ?? "",
      fiyat: kayit?.fiyat ? String(kayit.fiyat) : "",
      doviz: kayit?.doviz ?? "TL",
      minSiparis: kayit?.minSiparis != null ? String(kayit.minSiparis) : "",
      tedarikGun: kayit?.tedarikGun != null ? String(kayit.tedarikGun) : "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.cariId) {
      toast.error("Üretici (cari) seçin");
      return;
    }
    const num = (v: string) => (v.trim() ? Number(v) : undefined);
    onSave({
      cariId: form.cariId,
      cariAd: form.cariAd,
      ureticiKodu: form.ureticiKodu.trim() || undefined,
      fiyat: form.fiyat.trim() ? Number(form.fiyat) : 0,
      doviz: form.doviz,
      minSiparis: num(form.minSiparis),
      tedarikGun: num(form.tedarikGun),
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Üreticiyi Düzenle" : "Üretici Ekle"}
      icon={TruckIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <AnimatedField label="Cari (Tedarikçi)" icon={UsersIcon}>
          <SearchSelect
            items={tedarikciler.map((c) => c.ad)}
            value={form.cariAd || null}
            onValueChange={(v) => {
              const c = tedarikciler.find((x) => x.ad === v);
              setForm((f) => ({
                ...f,
                cariId: c?.id ?? "",
                cariAd: c?.ad ?? "",
              }));
            }}
            placeholder="Tedarikçi seç"
          />
        </AnimatedField>
        <IconInput
          label="Üretici Kodu"
          icon={ScanTextIcon}
          placeholder="Üreticideki stok kodu"
          value={form.ureticiKodu}
          onChange={(e) =>
            setForm((f) => ({ ...f, ureticiKodu: e.target.value }))
          }
        />
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Fiyat"
            icon={WalletIcon}
            type="number"
            min={0}
            placeholder="0,00"
            value={form.fiyat}
            onChange={(e) => setForm((f) => ({ ...f, fiyat: e.target.value }))}
          />
          <AnimatedField label="Döviz" icon={WalletIcon}>
            <SearchSelect
              items={DOVIZLER}
              value={form.doviz}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, doviz: (v as Doviz) ?? "TL" }))
              }
              placeholder="TL"
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Min Sipariş"
            icon={BlocksIcon}
            type="number"
            min={0}
            placeholder="0"
            value={form.minSiparis}
            onChange={(e) =>
              setForm((f) => ({ ...f, minSiparis: e.target.value }))
            }
          />
          <IconInput
            label="Tedarik (gün)"
            icon={BlocksIcon}
            type="number"
            min={0}
            placeholder="0"
            value={form.tedarikGun}
            onChange={(e) =>
              setForm((f) => ({ ...f, tedarikGun: e.target.value }))
            }
          />
        </div>
      </div>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* MÜŞTERİLER SEKMESİ                                                 */
/* ------------------------------------------------------------------ */
function MusterilerTab({
  stokId,
  kayitlar,
  musteriCariler,
}: {
  stokId: string;
  kayitlar: StokMusteri[];
  musteriCariler: { id: string; ad: string }[];
}) {
  const [liste, setListe] = React.useState<StokMusteri[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<StokMusteri | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(m: StokMusteri) {
    setDuzenlenen(m);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<StokMusteri, "id" | "stokId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await stokMusteriKaydet({ ...f, id: duzenlenen.id, stokId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Müşteri kaydedilemedi");
        return;
      }
      toast.success("Müşteri güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, stokId }]);
    const res = await stokMusteriKaydet({ ...f, stokId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Müşteri kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Müşteri eklendi");
  }

  async function sil(m: StokMusteri) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== m.id));
    const res = await stokMusteriSil(m.id, stokId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Müşteri silinemedi");
      return;
    }
    toast.success("Müşteri silindi");
  }

  return (
    <AltListeKart
      baslik="Müşteriler"
      adet={liste.length}
      adetEtiket="müşteri"
      ekleEtiket="Müşteri Ekle"
      onEkle={ekleAc}
      ikon={<Users className="size-4 text-muted-foreground" />}
    >
      <MusteriSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        musteriCariler={musteriCariler}
        onSave={kaydetKayit}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Müşteri</TableHead>
            <TableHead>Müşteri Kodu</TableHead>
            <TableHead className="text-right">Fiyat</TableHead>
            <TableHead>Döviz</TableHead>
            <TableHead className="text-right">Min Sipariş</TableHead>
            <TableHead className="text-right">İskonto %</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.cariAd}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {m.musteriKodu ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fiyatYaz(m.fiyat, m.doviz)}
              </TableCell>
              <TableCell className="text-muted-foreground">{m.doviz}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {m.minSiparis ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {m.iskontoOrani != null ? `%${m.iskontoOrani}` : "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(m)}
                  onSil={() => sil(m)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Bu stok kartı için kayıtlı müşteri yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function MusteriSheet({
  open,
  onOpenChange,
  kayit,
  musteriCariler,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: StokMusteri | null;
  musteriCariler: { id: string; ad: string }[];
  onSave: (f: Omit<StokMusteri, "id" | "stokId">) => void;
}) {
  const [form, setForm] = React.useState({
    cariId: "",
    cariAd: "",
    musteriKodu: "",
    fiyat: "",
    doviz: "TL" as Doviz,
    minSiparis: "",
    iskontoOrani: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      cariId: kayit?.cariId ?? "",
      cariAd: kayit?.cariAd ?? "",
      musteriKodu: kayit?.musteriKodu ?? "",
      fiyat: kayit?.fiyat ? String(kayit.fiyat) : "",
      doviz: kayit?.doviz ?? "TL",
      minSiparis: kayit?.minSiparis != null ? String(kayit.minSiparis) : "",
      iskontoOrani:
        kayit?.iskontoOrani != null ? String(kayit.iskontoOrani) : "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.cariId) {
      toast.error("Müşteri (cari) seçin");
      return;
    }
    const num = (v: string) => (v.trim() ? Number(v) : undefined);
    onSave({
      cariId: form.cariId,
      cariAd: form.cariAd,
      musteriKodu: form.musteriKodu.trim() || undefined,
      fiyat: form.fiyat.trim() ? Number(form.fiyat) : 0,
      doviz: form.doviz,
      minSiparis: num(form.minSiparis),
      iskontoOrani: num(form.iskontoOrani),
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Müşteriyi Düzenle" : "Müşteri Ekle"}
      icon={UsersIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <AnimatedField label="Cari (Müşteri)" icon={UsersIcon}>
          <SearchSelect
            items={musteriCariler.map((c) => c.ad)}
            value={form.cariAd || null}
            onValueChange={(v) => {
              const c = musteriCariler.find((x) => x.ad === v);
              setForm((f) => ({
                ...f,
                cariId: c?.id ?? "",
                cariAd: c?.ad ?? "",
              }));
            }}
            placeholder="Müşteri seç"
          />
        </AnimatedField>
        <IconInput
          label="Müşteri Kodu"
          icon={ScanTextIcon}
          placeholder="Müşterideki stok kodu"
          value={form.musteriKodu}
          onChange={(e) =>
            setForm((f) => ({ ...f, musteriKodu: e.target.value }))
          }
        />
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Fiyat"
            icon={WalletIcon}
            type="number"
            min={0}
            placeholder="0,00"
            value={form.fiyat}
            onChange={(e) => setForm((f) => ({ ...f, fiyat: e.target.value }))}
          />
          <AnimatedField label="Döviz" icon={WalletIcon}>
            <SearchSelect
              items={DOVIZLER}
              value={form.doviz}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, doviz: (v as Doviz) ?? "TL" }))
              }
              placeholder="TL"
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Min Sipariş"
            icon={BlocksIcon}
            type="number"
            min={0}
            placeholder="0"
            value={form.minSiparis}
            onChange={(e) =>
              setForm((f) => ({ ...f, minSiparis: e.target.value }))
            }
          />
          <IconInput
            label="İskonto Oranı (%)"
            icon={BadgePercentIcon}
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={form.iskontoOrani}
            onChange={(e) =>
              setForm((f) => ({ ...f, iskontoOrani: e.target.value }))
            }
          />
        </div>
      </div>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* DOKÜMANLAR SEKMESİ                                                 */
/* ------------------------------------------------------------------ */
const RESIM_UZANTI = /\.(jpe?g|png|webp)$/i;
const VIDEO_UZANTI = /\.(mp4|webm|mov|avi|mkv)$/i;

function resimMi(url: string): boolean {
  return RESIM_UZANTI.test(url.split("?")[0]);
}

/** Dosya adına göre doküman tipi önerir. */
function tipTahmin(dosyaAdi: string): StokDokumanTipi {
  if (RESIM_UZANTI.test(dosyaAdi)) return "Ürün Resmi";
  if (/\.pdf$/i.test(dosyaAdi)) return "PDF";
  if (VIDEO_UZANTI.test(dosyaAdi)) return "Video";
  return "Diğer";
}

function DokumanlarTab({
  stokId,
  kayitlar,
}: {
  stokId: string;
  kayitlar: StokDokuman[];
}) {
  const [liste, setListe] = React.useState<StokDokuman[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<StokDokuman | null>(null);

  // Görsel tipli/uzantılılar önizleme grid'inde, diğerleri satır listesinde.
  const resimler = liste.filter((d) => resimMi(d.url));
  const digerleri = liste.filter((d) => !resimMi(d.url));

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(d: StokDokuman) {
    setDuzenlenen(d);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<StokDokuman, "id" | "stokId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await stokDokumanKaydet({ ...f, id: duzenlenen.id, stokId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Doküman kaydedilemedi");
        return;
      }
      toast.success("Doküman güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, stokId }]);
    const res = await stokDokumanKaydet({ ...f, stokId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Doküman kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Doküman eklendi");
  }

  async function sil(d: StokDokuman) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== d.id));
    const res = await stokDokumanSil(d.id, stokId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Doküman silinemedi");
      return;
    }
    toast.success("Doküman silindi");
  }

  return (
    <AltListeKart
      baslik="Dokümanlar"
      adet={liste.length}
      adetEtiket="doküman"
      ekleEtiket="Doküman Ekle"
      onEkle={ekleAc}
      ikon={<FileImage className="size-4 text-muted-foreground" />}
    >
      <DokumanSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        stokId={stokId}
        onSave={kaydetKayit}
      />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Dosyalar bilgisayarınızdan seçilip sunucuya yüklenir (en fazla 20
            MB). Görseller önizleme olarak, diğerleri liste halinde gösterilir.
          </span>
        </div>

        {/* Görseller — küçük önizleme grid'i */}
        {resimler.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {resimler.map((d) => (
              <div
                key={d.id}
                className="group relative overflow-hidden rounded-md border bg-muted/20"
              >
                <a href={d.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.url}
                    alt={d.ad}
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <Badge
                  variant="secondary"
                  className={cn(
                    "absolute top-1.5 left-1.5 h-4 px-1 py-0 text-[9px]",
                    DOKUMAN_TIP_RENK[d.tip],
                  )}
                >
                  {d.tip}
                </Badge>
                <div className="flex items-center justify-between gap-1 border-t bg-card px-2 py-1">
                  <span className="truncate text-xs" title={d.ad}>
                    {d.ad}
                  </span>
                  <SatirMenu
                    onDuzenle={() => duzenleAc(d)}
                    onSil={() => sil(d)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Diğer dokümanlar — satır listesi (tip rozetiyle) */}
        {digerleri.length > 0 && (
          <div className="overflow-hidden rounded-md border">
            {digerleri.map((d, i) => (
              <div
                key={d.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  i > 0 && "border-t",
                )}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {d.ad}
                </span>
                <Badge
                  variant="secondary"
                  className={cn("h-4 px-1 py-0 text-[9px]", DOKUMAN_TIP_RENK[d.tip])}
                >
                  {d.tip}
                </Badge>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" /> Aç
                </a>
                <SatirMenu
                  onDuzenle={() => duzenleAc(d)}
                  onSil={() => sil(d)}
                />
              </div>
            ))}
          </div>
        )}

        {liste.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Bu stok kartı için kayıtlı doküman yok.
          </div>
        )}
      </div>
    </AltListeKart>
  );
}

function DokumanSheet({
  open,
  onOpenChange,
  kayit,
  stokId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: StokDokuman | null;
  stokId: string;
  onSave: (f: Omit<StokDokuman, "id" | "stokId">) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [tip, setTip] = React.useState<StokDokumanTipi>("Diğer");
  const [dosya, setDosya] = React.useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const dosyaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(kayit?.ad ?? "");
    setTip(kayit?.tip ?? "Diğer");
    setDosya(null);
    setYukleniyor(false);
  }, [open, kayit]);

  function dosyaSecildi(f: File | null) {
    setDosya(f);
    if (!f) return;
    // Ad boşsa dosya adından öner (uzantısız).
    if (!ad.trim()) setAd(f.name.replace(/\.[^.]+$/, ""));
    // Tip'i dosya uzantısına göre öner (yeni kayıtta).
    if (!kayit) setTip(tipTahmin(f.name));
  }

  async function kaydet() {
    if (!ad.trim()) {
      toast.error("Doküman adı gerekli");
      return;
    }
    if (!kayit && !dosya) {
      toast.error("Dosya seçin");
      return;
    }
    let url = kayit?.url ?? "";
    if (dosya) {
      setYukleniyor(true);
      try {
        const fd = new FormData();
        fd.append("dosya", dosya);
        fd.append("klasor", `stok-${stokId}`);
        const cevap = await fetch("/api/dosya", { method: "POST", body: fd });
        const veri = await cevap.json();
        if (!cevap.ok || !veri.url) {
          toast.error(veri.error ?? "Dosya yüklenemedi");
          return;
        }
        url = veri.url;
      } catch {
        toast.error("Dosya yüklenemedi");
        return;
      } finally {
        setYukleniyor(false);
      }
    }
    onSave({ ad: ad.trim(), url, tip });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Dokümanı Düzenle" : "Doküman Ekle"}
      icon={FolderOpenIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        {/* Dosya seçimi — PC'den */}
        <input
          ref={dosyaRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={(e) => dosyaSecildi(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => dosyaRef.current?.click()}
          disabled={yukleniyor}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-6 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <FileImage className="size-5 text-muted-foreground" />
          {dosya ? (
            <>
              <span className="font-medium">{dosya.name}</span>
              <span className="text-xs text-muted-foreground">
                {(dosya.size / 1024 / 1024).toFixed(2)} MB · değiştirmek için
                tıklayın
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">
                {kayit ? "Dosyayı değiştir (isteğe bağlı)" : "Dosya seç"}
              </span>
              <span className="text-xs text-muted-foreground">
                Görsel, PDF, video, Office… en fazla 20 MB
              </span>
            </>
          )}
        </button>
        {kayit && !dosya && (
          <p className="text-xs text-muted-foreground">
            Mevcut dosya korunur; yalnızca ad ve tipi değiştirebilirsiniz.
          </p>
        )}
        <IconInput
          label="Ad"
          icon={ScanTextIcon}
          placeholder="Örn. Ürün Fotoğrafı"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <AnimatedField label="Tip" icon={FolderOpenIcon}>
          <SearchSelect
            items={DOKUMAN_TIPLERI}
            value={tip}
            onValueChange={(v) => setTip((v as StokDokumanTipi) ?? "Diğer")}
            placeholder="Doküman tipi"
          />
        </AnimatedField>
        {yukleniyor && (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        )}
      </div>
    </FormSheet>
  );
}
