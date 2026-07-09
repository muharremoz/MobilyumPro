"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Receipt,
  Plus,
  Calendar,
  Banknote,
  Wallet,
  Phone,
  Mail,
  MapPin,
  BadgePercent,
  MoreHorizontal,
  Pencil,
  Trash2,
  Landmark,
  Building2,
  Users,
  CalendarDays,
  FileImage,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NestedCard } from "@/components/ui/nested-card";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { YeniIslemSheet } from "@/components/cari/yeni-islem-sheet";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
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
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
import { UsersIcon } from "@/components/ui/icons/users";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { SendIcon } from "@/components/ui/icons/send";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { ReceiptIcon } from "@/components/ui/icons/receipt";
import { TruckIcon } from "@/components/ui/icons/truck";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatTL,
  formatTarih,
  type Cari,
  type CariBanka,
  type CariCrm,
  type CariCrmDurum,
  type CariCrmTip,
  type CariDokuman,
  type CariIslem,
  type CariIslemTuru,
  type CariSinifi,
  type CariSube,
  type CariTip,
  type CariYetkili,
  type ParaBirimi,
  type SatisFiyatTipi,
  type TanimTip,
} from "@/lib/data";
import {
  cariKaydet,
  cariIslemEkle,
  tanimKaydet,
  cariBankaKaydet,
  cariBankaSil,
  cariSubeKaydet,
  cariSubeSil,
  cariYetkiliKaydet,
  cariYetkiliSil,
  cariCrmKaydet,
  cariCrmSil,
  cariDokumanKaydet,
  cariDokumanSil,
} from "@/lib/db/actions";

/**
 * Cari kartın alt kayıtları — queries.getCariDetay ile aynı şekil.
 * (queries.ts "server-only" olduğundan tip burada yerel tanımlı.)
 */
export type CariDetay = {
  bankalar: CariBanka[];
  subeler: CariSube[];
  yetkililer: CariYetkili[];
  crmKayitlari: CariCrm[];
  dokumanlar: CariDokuman[];
};

const TIPLER: CariTip[] = ["Müşteri", "Tedarikçi", "Her İkisi", "Banka"];
const SINIFLAR: CariSinifi[] = ["Bireysel", "Kurumsal"];
const PARA_BIRIMLERI: ParaBirimi[] = ["TL", "USD", "EUR"];
const SATIS_FIYAT_TIPLERI: SatisFiyatTipi[] = [
  "Maliyet",
  "Satış Fiyatı 1",
  "Satış Fiyatı 2",
];
const CRM_TIPLERI: CariCrmTip[] = [
  "Telefon",
  "Ziyaret",
  "E-posta",
  "Teklif",
  "Toplantı",
  "Diğer",
];
const CRM_DURUMLAR: CariCrmDurum[] = ["Planlandı", "Tamamlandı", "İptal"];

const CRM_TIP_RENK: Record<CariCrmTip, string> = {
  Telefon: "bg-sky-100 text-sky-800",
  Ziyaret: "bg-violet-100 text-violet-800",
  "E-posta": "bg-blue-100 text-blue-800",
  Teklif: "bg-amber-100 text-amber-800",
  Toplantı: "bg-indigo-100 text-indigo-800",
  Diğer: "bg-slate-100 text-slate-800",
};
const CRM_DURUM_RENK: Record<CariCrmDurum, string> = {
  Planlandı: "bg-amber-100 text-amber-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
  İptal: "bg-rose-100 text-rose-800",
};

const ISLEM_RENK: Record<CariIslemTuru, string> = {
  Tahsilat: "bg-emerald-100 text-emerald-800",
  Ödeme: "bg-rose-100 text-rose-800",
  Borç: "bg-blue-100 text-blue-800",
  Alacak: "bg-amber-100 text-amber-800",
};

const ISLEM_IKON: Record<CariIslemTuru, React.ReactNode> = {
  Tahsilat: <ArrowDownToLine className="size-3.5" />,
  Ödeme: <ArrowUpFromLine className="size-3.5" />,
  Borç: <FileText className="size-3.5" />,
  Alacak: <Receipt className="size-3.5" />,
};

/**
 * İşlemin bakiyeye etkisi (cari bakış açısıyla).
 *  Pozitif bakiye = cari bizden ALACAKLI
 *  Negatif bakiye = cari bize BORÇLU
 */
function bakiyeEtkisi(tur: CariIslemTuru, tutar: number): number {
  switch (tur) {
    case "Borç":
      return -tutar; // cari bize borçlandı (daha negatif)
    case "Tahsilat":
      return +tutar; // borç tahsil edildi (negatiften yukarı)
    case "Alacak":
      return +tutar; // biz cari'ye borçlandık (daha pozitif)
    case "Ödeme":
      return -tutar; // ödeme yaptık (pozitiften aşağı)
  }
}

type Form = {
  id: string;
  ad: string;
  tamAd: string;
  tip: CariTip;
  sinif: CariSinifi;
  yetkili: string;
  yetkiliUnvan: string;
  yetkiliTelefon: string;
  yetkiliEmail: string;
  telefon: string;
  telefon2: string;
  telefon3: string;
  fax: string;
  email: string;
  webSite: string;
  satisFiyatTipi: SatisFiyatTipi;
  paraBirimi: ParaBirimi;
  iskontoOrani: string;
  temsilci: string;
  sube: string;
  muhasebeKodu: string;
  tcKimlik: string;
  vergiNo: string;
  vergiDairesi: string;
  unvan: string;
  ulke: string;
  bolge: string;
  sehir: string;
  semt: string;
  adres: string;
  durum: "Aktif" | "Pasif";
  not: string;
};

const bos: Form = {
  id: "",
  ad: "",
  tamAd: "",
  tip: "Müşteri",
  sinif: "Bireysel",
  yetkili: "",
  yetkiliUnvan: "",
  yetkiliTelefon: "",
  yetkiliEmail: "",
  telefon: "",
  telefon2: "",
  telefon3: "",
  fax: "",
  email: "",
  webSite: "",
  satisFiyatTipi: "Satış Fiyatı 1",
  paraBirimi: "TL",
  iskontoOrani: "",
  temsilci: "",
  sube: "",
  muhasebeKodu: "",
  tcKimlik: "",
  vergiNo: "",
  vergiDairesi: "",
  unvan: "",
  ulke: "",
  bolge: "",
  sehir: "",
  semt: "",
  adres: "",
  durum: "Aktif",
  not: "",
};

type Tab =
  | "islemler"
  | "genel"
  | "banka"
  | "subeler"
  | "yetkililer"
  | "crm"
  | "dokumanlar";

/** Adres combobox seçenekleri (Tanımlamalar'daki ulke/bolge/sehir/semt tanımları). */
export type AdresSecenekleri = Record<
  "ulke" | "bolge" | "sehir" | "semt",
  string[]
>;

const BOS_ADRES_SECENEKLERI: AdresSecenekleri = {
  ulke: [],
  bolge: [],
  sehir: [],
  semt: [],
};

// Varsayılan prop'lar MODÜL sabiti olmalı: inline `= []` / `?? []` her
// render'da yeni referans üretir ve [prop] bağımlı useEffect'leri sonsuz
// döngüye sokar.
const BOS_ISLEMLER: CariIslem[] = [];
const BOS_DETAY: CariDetay = {
  bankalar: [],
  subeler: [],
  yetkililer: [],
  crmKayitlari: [],
  dokumanlar: [],
};

export function CariFormPage({
  cari,
  islemler: islemlerProp = BOS_ISLEMLER,
  detay = BOS_DETAY,
  kullanicilar = [],
  adresSecenekleri = BOS_ADRES_SECENEKLERI,
  sonrakiKod = "",
}: {
  cari?: Cari;
  islemler?: CariIslem[];
  detay?: CariDetay;
  kullanicilar?: string[];
  adresSecenekleri?: AdresSecenekleri;
  /** Yeni cari için sunucuda hesaplanan sıradaki kod (önizleme). */
  sonrakiKod?: string;
} = {}) {
  const router = useRouter();
  const duzenleme = !!cari;
  const baslangic: Form = cari
    ? {
        id: cari.id,
        ad: cari.ad,
        tamAd: cari.tamAd ?? "",
        tip: cari.tip,
        sinif: cari.sinif,
        yetkili: cari.yetkili ?? "",
        yetkiliUnvan: cari.yetkiliUnvan ?? "",
        yetkiliTelefon: cari.yetkiliTelefon ?? "",
        yetkiliEmail: cari.yetkiliEmail ?? "",
        telefon: cari.telefon ?? "",
        telefon2: cari.telefon2 ?? "",
        telefon3: cari.telefon3 ?? "",
        fax: cari.fax ?? "",
        email: cari.email ?? "",
        webSite: cari.webSite ?? "",
        satisFiyatTipi: cari.satisFiyatTipi ?? "Satış Fiyatı 1",
        paraBirimi: cari.paraBirimi,
        iskontoOrani:
          cari.iskontoOrani != null && cari.iskontoOrani !== 0
            ? String(cari.iskontoOrani)
            : "",
        temsilci: cari.temsilci ?? "",
        sube: cari.sube ?? "",
        muhasebeKodu: cari.muhasebeKodu ?? "",
        tcKimlik: cari.tcKimlik ?? "",
        vergiNo: cari.vergiNo ?? "",
        vergiDairesi: cari.vergiDairesi ?? "",
        unvan: cari.unvan ?? "",
        ulke: cari.ulke ?? "",
        bolge: cari.bolge ?? "",
        sehir: cari.sehir ?? "",
        semt: cari.semt ?? "",
        adres: cari.adres ?? "",
        durum: cari.durum,
        not: cari.not ?? "",
      }
    : { ...bos, id: sonrakiKod };
  const [form, setForm] = React.useState<Form>(baslangic);
  // Yeni cari eklerken sekme yok → her zaman "genel"; düzenlemede varsayılan "islemler"
  const [tab, setTab] = React.useState<Tab>(duzenleme ? "islemler" : "genel");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  // Mevcut cari'nin işlemleri (DB'den prop olarak gelir; refresh ile senkron)
  const [islemler, setIslemler] = React.useState<CariIslem[]>(islemlerProp);
  React.useEffect(() => setIslemler(islemlerProp), [islemlerProp]);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const kurumsal = form.sinif === "Kurumsal";

  // Bakiye hesabı: işlemleri eski→yeni işle, her satır için "sonra ki bakiye"yi bul
  const islemlerWithBakiye = React.useMemo(() => {
    const eskiYeni = [...islemler].sort((a, b) =>
      a.tarih.localeCompare(b.tarih),
    );
    const netDelta = eskiYeni.reduce(
      (t, i) => t + bakiyeEtkisi(i.tur, i.tutar),
      0,
    );
    // mevcut bakiye, tüm işlemlerden sonraki son durum sayılır
    const sonBakiye = cari?.bakiye ?? 0;
    let bakiye = sonBakiye - netDelta;
    const ileri = eskiYeni.map((i) => {
      bakiye += bakiyeEtkisi(i.tur, i.tutar);
      return { ...i, bakiye };
    });
    // gösterimde yeni → eski
    return ileri.reverse();
  }, [islemler, cari]);

  const sonBakiye = islemlerWithBakiye[0]?.bakiye ?? cari?.bakiye ?? 0;

  const paraBirimi = cari?.paraBirimi ?? "TL";
  const onPara = React.useCallback(
    (n: number) => {
      if (paraBirimi === "TL") return formatTL(n);
      return `${n.toLocaleString("tr-TR")} ${paraBirimi}`;
    },
    [paraBirimi],
  );

  async function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Ad / Unvan gerekli");
      setTab("genel");
      return;
    }
    if (kurumsal && !form.vergiNo.trim()) {
      toast.error("Kurumsal cari için vergi numarası gerekli");
      setTab("genel");
      return;
    }
    const t = (s: string) => s.trim() || undefined;
    const yeniCari: Cari = {
      id: form.id,
      ad: form.ad.trim(),
      tamAd: t(form.tamAd),
      tip: form.tip,
      sinif: form.sinif,
      yetkili: t(form.yetkili),
      yetkiliUnvan: t(form.yetkiliUnvan),
      yetkiliTelefon: t(form.yetkiliTelefon),
      yetkiliEmail: t(form.yetkiliEmail),
      telefon: t(form.telefon),
      telefon2: t(form.telefon2),
      telefon3: t(form.telefon3),
      fax: t(form.fax),
      email: t(form.email),
      webSite: t(form.webSite),
      satisFiyatTipi: form.satisFiyatTipi,
      iskontoOrani: form.iskontoOrani.trim()
        ? Number(form.iskontoOrani)
        : undefined,
      temsilci: t(form.temsilci),
      sube: t(form.sube),
      muhasebeKodu: t(form.muhasebeKodu),
      tcKimlik: t(form.tcKimlik),
      vergiNo: t(form.vergiNo),
      vergiDairesi: t(form.vergiDairesi),
      unvan: t(form.unvan),
      ulke: t(form.ulke),
      bolge: t(form.bolge),
      sehir: t(form.sehir),
      semt: t(form.semt),
      adres: t(form.adres),
      bakiye: cari?.bakiye ?? 0,
      paraBirimi: form.paraBirimi,
      durum: form.durum,
      not: t(form.not),
    };
    const res = await cariKaydet(yeniCari, !duzenleme);
    if (!res.ok) {
      toast.error("Cari kaydedilemedi");
      return;
    }
    if (!duzenleme) {
      toast.success(`Cari eklendi (${res.id})`);
      router.push(`/cari/${res.id}`);
      return;
    }
    toast.success("Cari güncellendi");
    router.push("/cari");
  }

  async function islemEkle(yeni: Omit<CariIslem, "id" | "cariId">) {
    if (!cari) return;
    const res = await cariIslemEkle(cari.id, yeni);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem eklenemedi");
      return;
    }
    toast.success("İşlem eklendi");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {!duzenleme && <h1 className="text-xl font-semibold">Yeni Cari</h1>}

      {/* Firma alanı — sadece düzenlemede */}
      {duzenleme && cari && (
        <FirmaKarti
          cari={cari}
          bakiye={sonBakiye}
          onPara={onPara}
          sonIslem={islemlerWithBakiye[0]}
        />
      )}

      {/* Sekmeler — sadece düzenlemede (alt kayıtlar cari id ister) */}
      {duzenleme && (
        <div className="flex flex-wrap gap-1 border-b">
          <TabBtn aktif={tab === "islemler"} onClick={() => setTab("islemler")}>
            Cari İşlemler
          </TabBtn>
          <TabBtn aktif={tab === "genel"} onClick={() => setTab("genel")}>
            Genel
          </TabBtn>
          <TabBtn aktif={tab === "banka"} onClick={() => setTab("banka")}>
            Banka Bilgileri
          </TabBtn>
          <TabBtn aktif={tab === "subeler"} onClick={() => setTab("subeler")}>
            Şubeler
          </TabBtn>
          <TabBtn
            aktif={tab === "yetkililer"}
            onClick={() => setTab("yetkililer")}
          >
            Yetkililer
          </TabBtn>
          <TabBtn aktif={tab === "crm"} onClick={() => setTab("crm")}>
            CRM
          </TabBtn>
          <TabBtn
            aktif={tab === "dokumanlar"}
            onClick={() => setTab("dokumanlar")}
          >
            Dokümanlar
          </TabBtn>
        </div>
      )}

      {duzenleme && tab === "islemler" && (
        <IslemlerTab
          paraBirimi={paraBirimi}
          onPara={onPara}
          islemler={islemlerWithBakiye}
          onEkle={islemEkle}
        />
      )}

      {(tab === "genel" || !duzenleme) && (
        <>
          <GenelTab
            form={form}
            setForm={setForm}
            set={set}
            kurumsal={kurumsal}
            duzenleme={duzenleme}
            kullanicilar={kullanicilar}
            durumRef={durumRef}
            adresSecenekleri={adresSecenekleri}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/cari" />}
            >
              İptal
            </Button>
            <Button onClick={kaydet}>Kaydet</Button>
          </div>
        </>
      )}

      {duzenleme && cari && tab === "banka" && (
        <BankaTab cariId={cari.id} kayitlar={detay.bankalar} />
      )}
      {duzenleme && cari && tab === "subeler" && (
        <SubelerTab
          cariId={cari.id}
          kayitlar={detay.subeler}
          adresSecenekleri={adresSecenekleri}
        />
      )}
      {duzenleme && cari && tab === "yetkililer" && (
        <YetkililerTab
          cariId={cari.id}
          kayitlar={detay.yetkililer}
          subeler={detay.subeler.map((s) => s.subeAdi)}
        />
      )}
      {duzenleme && cari && tab === "crm" && (
        <CrmTab
          cariId={cari.id}
          kayitlar={detay.crmKayitlari}
          kullanicilar={kullanicilar}
        />
      )}
      {duzenleme && cari && tab === "dokumanlar" && (
        <DokumanlarTab cariId={cari.id} kayitlar={detay.dokumanlar} />
      )}
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

/* ------------------------------------------------------------------ */
/* CARİ İŞLEMLER SEKMESİ                                              */
/* ------------------------------------------------------------------ */
function IslemlerTab({
  paraBirimi,
  onPara,
  islemler,
  onEkle,
}: {
  paraBirimi: ParaBirimi;
  onPara: (n: number) => string;
  islemler: (CariIslem & { bakiye: number })[];
  onEkle: (yeni: Omit<CariIslem, "id" | "cariId">) => void;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <YeniIslemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        paraBirimi={paraBirimi}
        onEkle={onEkle}
      />

      {/* İşlem listesi */}
      <div className="overflow-hidden rounded-md border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">İşlemler</span>
            <span className="text-xs text-muted-foreground">
              · {islemler.length} işlem
            </span>
          </div>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" /> Yeni İşlem
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Belge</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Tarih
                </span>
              </TableHead>
              <TableHead>Tür</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead className="text-right">Bakiye</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {islemler.map((i) => {
              const delta = bakiyeEtkisi(i.tur, i.tutar);
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {i.belge ?? i.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTarih(i.tarih)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ISLEM_RENK[i.tur]}>
                      <span className="mr-1 inline-flex items-center">
                        {ISLEM_IKON[i.tur]}
                      </span>
                      {i.tur}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      delta > 0 && "text-emerald-600",
                      delta < 0 && "text-rose-600",
                    )}
                  >
                    {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                    {onPara(i.tutar)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      i.bakiye < 0 && "text-rose-600",
                      i.bakiye > 0 && "text-emerald-600",
                      i.bakiye === 0 && "text-muted-foreground",
                    )}
                  >
                    {onPara(Math.abs(i.bakiye))}
                    <span className="ml-1 text-[10px] uppercase">
                      {i.bakiye < 0 ? "B" : i.bakiye > 0 ? "A" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {i.aciklama}
                  </TableCell>
                </TableRow>
              );
            })}
            {islemler.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Bu cari için kayıtlı işlem yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const TIP_RENK_FIRMA: Record<CariTip, string> = {
  Müşteri: "bg-blue-100 text-blue-800",
  Tedarikçi: "bg-amber-100 text-amber-800",
  "Her İkisi": "bg-violet-100 text-violet-800",
  Banka: "bg-emerald-100 text-emerald-800",
};

/**
 * Firma alanı — cari bilgisi özet kartı. Sekmelerin üstünde sabit durur,
 * her zaman hangi cari ile çalıştığımızı gösterir. Nested stil.
 */
function FirmaKarti({
  cari,
  bakiye,
  onPara,
  sonIslem,
}: {
  cari: Cari;
  bakiye: number;
  onPara: (n: number) => string;
  sonIslem?: CariIslem;
}) {
  const alacakli = bakiye > 0;
  const borclu = bakiye < 0;
  const sifir = bakiye === 0;

  return (
    <NestedCard>
      <div className="grid items-center gap-4 p-4 lg:grid-cols-[1fr_auto]">
        {/* Sol: Kimlik + iletişim (ad altında) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg leading-tight font-semibold">
              {cari.ad}
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              {cari.id}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={TIP_RENK_FIRMA[cari.tip]}>
              {cari.tip}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {cari.sinif}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {cari.paraBirimi}
            </Badge>
            {cari.durum === "Pasif" && (
              <Badge variant="secondary">Pasif</Badge>
            )}
          </div>

          {/* İletişim — firma adının altında, yatay */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {cari.telefon && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" />
                <span className="text-foreground">{cari.telefon}</span>
              </span>
            )}
            {cari.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" />
                <span className="text-foreground">{cari.email}</span>
              </span>
            )}
            {cari.sehir && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span className="text-foreground">{cari.sehir}</span>
              </span>
            )}
            {cari.vergiNo && (
              <span className="flex items-center gap-1.5">
                <BadgePercent className="size-3.5 shrink-0" />
                <span className="text-foreground">
                  VKN {cari.vergiNo}
                  {cari.vergiDairesi ? ` · ${cari.vergiDairesi}` : ""}
                </span>
              </span>
            )}
            {!cari.telefon &&
              !cari.email &&
              !cari.sehir &&
              !cari.vergiNo && (
                <span className="text-muted-foreground/70">
                  İletişim bilgisi yok
                </span>
              )}
          </div>
        </div>

        {/* Sağ: Bakiye + son işlem */}
        <div className="text-right">
          <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Mevcut Bakiye
          </div>
          <div
            className={cn(
              "mt-0.5 text-2xl font-semibold tabular-nums",
              alacakli && "text-emerald-700",
              borclu && "text-rose-700",
              sifir && "text-foreground",
            )}
          >
            {onPara(Math.abs(bakiye))}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {sifir
              ? "Hesap kapalı"
              : alacakli
                ? "Cari ALACAKLI"
                : "Cari BORÇLU"}
          </div>
          {sonIslem && (
            <div className="mt-2 flex items-center justify-end gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
              <span>Son işlem:</span>
              <Badge
                variant="secondary"
                className={cn("h-4 px-1 py-0 text-[9px]", ISLEM_RENK[sonIslem.tur])}
              >
                {sonIslem.tur}
              </Badge>
              <span className="font-medium text-foreground">
                {onPara(sonIslem.tutar)}
              </span>
              <span>· {formatTarih(sonIslem.tarih)}</span>
            </div>
          )}
        </div>
      </div>
    </NestedCard>
  );
}

/** Nested kart başlık satırı — bizim standart kart başlığı. */
function NestedKartBaslik({
  baslik,
  ikon,
}: {
  baslik: string;
  ikon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {baslik}
      </span>
      {ikon}
    </div>
  );
}

/** Hero — Mevcut Bakiye kartı: sol kenarda renk şeridi, durum metni. */
function BakiyeKarti({
  bakiye,
  paraBirimi,
  onPara,
}: {
  bakiye: number;
  paraBirimi: ParaBirimi;
  onPara: (n: number) => string;
}) {
  const sifir = bakiye === 0;
  const alacakli = bakiye > 0;
  const borclu = bakiye < 0;

  const seritRenk = alacakli
    ? "bg-emerald-500"
    : borclu
      ? "bg-rose-500"
      : "bg-muted-foreground/30";
  const rakamRenk = alacakli
    ? "text-emerald-700"
    : borclu
      ? "text-rose-700"
      : "text-foreground";
  const durumMetni = sifir
    ? "Hesap kapalı"
    : alacakli
      ? "Cari bizden ALACAKLI"
      : "Cari bize BORÇLU";

  return (
    <NestedCard innerClassName="relative overflow-hidden">
      {/* Sol renk şeridi — iç beyaz kartın sol kenarında */}
      <span
        aria-hidden
        className={cn("absolute top-0 bottom-0 left-0 w-1", seritRenk)}
      />
      <div className="pl-3">
        <NestedKartBaslik
          baslik="Mevcut Bakiye"
          ikon={<Wallet className="size-4 text-muted-foreground" />}
        />
        <div className="px-3 py-2.5">
          <div className={cn("text-2xl font-semibold tabular-nums", rakamRenk)}>
            {onPara(Math.abs(bakiye))}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{durumMetni}</span>
            {!sifir && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase",
                  alacakli
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800",
                )}
              >
                {alacakli ? "A" : "B"} · {paraBirimi}
              </span>
            )}
          </div>
        </div>
      </div>
    </NestedCard>
  );
}

/** Cari'nin borcu: toplam borç vs tahsilat — ne kadarı kaldı? */
function BorcKarti({
  toplamBorc,
  toplamTahsilat,
  onPara,
}: {
  toplamBorc: number;
  toplamTahsilat: number;
  onPara: (n: number) => string;
}) {
  const kalan = Math.max(0, toplamBorc - toplamTahsilat);
  const oran = toplamBorc > 0
    ? Math.min(100, Math.round((toplamTahsilat / toplamBorc) * 100))
    : 0;

  return (
    <NestedCard>
      <NestedKartBaslik
        baslik="Cari'nin Borcu"
        ikon={<FileText className="size-4 text-blue-600" />}
      />
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="text-lg font-semibold tabular-nums text-foreground">
          {onPara(kalan)}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${oran}%` }}
            aria-label={`Tahsil oranı %${oran}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>
            Toplam:{" "}
            <span className="font-medium text-foreground">
              {onPara(toplamBorc)}
            </span>
          </span>
          <span className="text-emerald-700">
            Tahsil: {onPara(toplamTahsilat)} · %{oran}
          </span>
        </div>
      </div>
    </NestedCard>
  );
}

/** Biz cari'ye borçluyuz: toplam alacak vs ödeme — ne kadarı kaldı? */
function AlacakKarti({
  toplamAlacak,
  toplamOdeme,
  onPara,
}: {
  toplamAlacak: number;
  toplamOdeme: number;
  onPara: (n: number) => string;
}) {
  const kalan = Math.max(0, toplamAlacak - toplamOdeme);
  const oran = toplamAlacak > 0
    ? Math.min(100, Math.round((toplamOdeme / toplamAlacak) * 100))
    : 0;

  return (
    <NestedCard>
      <NestedKartBaslik
        baslik="Bizim Borcumuz"
        ikon={<Receipt className="size-4 text-amber-600" />}
      />
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="text-lg font-semibold tabular-nums text-foreground">
          {onPara(kalan)}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-rose-500 transition-all"
            style={{ width: `${oran}%` }}
            aria-label={`Ödeme oranı %${oran}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>
            Toplam:{" "}
            <span className="font-medium text-foreground">
              {onPara(toplamAlacak)}
            </span>
          </span>
          <span className="text-rose-700">
            Ödendi: {onPara(toplamOdeme)} · %{oran}
          </span>
        </div>
      </div>
    </NestedCard>
  );
}

/** Hareket özeti: işlem sayısı + son işlem tarihi. */
function HareketKarti({
  islemler,
}: {
  islemler: { tarih: string; tur: CariIslemTuru }[];
}) {
  const son = islemler[0];
  return (
    <NestedCard>
      <NestedKartBaslik
        baslik="Hareket Özeti"
        ikon={<Banknote className="size-4 text-muted-foreground" />}
      />
      <div className="space-y-1 px-3 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums">
            {islemler.length}
          </span>
          <span className="text-xs text-muted-foreground">işlem</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {son ? (
            <span>
              Son: {formatTarih(son.tarih)} ·{" "}
              <span className="font-medium text-foreground">{son.tur}</span>
            </span>
          ) : (
            <span>Henüz işlem yok</span>
          )}
        </div>
      </div>
    </NestedCard>
  );
}

/* ------------------------------------------------------------------ */
/* GENEL SEKMESİ                                                      */
/* ------------------------------------------------------------------ */
const textareaCls =
  "w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

// Adres alanı → tanım tipi + form anahtarı + etiket eşlemesi.
const ADRES_ALANLARI: {
  alan: "ulke" | "bolge" | "sehir" | "semt";
  etiket: string;
  ornek: string;
}[] = [
  { alan: "ulke", etiket: "Ülke", ornek: "Örn. Türkiye" },
  { alan: "bolge", etiket: "Bölge", ornek: "Örn. Marmara" },
  { alan: "sehir", etiket: "Şehir", ornek: "Örn. İstanbul" },
  { alan: "semt", etiket: "Semt", ornek: "Örn. Kadıköy" },
];

function GenelTab({
  form,
  setForm,
  set,
  kurumsal,
  duzenleme,
  kullanicilar,
  durumRef,
  adresSecenekleri,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  set: (k: keyof Form) => (v: string) => void;
  kurumsal: boolean;
  duzenleme: boolean;
  kullanicilar: string[];
  durumRef: React.RefObject<AnimatedIconHandle | null>;
  adresSecenekleri: AdresSecenekleri;
}) {
  // Adres seçenekleri — "yeni ekle" ile oturum içinde büyür (DB'ye de yazılır).
  const [secenekler, setSecenekler] =
    React.useState<AdresSecenekleri>(adresSecenekleri);
  React.useEffect(() => setSecenekler(adresSecenekleri), [adresSecenekleri]);
  const [yeniAlan, setYeniAlan] = React.useState<
    "ulke" | "bolge" | "sehir" | "semt" | null
  >(null);
  const [yeniDeger, setYeniDeger] = React.useState("");

  async function yeniSecenekEkle() {
    if (!yeniAlan) return;
    const v = yeniDeger.trim();
    if (!v) {
      toast.error("Değer gerekli");
      return;
    }
    const alan = yeniAlan;
    setSecenekler((s) => ({
      ...s,
      [alan]: s[alan].includes(v) ? s[alan] : [...s[alan], v],
    }));
    set(alan)(v);
    setYeniAlan(null);
    // Tanımlamalar'a kalıcı yaz.
    const res = await tanimKaydet(alan as TanimTip, { ad: v, durum: "Aktif" });
    if (!res.ok) toast.error(res.error ?? "Tanım kaydedilemedi.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Sol: Genel + İletişim + Satış & Muhasebe kartları */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* ── Genel ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Genel</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Ad (Kısa Ad)"
                icon={UsersRoundIcon}
                placeholder={kurumsal ? "Örn. Mobilyum" : "Ad Soyad"}
                value={form.ad}
                onChange={(e) => set("ad")(e.target.value)}
              />
              <IconInput
                label="Tam Ad / Ticari Ad"
                icon={UsersRoundIcon}
                placeholder="Örn. Mobilyum Ticaret Ltd. Şti."
                value={form.tamAd}
                onChange={(e) => set("tamAd")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <IconInput
                label="Kod"
                icon={ScanTextIcon}
                value={form.id}
                readOnly
                className="text-muted-foreground"
              />
              <AnimatedField label="Tip" icon={FolderOpenIcon}>
                <SearchSelect
                  items={TIPLER}
                  value={form.tip}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      tip: (v as CariTip) ?? "Müşteri",
                    }))
                  }
                  placeholder="Tip seç"
                />
              </AnimatedField>
              <AnimatedField label="Sınıf" icon={UsersIcon}>
                <SearchSelect
                  items={SINIFLAR}
                  value={form.sinif}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      sinif: (v as CariSinifi) ?? "Bireysel",
                    }))
                  }
                  placeholder="Sınıf seç"
                />
              </AnimatedField>
            </div>
            <AnimatedField label="Açıklama / Not" icon={AlignLeftIcon}>
              <textarea
                rows={2}
                placeholder="Cari ile ilgili özel notlar..."
                value={form.not}
                onChange={(e) => set("not")(e.target.value)}
                className={textareaCls}
              />
            </AnimatedField>
          </div>
        </div>

        {/* ── Yetkili (ana irtibat) ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Yetkili</span>
            <span className="text-xs text-muted-foreground">
              Ana irtibat — diğer kişiler Yetkililer sekmesinde
            </span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Ad Soyad"
                icon={UsersIcon}
                placeholder="Örn. Ahmet Yılmaz"
                value={form.yetkili}
                onChange={(e) => set("yetkili")(e.target.value)}
              />
              <IconInput
                label="Yetki Ünvanı"
                icon={UsersIcon}
                placeholder="Örn. Satın Alma Müdürü"
                value={form.yetkiliUnvan}
                onChange={(e) => set("yetkiliUnvan")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Telefon"
                icon={PhoneIcon}
                placeholder="0532 000 00 00"
                value={form.yetkiliTelefon}
                onChange={(e) => set("yetkiliTelefon")(e.target.value)}
              />
              <IconInput
                label="E-posta"
                icon={SendIcon}
                placeholder="ornek@firma.com"
                value={form.yetkiliEmail}
                onChange={(e) => set("yetkiliEmail")(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── İletişim ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">İletişim</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-3 gap-3">
              <IconInput
                label="Telefon 1"
                icon={PhoneIcon}
                placeholder="0532 000 00 00"
                value={form.telefon}
                onChange={(e) => set("telefon")(e.target.value)}
              />
              <IconInput
                label="Telefon 2"
                icon={PhoneIcon}
                placeholder=""
                value={form.telefon2}
                onChange={(e) => set("telefon2")(e.target.value)}
              />
              <IconInput
                label="Telefon 3"
                icon={PhoneIcon}
                placeholder=""
                value={form.telefon3}
                onChange={(e) => set("telefon3")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <IconInput
                label="Fax"
                icon={PhoneIcon}
                placeholder=""
                value={form.fax}
                onChange={(e) => set("fax")(e.target.value)}
              />
              <IconInput
                label="E-posta"
                icon={SendIcon}
                placeholder="ornek@firma.com"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
              />
              <IconInput
                label="Web Sitesi"
                icon={SendIcon}
                placeholder="www.firma.com"
                value={form.webSite}
                onChange={(e) => set("webSite")(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Satış & Muhasebe ── */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Satış &amp; Muhasebe</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-3 gap-3">
              <AnimatedField label="Satış Fiyat Tipi" icon={BadgePercentIcon}>
                <SearchSelect
                  items={SATIS_FIYAT_TIPLERI}
                  value={form.satisFiyatTipi}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      satisFiyatTipi:
                        (v as SatisFiyatTipi) ?? "Satış Fiyatı 1",
                    }))
                  }
                  placeholder="Fiyat tipi"
                />
              </AnimatedField>
              <AnimatedField label="Para Birimi" icon={WalletIcon}>
                <SearchSelect
                  items={PARA_BIRIMLERI}
                  value={form.paraBirimi}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      paraBirimi: (v as ParaBirimi) ?? "TL",
                    }))
                  }
                  placeholder="Para birimi"
                />
              </AnimatedField>
              <IconInput
                label="İskonto Oranı (%)"
                icon={BadgePercentIcon}
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={form.iskontoOrani}
                onChange={(e) => set("iskontoOrani")(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <AnimatedField label="Temsilci" icon={UsersIcon}>
                <SearchSelect
                  items={kullanicilar}
                  value={form.temsilci || null}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, temsilci: v ?? "" }))
                  }
                  placeholder="Satış temsilcisi"
                />
              </AnimatedField>
              <div className="grid gap-0.5">
                <IconInput
                  label="Şube"
                  icon={BlocksIcon}
                  placeholder="Bağlı mağaza şubesi"
                  value={form.sube}
                  onChange={(e) => set("sube")(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Çoklu şube kullanımında bağlı olduğu şube.
                </p>
              </div>
              <IconInput
                label="Muhasebe Kodu"
                icon={ScanTextIcon}
                placeholder="Örn. 120.01.001"
                value={form.muhasebeKodu}
                onChange={(e) => set("muhasebeKodu")(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sağ: Fatura bilgileri + Adres */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Fatura Bilgileri</span>
          </div>
          <div className="grid gap-3 p-4">
            {!kurumsal && (
              <IconInput
                label="TC Kimlik No"
                icon={ReceiptIcon}
                placeholder="11 haneli"
                value={form.tcKimlik}
                onChange={(e) => set("tcKimlik")(e.target.value)}
              />
            )}
            {kurumsal && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <IconInput
                    label="Vergi No"
                    icon={BadgePercentIcon}
                    placeholder="10 haneli"
                    value={form.vergiNo}
                    onChange={(e) => set("vergiNo")(e.target.value)}
                  />
                  <IconInput
                    label="Vergi Dairesi"
                    icon={BadgePercentIcon}
                    placeholder="Örn. Beşiktaş"
                    value={form.vergiDairesi}
                    onChange={(e) => set("vergiDairesi")(e.target.value)}
                  />
                </div>
                <IconInput
                  label="Ünvan"
                  icon={ReceiptIcon}
                  placeholder="Fatura ünvanı"
                  value={form.unvan}
                  onChange={(e) => set("unvan")(e.target.value)}
                />
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Adres</span>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              {ADRES_ALANLARI.map(({ alan, etiket, ornek }) => (
                <AnimatedField key={alan} label={etiket} icon={TruckIcon}>
                  <SearchSelect
                    items={secenekler[alan]}
                    value={form[alan] || null}
                    onValueChange={(v) => set(alan)(v ?? "")}
                    placeholder={ornek}
                    addLabel={`Yeni ${etiket.toLocaleLowerCase("tr")} ekle`}
                    onAdd={() => {
                      setYeniDeger("");
                      setYeniAlan(alan);
                    }}
                  />
                </AnimatedField>
              ))}
            </div>
            <AnimatedField label="Adres" icon={BlocksIcon}>
              <textarea
                rows={3}
                placeholder="Mahalle, sokak, no..."
                value={form.adres}
                onChange={(e) => set("adres")(e.target.value)}
                className={textareaCls}
              />
            </AnimatedField>
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

      {/* Yeni adres tanımı modalı (ülke/bölge/şehir/semt) */}
      <Dialog
        open={yeniAlan !== null}
        onOpenChange={(o) => !o && setYeniAlan(null)}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              Yeni {ADRES_ALANLARI.find((a) => a.alan === yeniAlan)?.etiket}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={
              ADRES_ALANLARI.find((a) => a.alan === yeniAlan)?.ornek ?? ""
            }
            value={yeniDeger}
            onChange={(e) => setYeniDeger(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                yeniSecenekEkle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniAlan(null)}>
              İptal
            </Button>
            <Button onClick={yeniSecenekEkle} disabled={!yeniDeger.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

/* ------------------------------------------------------------------ */
/* BANKA BİLGİLERİ SEKMESİ                                            */
/* ------------------------------------------------------------------ */
function BankaTab({
  cariId,
  kayitlar,
}: {
  cariId: string;
  kayitlar: CariBanka[];
}) {
  const [liste, setListe] = React.useState<CariBanka[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<CariBanka | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(b: CariBanka) {
    setDuzenlenen(b);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<CariBanka, "id" | "cariId">) {
    if (duzenlenen) {
      const onceki = liste;
      const guncel = { ...duzenlenen, ...f };
      setListe((l) => l.map((x) => (x.id === duzenlenen.id ? guncel : x)));
      const res = await cariBankaKaydet({ ...f, id: duzenlenen.id, cariId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Banka hesabı kaydedilemedi");
        return;
      }
      toast.success("Banka hesabı güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, cariId }]);
    const res = await cariBankaKaydet({ ...f, cariId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Banka hesabı kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Banka hesabı eklendi");
  }

  async function sil(b: CariBanka) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== b.id));
    const res = await cariBankaSil(b.id, cariId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Banka hesabı silinemedi");
      return;
    }
    toast.success("Banka hesabı silindi");
  }

  return (
    <AltListeKart
      baslik="Banka Hesapları"
      adet={liste.length}
      adetEtiket="hesap"
      ekleEtiket="Banka Hesabı Ekle"
      onEkle={ekleAc}
      ikon={<Landmark className="size-4 text-muted-foreground" />}
    >
      <BankaSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        onSave={kaydetKayit}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Banka Adı</TableHead>
            <TableHead>Şube</TableHead>
            <TableHead>IBAN</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.bankaAdi}</TableCell>
              <TableCell className="text-muted-foreground">
                {b.sube ?? "—"}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {b.iban ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {b.aciklama ?? "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(b)}
                  onSil={() => sil(b)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                Bu cari için kayıtlı banka hesabı yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function BankaSheet({
  open,
  onOpenChange,
  kayit,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: CariBanka | null;
  onSave: (f: Omit<CariBanka, "id" | "cariId">) => void;
}) {
  const [form, setForm] = React.useState({
    bankaAdi: "",
    sube: "",
    iban: "",
    aciklama: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      bankaAdi: kayit?.bankaAdi ?? "",
      sube: kayit?.sube ?? "",
      iban: kayit?.iban ?? "",
      aciklama: kayit?.aciklama ?? "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.bankaAdi.trim()) {
      toast.error("Banka adı gerekli");
      return;
    }
    onSave({
      bankaAdi: form.bankaAdi.trim(),
      sube: form.sube.trim() || undefined,
      iban: form.iban.trim() || undefined,
      aciklama: form.aciklama.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Banka Hesabını Düzenle" : "Banka Hesabı Ekle"}
      icon={WalletIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Banka Adı"
          icon={WalletIcon}
          placeholder="Örn. Ziraat Bankası"
          value={form.bankaAdi}
          onChange={(e) => setForm((f) => ({ ...f, bankaAdi: e.target.value }))}
        />
        <IconInput
          label="Şube"
          icon={BlocksIcon}
          placeholder="Örn. Kadıköy Şubesi"
          value={form.sube}
          onChange={(e) => setForm((f) => ({ ...f, sube: e.target.value }))}
        />
        <IconInput
          label="IBAN"
          icon={ScanTextIcon}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          value={form.iban}
          onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
        />
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Kısa açıklama..."
            value={form.aciklama}
            onChange={(e) =>
              setForm((f) => ({ ...f, aciklama: e.target.value }))
            }
            className={textareaCls}
          />
        </AnimatedField>
      </div>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* ŞUBELER SEKMESİ                                                    */
/* ------------------------------------------------------------------ */
function SubelerTab({
  cariId,
  kayitlar,
  adresSecenekleri,
}: {
  cariId: string;
  kayitlar: CariSube[];
  adresSecenekleri: AdresSecenekleri;
}) {
  const [liste, setListe] = React.useState<CariSube[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<CariSube | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(s: CariSube) {
    setDuzenlenen(s);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<CariSube, "id" | "cariId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await cariSubeKaydet({ ...f, id: duzenlenen.id, cariId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Şube kaydedilemedi");
        return;
      }
      toast.success("Şube güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, cariId }]);
    const res = await cariSubeKaydet({ ...f, cariId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Şube kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Şube eklendi");
  }

  async function sil(s: CariSube) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== s.id));
    const res = await cariSubeSil(s.id, cariId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Şube silinemedi");
      return;
    }
    toast.success("Şube silindi");
  }

  return (
    <AltListeKart
      baslik="Şubeler"
      adet={liste.length}
      adetEtiket="şube"
      ekleEtiket="Şube Ekle"
      onEkle={ekleAc}
      ikon={<Building2 className="size-4 text-muted-foreground" />}
    >
      <SubeSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        onSave={kaydetKayit}
        adresSecenekleri={adresSecenekleri}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Şube Adı</TableHead>
            <TableHead>Yetkili</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Şehir</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.subeAdi}</TableCell>
              <TableCell className="text-muted-foreground">
                {s.yetkili ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {s.telefon ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.email ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.sehir ?? "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(s)}
                  onSil={() => sil(s)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Bu cari için kayıtlı şube yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function SubeSheet({
  open,
  onOpenChange,
  kayit,
  onSave,
  adresSecenekleri,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: CariSube | null;
  onSave: (f: Omit<CariSube, "id" | "cariId">) => void;
  adresSecenekleri: AdresSecenekleri;
}) {
  const [form, setForm] = React.useState({
    subeAdi: "",
    yetkili: "",
    email: "",
    telefon: "",
    ulke: "",
    sehir: "",
    semt: "",
    adres: "",
    aciklama: "",
  });

  // Adres seçenekleri — "yeni ekle" ile büyür (Tanımlamalar'a da yazılır).
  const [secenekler, setSecenekler] =
    React.useState<AdresSecenekleri>(adresSecenekleri);
  React.useEffect(() => setSecenekler(adresSecenekleri), [adresSecenekleri]);
  const [yeniAlan, setYeniAlan] = React.useState<
    "ulke" | "sehir" | "semt" | null
  >(null);
  const [yeniDeger, setYeniDeger] = React.useState("");

  async function yeniSecenekEkle() {
    if (!yeniAlan) return;
    const v = yeniDeger.trim();
    if (!v) {
      toast.error("Değer gerekli");
      return;
    }
    const alan = yeniAlan;
    setSecenekler((s) => ({
      ...s,
      [alan]: s[alan].includes(v) ? s[alan] : [...s[alan], v],
    }));
    setForm((f) => ({ ...f, [alan]: v }));
    setYeniAlan(null);
    const res = await tanimKaydet(alan as TanimTip, { ad: v, durum: "Aktif" });
    if (!res.ok) toast.error(res.error ?? "Tanım kaydedilemedi.");
  }

  React.useEffect(() => {
    if (!open) return;
    setForm({
      subeAdi: kayit?.subeAdi ?? "",
      yetkili: kayit?.yetkili ?? "",
      email: kayit?.email ?? "",
      telefon: kayit?.telefon ?? "",
      ulke: kayit?.ulke ?? "",
      sehir: kayit?.sehir ?? "",
      semt: kayit?.semt ?? "",
      adres: kayit?.adres ?? "",
      aciklama: kayit?.aciklama ?? "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.subeAdi.trim()) {
      toast.error("Şube adı gerekli");
      return;
    }
    const t = (s: string) => s.trim() || undefined;
    onSave({
      subeAdi: form.subeAdi.trim(),
      yetkili: t(form.yetkili),
      email: t(form.email),
      telefon: t(form.telefon),
      ulke: t(form.ulke),
      sehir: t(form.sehir),
      semt: t(form.semt),
      adres: t(form.adres),
      aciklama: t(form.aciklama),
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Şubeyi Düzenle" : "Şube Ekle"}
      icon={BlocksIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Şube Adı"
          icon={BlocksIcon}
          placeholder="Örn. Kadıköy Mağaza"
          value={form.subeAdi}
          onChange={(e) => setForm((f) => ({ ...f, subeAdi: e.target.value }))}
        />
        <IconInput
          label="Yetkili"
          icon={UsersIcon}
          placeholder="Şube yetkilisi"
          value={form.yetkili}
          onChange={(e) => setForm((f) => ({ ...f, yetkili: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Telefon"
            icon={PhoneIcon}
            placeholder="0216 000 00 00"
            value={form.telefon}
            onChange={(e) =>
              setForm((f) => ({ ...f, telefon: e.target.value }))
            }
          />
          <IconInput
            label="E-posta"
            icon={SendIcon}
            placeholder="sube@firma.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ["ulke", "Ülke", "Türkiye"],
              ["sehir", "Şehir", "İstanbul"],
              ["semt", "Semt", "Kadıköy"],
            ] as const
          ).map(([alan, etiket, ornek]) => (
            <AnimatedField key={alan} label={etiket} icon={TruckIcon}>
              <SearchSelect
                items={secenekler[alan]}
                value={form[alan] || null}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, [alan]: v ?? "" }))
                }
                placeholder={ornek}
                addLabel={`Yeni ${etiket.toLocaleLowerCase("tr")} ekle`}
                onAdd={() => {
                  setYeniDeger("");
                  setYeniAlan(alan);
                }}
              />
            </AnimatedField>
          ))}
        </div>
        <AnimatedField label="Adres" icon={BlocksIcon}>
          <textarea
            rows={2}
            placeholder="Mahalle, sokak, no..."
            value={form.adres}
            onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))}
            className={textareaCls}
          />
        </AnimatedField>
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Kısa açıklama..."
            value={form.aciklama}
            onChange={(e) =>
              setForm((f) => ({ ...f, aciklama: e.target.value }))
            }
            className={textareaCls}
          />
        </AnimatedField>
      </div>

      {/* Yeni adres tanımı modalı (ülke/şehir/semt) */}
      <Dialog
        open={yeniAlan !== null}
        onOpenChange={(o) => !o && setYeniAlan(null)}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              Yeni{" "}
              {yeniAlan === "ulke"
                ? "Ülke"
                : yeniAlan === "sehir"
                  ? "Şehir"
                  : "Semt"}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={yeniDeger}
            onChange={(e) => setYeniDeger(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                yeniSecenekEkle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setYeniAlan(null)}>
              İptal
            </Button>
            <Button onClick={yeniSecenekEkle} disabled={!yeniDeger.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* YETKİLİLER SEKMESİ                                                 */
/* ------------------------------------------------------------------ */
function YetkililerTab({
  cariId,
  kayitlar,
  subeler,
}: {
  cariId: string;
  kayitlar: CariYetkili[];
  subeler: string[];
}) {
  const [liste, setListe] = React.useState<CariYetkili[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<CariYetkili | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(y: CariYetkili) {
    setDuzenlenen(y);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<CariYetkili, "id" | "cariId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await cariYetkiliKaydet({ ...f, id: duzenlenen.id, cariId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Yetkili kaydedilemedi");
        return;
      }
      toast.success("Yetkili güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, cariId }]);
    const res = await cariYetkiliKaydet({ ...f, cariId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "Yetkili kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("Yetkili eklendi");
  }

  async function sil(y: CariYetkili) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== y.id));
    const res = await cariYetkiliSil(y.id, cariId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Yetkili silinemedi");
      return;
    }
    toast.success("Yetkili silindi");
  }

  return (
    <AltListeKart
      baslik="Yetkililer"
      adet={liste.length}
      adetEtiket="yetkili"
      ekleEtiket="Yetkili Ekle"
      onEkle={ekleAc}
      ikon={<Users className="size-4 text-muted-foreground" />}
    >
      <YetkiliSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        subeler={subeler}
        onSave={kaydetKayit}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Yetkili</TableHead>
            <TableHead>Görevi</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Şube</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((y) => (
            <TableRow key={y.id}>
              <TableCell className="font-medium">{y.yetkili}</TableCell>
              <TableCell className="text-muted-foreground">
                {y.gorevi ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {y.telefon ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {y.email ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {y.subeAdi ?? "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(y)}
                  onSil={() => sil(y)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Bu cari için kayıtlı yetkili yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function YetkiliSheet({
  open,
  onOpenChange,
  kayit,
  subeler,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: CariYetkili | null;
  subeler: string[];
  onSave: (f: Omit<CariYetkili, "id" | "cariId">) => void;
}) {
  const [form, setForm] = React.useState({
    yetkili: "",
    gorevi: "",
    email: "",
    telefon: "",
    subeAdi: "",
    aciklama: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      yetkili: kayit?.yetkili ?? "",
      gorevi: kayit?.gorevi ?? "",
      email: kayit?.email ?? "",
      telefon: kayit?.telefon ?? "",
      subeAdi: kayit?.subeAdi ?? "",
      aciklama: kayit?.aciklama ?? "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.yetkili.trim()) {
      toast.error("Yetkili adı gerekli");
      return;
    }
    const t = (s: string) => s.trim() || undefined;
    onSave({
      yetkili: form.yetkili.trim(),
      gorevi: t(form.gorevi),
      email: t(form.email),
      telefon: t(form.telefon),
      subeAdi: t(form.subeAdi),
      aciklama: t(form.aciklama),
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "Yetkiliyi Düzenle" : "Yetkili Ekle"}
      icon={UsersIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Yetkili"
          icon={UsersIcon}
          placeholder="Ad Soyad"
          value={form.yetkili}
          onChange={(e) => setForm((f) => ({ ...f, yetkili: e.target.value }))}
        />
        <IconInput
          label="Görevi"
          icon={ScanTextIcon}
          placeholder="Örn. Satın Alma Müdürü"
          value={form.gorevi}
          onChange={(e) => setForm((f) => ({ ...f, gorevi: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Telefon"
            icon={PhoneIcon}
            placeholder="0532 000 00 00"
            value={form.telefon}
            onChange={(e) =>
              setForm((f) => ({ ...f, telefon: e.target.value }))
            }
          />
          <IconInput
            label="E-posta"
            icon={SendIcon}
            placeholder="ornek@firma.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        {subeler.length > 0 ? (
          <AnimatedField label="Şube" icon={BlocksIcon}>
            <SearchSelect
              items={subeler}
              value={form.subeAdi || null}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, subeAdi: v ?? "" }))
              }
              placeholder="Bağlı olduğu şube"
            />
          </AnimatedField>
        ) : (
          <IconInput
            label="Şube"
            icon={BlocksIcon}
            placeholder="Bağlı olduğu şube (serbest)"
            value={form.subeAdi}
            onChange={(e) =>
              setForm((f) => ({ ...f, subeAdi: e.target.value }))
            }
          />
        )}
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Kısa açıklama..."
            value={form.aciklama}
            onChange={(e) =>
              setForm((f) => ({ ...f, aciklama: e.target.value }))
            }
            className={textareaCls}
          />
        </AnimatedField>
      </div>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* CRM SEKMESİ                                                        */
/* ------------------------------------------------------------------ */
function CrmTab({
  cariId,
  kayitlar,
  kullanicilar,
}: {
  cariId: string;
  kayitlar: CariCrm[];
  kullanicilar: string[];
}) {
  const [liste, setListe] = React.useState<CariCrm[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<CariCrm | null>(null);

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(k: CariCrm) {
    setDuzenlenen(k);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<CariCrm, "id" | "cariId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await cariCrmKaydet({ ...f, id: duzenlenen.id, cariId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "CRM kaydı kaydedilemedi");
        return;
      }
      toast.success("CRM kaydı güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [{ ...f, id: gecici, cariId }, ...l]);
    const res = await cariCrmKaydet({ ...f, cariId });
    if (!res.ok || !res.id) {
      setListe((l) => l.filter((x) => x.id !== gecici));
      toast.error(res.error ?? "CRM kaydı kaydedilemedi");
      return;
    }
    setListe((l) =>
      l.map((x) => (x.id === gecici ? { ...x, id: res.id! } : x)),
    );
    toast.success("CRM kaydı eklendi");
  }

  async function sil(k: CariCrm) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== k.id));
    const res = await cariCrmSil(k.id, cariId);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "CRM kaydı silinemedi");
      return;
    }
    toast.success("CRM kaydı silindi");
  }

  return (
    <AltListeKart
      baslik="CRM Kayıtları"
      adet={liste.length}
      adetEtiket="kayıt"
      ekleEtiket="CRM Kaydı Ekle"
      onEkle={ekleAc}
      ikon={<CalendarDays className="size-4 text-muted-foreground" />}
    >
      <CrmSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        kayit={duzenlenen}
        kullanicilar={kullanicilar}
        onSave={kaydetKayit}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Tarih
              </span>
            </TableHead>
            <TableHead>Personel</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((k) => (
            <TableRow key={k.id}>
              <TableCell className="text-muted-foreground">
                {formatTarih(k.tarih)}
              </TableCell>
              <TableCell>{k.personel ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={CRM_TIP_RENK[k.tip]}>
                  {k.tip}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={CRM_DURUM_RENK[k.durum]}>
                  {k.durum}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {k.aciklama ?? "—"}
              </TableCell>
              <TableCell>
                <SatirMenu
                  onDuzenle={() => duzenleAc(k)}
                  onSil={() => sil(k)}
                />
              </TableCell>
            </TableRow>
          ))}
          {liste.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Bu cari için CRM kaydı yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AltListeKart>
  );
}

function CrmSheet({
  open,
  onOpenChange,
  kayit,
  kullanicilar,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: CariCrm | null;
  kullanicilar: string[];
  onSave: (f: Omit<CariCrm, "id" | "cariId">) => void;
}) {
  const bugun = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    tarih: bugun,
    personel: "",
    tip: "Telefon" as CariCrmTip,
    durum: "Planlandı" as CariCrmDurum,
    aciklama: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      tarih: kayit?.tarih ?? new Date().toISOString().slice(0, 10),
      personel: kayit?.personel ?? "",
      tip: kayit?.tip ?? "Telefon",
      durum: kayit?.durum ?? "Planlandı",
      aciklama: kayit?.aciklama ?? "",
    });
  }, [open, kayit]);

  function kaydet() {
    if (!form.tarih) {
      toast.error("Tarih gerekli");
      return;
    }
    onSave({
      tarih: form.tarih,
      personel: form.personel.trim() || undefined,
      tip: form.tip,
      durum: form.durum,
      aciklama: form.aciklama.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={kayit ? "CRM Kaydını Düzenle" : "CRM Kaydı Ekle"}
      icon={AlignLeftIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Tarih"
            icon={ScanTextIcon}
            type="date"
            value={form.tarih}
            onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))}
          />
          <AnimatedField label="Personel" icon={UsersIcon}>
            <SearchSelect
              items={kullanicilar}
              value={form.personel || null}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, personel: v ?? "" }))
              }
              placeholder="Görüşen personel"
            />
          </AnimatedField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatedField label="Tip" icon={FolderOpenIcon}>
            <SearchSelect
              items={CRM_TIPLERI}
              value={form.tip}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tip: (v as CariCrmTip) ?? "Telefon" }))
              }
              placeholder="Görüşme tipi"
            />
          </AnimatedField>
          <AnimatedField label="Durum" icon={CircleCheckIcon}>
            <SearchSelect
              items={CRM_DURUMLAR}
              value={form.durum}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  durum: (v as CariCrmDurum) ?? "Planlandı",
                }))
              }
              placeholder="Durum"
            />
          </AnimatedField>
        </div>
        <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
          <textarea
            rows={3}
            placeholder="Görüşme notları..."
            value={form.aciklama}
            onChange={(e) =>
              setForm((f) => ({ ...f, aciklama: e.target.value }))
            }
            className={textareaCls}
          />
        </AnimatedField>
      </div>
    </FormSheet>
  );
}

/* ------------------------------------------------------------------ */
/* DOKÜMANLAR SEKMESİ                                                 */
/* ------------------------------------------------------------------ */
const RESIM_UZANTI = /\.(jpe?g|png|webp)$/i;

function resimMi(url: string): boolean {
  return RESIM_UZANTI.test(url.split("?")[0]);
}

function DokumanlarTab({
  cariId,
  kayitlar,
}: {
  cariId: string;
  kayitlar: CariDokuman[];
}) {
  const [liste, setListe] = React.useState<CariDokuman[]>(kayitlar);
  React.useEffect(() => setListe(kayitlar), [kayitlar]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<CariDokuman | null>(null);

  const resimler = liste.filter((d) => resimMi(d.url));
  const digerleri = liste.filter((d) => !resimMi(d.url));

  function ekleAc() {
    setDuzenlenen(null);
    setSheetAcik(true);
  }
  function duzenleAc(d: CariDokuman) {
    setDuzenlenen(d);
    setSheetAcik(true);
  }

  async function kaydetKayit(f: Omit<CariDokuman, "id" | "cariId">) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...duzenlenen, ...f } : x)),
      );
      const res = await cariDokumanKaydet({ ...f, id: duzenlenen.id, cariId });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Doküman kaydedilemedi");
        return;
      }
      toast.success("Doküman güncellendi");
      return;
    }
    const gecici = geciciId();
    setListe((l) => [...l, { ...f, id: gecici, cariId }]);
    const res = await cariDokumanKaydet({ ...f, cariId });
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

  async function sil(d: CariDokuman) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== d.id));
    const res = await cariDokumanSil(d.id, cariId);
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
        cariId={cariId}
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

        {/* Diğer dokümanlar — satır listesi */}
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
            Bu cari için kayıtlı doküman yok.
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
  cariId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kayit: CariDokuman | null;
  cariId: string;
  onSave: (f: Omit<CariDokuman, "id" | "cariId">) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [dosya, setDosya] = React.useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const dosyaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setAd(kayit?.ad ?? "");
    setDosya(null);
    setYukleniyor(false);
  }, [open, kayit]);

  function dosyaSecildi(f: File | null) {
    setDosya(f);
    // Ad boşsa dosya adından öner (uzantısız).
    if (f && !ad.trim())
      setAd(f.name.replace(/\.[^.]+$/, ""));
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
        fd.append("klasor", `cari-${cariId}`);
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
    onSave({ ad: ad.trim(), url });
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
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
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
                Görsel, PDF, Office… en fazla 20 MB
              </span>
            </>
          )}
        </button>
        {kayit && !dosya && (
          <p className="text-xs text-muted-foreground">
            Mevcut dosya korunur; yalnızca adı değiştirebilirsiniz.
          </p>
        )}
        <IconInput
          label="Ad"
          icon={ScanTextIcon}
          placeholder="Örn. Vergi Levhası"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        {yukleniyor && (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        )}
      </div>
    </FormSheet>
  );
}
