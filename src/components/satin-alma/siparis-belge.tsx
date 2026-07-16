"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MessageCircle,
  Printer,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FormSheet } from "@/components/ui/form-sheet";
import {
  formatTL,
  formatTarih,
  type Cari,
  type Depo,
  type SatinAlmaSiparis,
} from "@/lib/data";
import { siparisMailIsaretle } from "@/lib/db/actions";

const DURUM_RENK: Record<SatinAlmaSiparis["durum"], string> = {
  Açık: "bg-blue-100 text-blue-800",
  Kısmi: "bg-amber-100 text-amber-800",
  Kapandı: "bg-emerald-100 text-emerald-800",
};

/** Tedarikçiye gidecek sipariş metni (mail gövdesi / WhatsApp mesajı). */
function siparisMetni(siparis: SatinAlmaSiparis, cari: Cari | null) {
  return [
    `Sayın ${cari?.yetkili ?? siparis.cariAd},`,
    "",
    `${formatTarih(siparis.tarih)} tarihli ${siparis.id} numaralı siparişimiz aşağıdadır.`,
    "",
    ...siparis.kalemler.map(
      (k) =>
        `• ${k.malzemeAd} — ${k.miktar.toLocaleString("tr-TR")} ${k.birim}${
          k.fiyat ? ` × ${formatTL(k.fiyat)}` : ""
        }`,
    ),
    "",
    `Genel toplam: ${formatTL(siparis.toplam)}`,
    ...(siparis.notlar ? ["", `Not: ${siparis.notlar}`] : []),
    "",
    "Teyidinizi rica ederiz.",
    "MobilyumPro Satın Alma",
  ].join("\n");
}

/** TR telefonu WhatsApp formatına çevirir: "0 (212) 410 20 30" → 902124102030.
 *  Çözemezse null döner (kullanıcı elle düzeltir). */
function whatsappNo(ham?: string): string | null {
  const d = (ham ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 11) return `90${d.slice(1)}`;
  if (d.length === 10) return `90${d}`;
  return d.length >= 10 ? d : null;
}

/** Belgedeki başlık + değer satırı. */
function Alan({ etiket, deger }: { etiket: string; deger?: string }) {
  if (!deger) return null;
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="w-24 shrink-0 text-muted-foreground">{etiket}</span>
      <span className="min-w-0 font-medium">{deger}</span>
    </div>
  );
}

export function SiparisBelge({
  siparis,
  cari,
  depo,
}: {
  siparis: SatinAlmaSiparis;
  cari: Cari | null;
  depo: Depo | null;
}) {
  const router = useRouter();
  const [mailAcik, setMailAcik] = React.useState(false);
  const [whatsappAcik, setWhatsappAcik] = React.useState(false);

  const adres = [cari?.adres, cari?.semt, cari?.sehir, cari?.ulke]
    .filter(Boolean)
    .join(" · ");
  const teslim = depo ? `${depo.ad} — ${depo.sehir}` : (siparis.depo ?? "—");

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Araç çubuğu — çıktıda görünmez */}
      <div className="yazdir-gizle flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-4" /> Geri
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {siparis.id}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {siparis.cariAd}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/satin-alma/talepler"
                className="underline-offset-2 hover:underline"
              >
                {siparis.talepId}
              </Link>{" "}
              talebinden · {formatTarih(siparis.tarih)}
              {siparis.mailTarihi &&
                ` · mail gönderildi ${formatTarih(siparis.mailTarihi.slice(0, 10))}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={DURUM_RENK[siparis.durum]}>
            {siparis.durum}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setWhatsappAcik(true)}>
            <MessageCircle className="size-3.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMailAcik(true)}>
            <Mail className="size-3.5" /> Mail Gönder
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Yazdır
          </Button>
        </div>
      </div>

      {/* ── Belge (yazdırılan alan) ── */}
      <div className="yazdir-alan mx-auto w-full max-w-3xl rounded-md border bg-card p-8">
        {/* Başlık: bizim firma + belge künyesi */}
        <div className="flex items-start justify-between gap-6 border-b pb-5">
          <div>
            <p className="text-xl font-bold tracking-tight">MobilyumPro</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mobilya Fabrikası
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold">SATIN ALMA SİPARİŞİ</p>
            <p className="mt-1 font-mono text-sm">{siparis.id}</p>
            <p className="text-xs text-muted-foreground">
              {formatTarih(siparis.tarih)}
            </p>
          </div>
        </div>

        {/* Taraflar */}
        <div className="grid gap-6 border-b py-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
              Tedarikçi
            </p>
            <p className="text-sm font-semibold">
              {cari?.unvan || cari?.tamAd || siparis.cariAd}
            </p>
            <div className="mt-1.5 flex flex-col gap-0.5">
              <Alan etiket="Yetkili" deger={cari?.yetkili} />
              <Alan
                etiket="Telefon"
                deger={cari?.telefon ?? cari?.yetkiliTelefon}
              />
              <Alan etiket="E-posta" deger={cari?.email ?? cari?.yetkiliEmail} />
              <Alan etiket="Adres" deger={adres || undefined} />
              <Alan
                etiket="Vergi No"
                deger={
                  cari?.vergiNo
                    ? `${cari.vergiNo}${cari.vergiDairesi ? ` / ${cari.vergiDairesi}` : ""}`
                    : undefined
                }
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
              Teslimat
            </p>
            <div className="flex flex-col gap-0.5">
              <Alan etiket="Teslim yeri" deger={teslim} />
              <Alan etiket="Talep no" deger={siparis.talepId} />
              <Alan etiket="Sipariş veren" deger={siparis.olusturanAd} />
            </div>
          </div>
        </div>

        {/* Kalemler */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
              <th className="w-8 py-2 text-left font-semibold">#</th>
              <th className="py-2 text-left font-semibold">Malzeme</th>
              <th className="py-2 text-right font-semibold">Miktar</th>
              <th className="py-2 text-right font-semibold">Birim Fiyat</th>
              <th className="py-2 text-right font-semibold">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {siparis.kalemler.map((k, i) => (
              <tr key={`${k.malzemeId}-${i}`} className="border-b last:border-0">
                <td className="py-2.5 text-muted-foreground tabular-nums">
                  {i + 1}
                </td>
                <td className="py-2.5">
                  <p className="font-medium">{k.malzemeAd}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {k.malzemeId}
                  </p>
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {k.miktar.toLocaleString("tr-TR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs text-muted-foreground">
                    {k.birim}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {k.fiyat ? formatTL(k.fiyat) : "—"}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {formatTL(k.miktar * (k.fiyat ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Toplam */}
        <div className="mt-4 flex justify-end border-t pt-4">
          <div className="flex w-56 items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground">Genel Toplam</span>
            <span className="text-lg font-bold tabular-nums">
              {formatTL(siparis.toplam)}
            </span>
          </div>
        </div>

        {siparis.notlar && (
          <div className="mt-5 rounded-md border bg-muted/30 p-3">
            <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
              Not
            </p>
            <p className="text-xs whitespace-pre-wrap">{siparis.notlar}</p>
          </div>
        )}

        {/* İmza alanları */}
        <div className="mt-10 grid grid-cols-2 gap-10">
          {["Sipariş Veren", "Tedarikçi Onayı"].map((t) => (
            <div key={t}>
              <div className="h-12 border-b" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">{t}</p>
            </div>
          ))}
        </div>
      </div>

      <WhatsAppPaneli
        acik={whatsappAcik}
        onKapat={() => setWhatsappAcik(false)}
        siparis={siparis}
        cari={cari}
      />

      <MailPaneli
        acik={mailAcik}
        onKapat={() => setMailAcik(false)}
        siparis={siparis}
        cari={cari}
        onIsaretlendi={() => {
          setMailAcik(false);
          router.refresh();
        }}
      />
    </div>
  );
}

/** WhatsApp paneli — wa.me linkiyle hazır mesajı açar.
 *  Gönderimi kullanıcı WhatsApp'ta kendisi onaylar; buradan mesaj gitmez. */
function WhatsAppPaneli({
  acik,
  onKapat,
  siparis,
  cari,
}: {
  acik: boolean;
  onKapat: () => void;
  siparis: SatinAlmaSiparis;
  cari: Cari | null;
}) {
  const kartNo = cari?.telefon ?? cari?.yetkiliTelefon;
  const [no, setNo] = React.useState(whatsappNo(kartNo) ?? "");
  const [mesaj, setMesaj] = React.useState(() => siparisMetni(siparis, cari));
  const gecerli = whatsappNo(no) !== null;

  function ac() {
    const hedef = whatsappNo(no);
    if (!hedef) return;
    window.open(
      `https://wa.me/${hedef}?text=${encodeURIComponent(mesaj)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <FormSheet
      open={acik}
      onOpenChange={(o) => !o && onKapat()}
      title={`WhatsApp — ${siparis.cariAd}`}
      sheetClassName="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-2 border-t p-4">
          <Button size="sm" variant="outline" onClick={onKapat}>
            Kapat
          </Button>
          <Button size="sm" disabled={!gecerli} onClick={ac}>
            <ExternalLink className="size-3.5" /> WhatsApp&apos;ta Aç
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Telefon
          </span>
          <Input
            value={no}
            onChange={(e) => setNo(e.target.value)}
            placeholder="905321234567"
            className={cn("tabular-nums", !gecerli && "ring-1 ring-amber-300")}
          />
          <span className="text-[11px] text-muted-foreground">
            {kartNo
              ? `Cari karttan: ${kartNo}`
              : `${siparis.cariAd} cari kartında telefon kayıtlı değil.`}
            {" "}Ülke koduyla yazın (90...).
          </span>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Mesaj
          </span>
          <Textarea
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
        </label>
        <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Mesaj WhatsApp&apos;ta hazır açılır, gönderimi siz onaylarsınız.
          WhatsApp linki dosya eklemeye izin vermez; sipariş kalemleri mesaj
          metnine yazılır. Belgeyi PDF olarak göndermek isterseniz Yazdır ile
          kaydedip WhatsApp&apos;tan ekleyebilirsiniz.
        </p>
      </div>
    </FormSheet>
  );
}

/** Mail önizleme paneli. Gönderim altyapısı henüz yok — şimdilik yalnız
 *  içeriği hazırlar ve "gönderildi" işaretler.
 *  TODO: mail altyapısı gelince gerçek gönderim buraya bağlanacak. */
function MailPaneli({
  acik,
  onKapat,
  siparis,
  cari,
  onIsaretlendi,
}: {
  acik: boolean;
  onKapat: () => void;
  siparis: SatinAlmaSiparis;
  cari: Cari | null;
  onIsaretlendi: () => void;
}) {
  const varsayilanAlici = cari?.email ?? cari?.yetkiliEmail ?? "";
  const [alici, setAlici] = React.useState(varsayilanAlici);
  const [konu, setKonu] = React.useState(
    `${siparis.id} · Satın Alma Siparişi — MobilyumPro`,
  );
  const [govde, setGovde] = React.useState(() => siparisMetni(siparis, cari));
  const [mesgul, setMesgul] = React.useState(false);

  async function isaretle() {
    setMesgul(true);
    const res = await siparisMailIsaretle(siparis.id);
    setMesgul(false);
    if (!res.ok) {
      toast.error(res.error ?? "İşaretlenemedi.");
      return;
    }
    toast.success("Gönderildi olarak işaretlendi");
    onIsaretlendi();
  }

  return (
    <FormSheet
      open={acik}
      onOpenChange={(o) => !o && onKapat()}
      title={`Mail Gönder — ${siparis.cariAd}`}
      sheetClassName="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-2 border-t p-4">
          <Button size="sm" variant="outline" onClick={onKapat}>
            Kapat
          </Button>
          <Button
            size="sm"
            disabled
            title="Mail altyapısı henüz hazır değil"
            className={cn("cursor-not-allowed")}
          >
            <Send className="size-3.5" /> Gönder
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Alıcı
          </span>
          <Input
            value={alici}
            onChange={(e) => setAlici(e.target.value)}
            placeholder={
              varsayilanAlici ? undefined : "Cari kartında e-posta yok"
            }
            className={cn(!alici && "ring-1 ring-amber-300")}
          />
          {!varsayilanAlici && (
            <span className="text-[11px] text-amber-700">
              {siparis.cariAd} cari kartında e-posta kayıtlı değil.
            </span>
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Konu</span>
          <Input value={konu} onChange={(e) => setKonu(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Mesaj
          </span>
          <Textarea
            value={govde}
            onChange={(e) => setGovde(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />
        </label>
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Gönderim aktif olunca sipariş çıktısı PDF olarak eklenecek. Maili
          şimdilik dışarıdan attıysanız aşağıdan işaretleyebilirsiniz.
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={mesgul}
              onClick={isaretle}
            >
              <Mail className="size-3.5" />
              {siparis.mailTarihi
                ? "Yeniden gönderildi işaretle"
                : "Gönderildi olarak işaretle"}
            </Button>
          </div>
        </div>
      </div>
    </FormSheet>
  );
}
