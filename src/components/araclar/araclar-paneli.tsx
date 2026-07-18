"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TarihSecici } from "@/components/ui/tarih-secici";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { SekmeButonu } from "@/components/ui/sekme-butonu";
import { TabIcerik } from "@/components/ui/tab-icerik";
import { FormSheet } from "@/components/ui/form-sheet";
import { WrenchIcon } from "@/components/ui/icons/wrench";

/**
 * Araçlar paneli — küçük hesap yardımcıları.
 *
 * Ayrı sayfa DEĞİL, yandan açılan panel: bu hesaplar başka bir iş yapılırken
 * gerekiyor (alış fişi girerken KDV, reçete girerken m²). Ayrı sayfaya
 * gidilseydi formdaki veri kaybolurdu.
 */

export type AracSekme = "birim" | "termin" | "kdv" | "iskonto";

export const ARAC_SEKMELERI: { key: AracSekme; etiket: string }[] = [
  { key: "birim", etiket: "Birim" },
  { key: "termin", etiket: "Termin" },
  { key: "kdv", etiket: "KDV" },
  { key: "iskonto", etiket: "İskonto" },
];

/** Virgüllü girişi sayıya çevirir; boş/geçersizse null. */
function sayi(v: string): number | null {
  const t = v.replace(/\./g, "").replace(",", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const yaz = (n: number, hane = 2) =>
  n.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hane,
  });

export function AraclarPaneli({
  acik,
  onAcikDegis,
  sekme,
  onSekmeDegis,
}: {
  acik: boolean;
  onAcikDegis: (v: boolean) => void;
  /** Kontrollü sekme — pano kısayolu doğrudan bir araca açabilsin diye. */
  sekme: AracSekme;
  onSekmeDegis: (s: AracSekme) => void;
}) {

  return (
    <FormSheet
      open={acik}
      onOpenChange={onAcikDegis}
      title="Araçlar"
      icon={WrenchIcon}
      // Kaydetme yok; panel yalnız hesap yapar. footer={null} olmaz — FormSheet
      // `footer ?? varsayilan` kullanıyor, null varsayılan butonları geri getirir.
      footer={<></>}
      contentClassName="flex flex-col gap-4"
    >
      <div className="relative -mb-px flex flex-wrap gap-1 border-b">
        {ARAC_SEKMELERI.map((s) => (
          <SekmeButonu
            key={s.key}
            aktif={sekme === s.key}
            onClick={() => onSekmeDegis(s.key)}
            layoutId="araclarTabCizgi"
          >
            {s.etiket}
          </SekmeButonu>
        ))}
      </div>

      <TabIcerik tabKey={sekme}>
        {sekme === "birim" && <BirimCevirici />}
        {sekme === "termin" && <TerminHesabi />}
        {sekme === "kdv" && <KdvHesabi />}
        {sekme === "iskonto" && <IskontoHesabi />}
      </TabIcerik>
    </FormSheet>
  );
}

/** Sonuç satırı — etiket solda, değer sağda, tabular hizalı. */
function Sonuc({
  etiket,
  deger,
  vurgu,
}: {
  etiket: string;
  deger: string;
  vurgu?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{etiket}</span>
      <span
        className={cn(
          "tabular-nums",
          vurgu ? "text-base font-semibold" : "text-sm font-medium",
        )}
      >
        {deger}
      </span>
    </div>
  );
}

function Alan({
  etiket,
  children,
}: {
  etiket: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{etiket}</Label>
      {children}
    </div>
  );
}

/**
 * Levha ölçüsünden m² / adet dönüşümü.
 *
 * Stok birimleri karışık (levha kimi yerde adet, kimi yerde m²); m² fiyatını
 * adet fiyatı sanmak doğrudan yanlış maliyet demek, asıl amaç bunu önlemek.
 */
function BirimCevirici() {
  const [en, setEn] = React.useState("2100");
  const [boy, setBoy] = React.useState("2800");
  const [adet, setAdet] = React.useState("1");
  const [m2Fiyat, setM2Fiyat] = React.useState("");

  const e = sayi(en);
  const b = sayi(boy);
  const a = sayi(adet) ?? 1;
  const f = sayi(m2Fiyat);
  // Ölçüler mm cinsinden girilir; 1 m² = 1.000.000 mm².
  const m2 = e && b ? (e * b) / 1_000_000 : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="En (mm)">
          <Input inputMode="decimal" value={en} onChange={(x) => setEn(x.target.value)} />
        </Alan>
        <Alan etiket="Boy (mm)">
          <Input inputMode="decimal" value={boy} onChange={(x) => setBoy(x.target.value)} />
        </Alan>
      </div>
      <Alan etiket="Adet">
        <Input inputMode="decimal" value={adet} onChange={(x) => setAdet(x.target.value)} />
      </Alan>
      <Alan etiket="m² Fiyatı (ops.)">
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={m2Fiyat}
          onChange={(x) => setM2Fiyat(x.target.value)}
        />
      </Alan>

      {m2 != null && (
        <div className="rounded-md border bg-muted/30 px-3 py-1">
          <Sonuc etiket="Birim alan" deger={`${yaz(m2, 4)} m²`} />
          <Sonuc etiket={`${yaz(a)} adet toplam`} deger={`${yaz(m2 * a, 3)} m²`} vurgu />
          {f != null && (
            <>
              <Sonuc etiket="Adet fiyatı" deger={`₺${yaz(m2 * f)}`} />
              <Sonuc etiket="Toplam" deger={`₺${yaz(m2 * a * f)}`} vurgu />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Termin hesabı — tedarik süresi gün olarak verilir, teslim tarihi çıkar.
 *
 * NOT: yalnız hafta sonu düşülür; resmi tatil takvimi projede yok, olsaydı
 * buraya bağlanırdı. "İş günü" sonucu bu yüzden tatilleri saymaz.
 */
function TerminHesabi() {
  const bugun = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [baslangic, setBaslangic] = React.useState(bugun);
  const [gun, setGun] = React.useState("15");
  const [tur, setTur] = React.useState("İş günü");

  const g = sayi(gun);
  const sonuc = React.useMemo(() => {
    if (g == null || !baslangic) return null;
    const d = new Date(`${baslangic}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    if (tur === "Takvim günü") {
      d.setDate(d.getDate() + g);
      return d;
    }
    let kalan = Math.trunc(g);
    while (kalan > 0) {
      d.setDate(d.getDate() + 1);
      const h = d.getDay(); // 0 Pazar, 6 Cumartesi
      if (h !== 0 && h !== 6) kalan--;
    }
    return d;
  }, [baslangic, g, tur]);

  const fark =
    sonuc && baslangic
      ? Math.round(
          (sonuc.getTime() - new Date(`${baslangic}T00:00:00`).getTime()) /
            86_400_000,
        )
      : null;

  return (
    <div className="flex flex-col gap-3">
      <Alan etiket="Başlangıç">
        <TarihSecici
          deger={baslangic}
          onChange={setBaslangic}
          temizlenebilir={false}
        />
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Süre">
          <Input inputMode="numeric" value={gun} onChange={(x) => setGun(x.target.value)} />
        </Alan>
        <Alan etiket="Tür">
          <SearchSelect
            items={["İş günü", "Takvim günü"]}
            value={tur}
            onValueChange={(v) => setTur(v || "İş günü")}
          />
        </Alan>
      </div>

      {sonuc && (
        <div className="rounded-md border bg-muted/30 px-3 py-1">
          <Sonuc
            etiket="Teslim tarihi"
            deger={sonuc.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              weekday: "long",
            })}
            vurgu
          />
          {fark != null && (
            <Sonuc etiket="Takvim günü olarak" deger={`${fark} gün`} />
          )}
          {tur === "İş günü" && (
            <p className="py-1.5 text-xs text-muted-foreground">
              Hafta sonu düşülür; resmi tatiller hesaba katılmaz.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** KDV dahil ↔ hariç. Girilen tutarın hangisi olduğu seçilir. */
function KdvHesabi() {
  const [tutar, setTutar] = React.useState("");
  const [oran, setOran] = React.useState("20");
  const [tip, setTip] = React.useState("Hariç (KDV ekle)");

  const t = sayi(tutar);
  const o = sayi(oran) ?? 0;
  const haric = t == null ? null : tip.startsWith("Hariç") ? t : t / (1 + o / 100);
  const kdv = haric == null ? null : haric * (o / 100);
  const dahil = haric == null || kdv == null ? null : haric + kdv;

  return (
    <div className="flex flex-col gap-3">
      <Alan etiket="Tutar">
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={tutar}
          onChange={(x) => setTutar(x.target.value)}
        />
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Girilen tutar">
          <SearchSelect
            items={["Hariç (KDV ekle)", "Dahil (KDV ayır)"]}
            value={tip}
            onValueChange={(v) => setTip(v || "Hariç (KDV ekle)")}
          />
        </Alan>
        <Alan etiket="Oran (%)">
          <SearchSelect
            items={["20", "10", "1", "0"]}
            value={oran}
            onValueChange={(v) => setOran(v || "20")}
          />
        </Alan>
      </div>

      {haric != null && kdv != null && dahil != null && (
        <div className="rounded-md border bg-muted/30 px-3 py-1">
          <Sonuc etiket="KDV hariç" deger={`₺${yaz(haric)}`} />
          <Sonuc etiket={`KDV (%${yaz(o)})`} deger={`₺${yaz(kdv)}`} />
          <Sonuc etiket="KDV dahil" deger={`₺${yaz(dahil)}`} vurgu />
        </div>
      )}
    </div>
  );
}

/**
 * Kademeli iskonto — "%15+%5+%2" gibi zinciri tek orana indirger.
 *
 * Kademeler ÇARPILARAK uygulanır (her biri kalan tutara), toplanarak değil:
 * %15+%5 toplamda %20 değil %19,25 eder. Tedarikçi pazarlığında sık
 * karıştırılan nokta bu.
 */
function IskontoHesabi() {
  const [tutar, setTutar] = React.useState("");
  const [zincir, setZincir] = React.useState("15+5");

  const t = sayi(tutar);
  const kademeler = zincir
    .split(/[+,;\s]+/)
    .map((x) => sayi(x.replace("%", "")))
    .filter((x): x is number => x != null);

  const kalanOran = kademeler.reduce((k, o) => k * (1 - o / 100), 1);
  const toplamIskonto = (1 - kalanOran) * 100;
  const net = t != null ? t * kalanOran : null;

  return (
    <div className="flex flex-col gap-3">
      <Alan etiket="Liste fiyatı">
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={tutar}
          onChange={(x) => setTutar(x.target.value)}
        />
      </Alan>
      <Alan etiket="İskonto kademeleri (%)">
        <Input
          placeholder="15+5+2"
          value={zincir}
          onChange={(x) => setZincir(x.target.value)}
        />
      </Alan>

      {kademeler.length > 0 && (
        <div className="rounded-md border bg-muted/30 px-3 py-1">
          <Sonuc
            etiket="Kademeler"
            deger={kademeler.map((k) => `%${yaz(k)}`).join(" + ")}
          />
          <Sonuc etiket="Bileşik iskonto" deger={`%${yaz(toplamIskonto)}`} vurgu />
          {kademeler.length > 1 && (
            <p className="py-1.5 text-xs text-muted-foreground">
              Kademeler çarpılarak uygulanır; düz toplam %
              {yaz(kademeler.reduce((a, b) => a + b, 0))} olurdu.
            </p>
          )}
          {net != null && t != null && (
            <>
              <Sonuc etiket="İskonto tutarı" deger={`₺${yaz(t - net)}`} />
              <Sonuc etiket="Net fiyat" deger={`₺${yaz(net)}`} vurgu />
            </>
          )}
        </div>
      )}
    </div>
  );
}
