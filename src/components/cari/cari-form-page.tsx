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
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NestedCard } from "@/components/ui/nested-card";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { YeniIslemSheet } from "@/components/cari/yeni-islem-sheet";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
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
import {
  cariIslemleri as TUM_ISLEMLER,
  formatTL,
  formatTarih,
  type Cari,
  type CariIslem,
  type CariIslemTuru,
  type CariSinifi,
  type CariTip,
  type ParaBirimi,
} from "@/lib/data";

const TIPLER: CariTip[] = ["Müşteri", "Tedarikçi", "Her İkisi"];
const SINIFLAR: CariSinifi[] = ["Bireysel", "Kurumsal"];
const PARA_BIRIMLERI: ParaBirimi[] = ["TL", "USD", "EUR"];
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
  tip: CariTip;
  sinif: CariSinifi;
  vergiNo: string;
  vergiDairesi: string;
  telefon: string;
  email: string;
  adres: string;
  sehir: string;
  paraBirimi: ParaBirimi;
  durum: "Aktif" | "Pasif";
  not: string;
};

const bos: Form = {
  id: "",
  ad: "",
  tip: "Müşteri",
  sinif: "Bireysel",
  vergiNo: "",
  vergiDairesi: "",
  telefon: "",
  email: "",
  adres: "",
  sehir: "",
  paraBirimi: "TL",
  durum: "Aktif",
  not: "",
};

type Tab = "islemler" | "bilgiler";

export function CariFormPage({ cari }: { cari?: Cari } = {}) {
  const router = useRouter();
  const duzenleme = !!cari;
  const baslangic: Form = cari
    ? {
        id: cari.id,
        ad: cari.ad,
        tip: cari.tip,
        sinif: cari.sinif,
        vergiNo: cari.vergiNo ?? "",
        vergiDairesi: cari.vergiDairesi ?? "",
        telefon: cari.telefon ?? "",
        email: cari.email ?? "",
        adres: cari.adres ?? "",
        sehir: cari.sehir ?? "",
        paraBirimi: cari.paraBirimi,
        durum: cari.durum,
        not: cari.not ?? "",
      }
    : bos;
  const [form, setForm] = React.useState<Form>(baslangic);
  // Yeni cari eklerken sekme yok → her zaman "bilgiler"; düzenlemede varsayılan "islemler"
  const [tab, setTab] = React.useState<Tab>(duzenleme ? "islemler" : "bilgiler");
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  // Mevcut cari'nin işlemleri (state — kullanıcı yeni işlem ekleyebilir)
  const [islemler, setIslemler] = React.useState<CariIslem[]>(
    cari ? TUM_ISLEMLER.filter((i) => i.cariId === cari.id) : [],
  );

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

  const sonBakiye =
    islemlerWithBakiye[0]?.bakiye ?? cari?.bakiye ?? 0;

  const paraBirimi = cari?.paraBirimi ?? "TL";
  const onPara = React.useCallback(
    (n: number) => {
      if (paraBirimi === "TL") return formatTL(n);
      return `${n.toLocaleString("tr-TR")} ${paraBirimi}`;
    },
    [paraBirimi],
  );

  // Özetler
  const ozet = React.useMemo(() => {
    let tahsilat = 0;
    let odeme = 0;
    let borc = 0;
    let alacak = 0;
    for (const i of islemler) {
      if (i.tur === "Tahsilat") tahsilat += i.tutar;
      else if (i.tur === "Ödeme") odeme += i.tutar;
      else if (i.tur === "Borç") borc += i.tutar;
      else alacak += i.tutar;
    }
    return { tahsilat, odeme, borc, alacak };
  }, [islemler]);

  function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Ad / Unvan gerekli");
      setTab("bilgiler");
      return;
    }
    if (kurumsal && !form.vergiNo.trim()) {
      toast.error("Kurumsal cari için vergi numarası gerekli");
      setTab("bilgiler");
      return;
    }
    toast.success(
      duzenleme ? "Cari güncellendi (demo)" : "Cari eklendi (demo)",
    );
    router.push("/cari");
  }

  function islemEkle(yeni: Omit<CariIslem, "id" | "cariId">) {
    if (!cari) return;
    const islem: CariIslem = {
      id: `CI-${Math.floor(3000 + Math.random() * 7000)}`,
      cariId: cari.id,
      ...yeni,
    };
    setIslemler((arr) => [islem, ...arr]);
    toast.success("İşlem eklendi");
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

      {/* Sekmeler — sadece düzenlemede */}
      {duzenleme && (
        <div className="flex gap-1 border-b">
          <TabBtn aktif={tab === "islemler"} onClick={() => setTab("islemler")}>
            Cari İşlemler
          </TabBtn>
          <TabBtn aktif={tab === "bilgiler"} onClick={() => setTab("bilgiler")}>
            Bilgiler
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

      {(tab === "bilgiler" || !duzenleme) && (
        <BilgilerTab
          form={form}
          setForm={setForm}
          set={set}
          kurumsal={kurumsal}
          durumRef={durumRef}
        />
      )}

      {/* Bilgi formu altında kaydet bar — sadece bilgiler sekmesinde */}
      {(tab === "bilgiler" || !duzenleme) && (
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
/* BİLGİLER SEKMESİ                                                   */
/* ------------------------------------------------------------------ */
function BilgilerTab({
  form,
  setForm,
  set,
  kurumsal,
  durumRef,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  set: (k: keyof Form) => (v: string) => void;
  kurumsal: boolean;
  durumRef: React.RefObject<AnimatedIconHandle | null>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Sol: Genel bilgiler */}
      <div className="lg:col-span-2">
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Genel Bilgiler</span>
          </div>
          <div className="grid gap-3 p-4">
            <IconInput
              label="Ad / Unvan"
              icon={UsersRoundIcon}
              placeholder={
                kurumsal ? "Örn. Mobilyum Ticaret Ltd. Şti." : "Ad Soyad"
              }
              value={form.ad}
              onChange={(e) => set("ad")(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <IconInput
                label="Kod"
                icon={ScanTextIcon}
                placeholder="CARI-0000"
                value={form.id}
                onChange={(e) => set("id")(e.target.value)}
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
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {kurumsal && (
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
            )}

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
          </div>
        </div>
      </div>

      {/* Sağ: İletişim + Not */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">İletişim</span>
          </div>
          <div className="grid gap-3 p-4">
            <IconInput
              label="Telefon"
              icon={SendIcon}
              placeholder="0532 000 00 00"
              value={form.telefon}
              onChange={(e) => set("telefon")(e.target.value)}
            />
            <IconInput
              label="E-posta"
              icon={SendIcon}
              placeholder="ornek@firma.com"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
            <IconInput
              label="Şehir"
              icon={BlocksIcon}
              placeholder="Örn. İstanbul"
              value={form.sehir}
              onChange={(e) => set("sehir")(e.target.value)}
            />
            <AnimatedField label="Adres" icon={BlocksIcon}>
              <textarea
                rows={2}
                placeholder="Mahalle, sokak, no..."
                value={form.adres}
                onChange={(e) => set("adres")(e.target.value)}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </AnimatedField>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Not</span>
          </div>
          <div className="p-4">
            <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
              <textarea
                rows={3}
                placeholder="Cari ile ilgili özel notlar..."
                value={form.not}
                onChange={(e) => set("not")(e.target.value)}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </AnimatedField>
          </div>
        </div>
      </div>
    </div>
  );
}
