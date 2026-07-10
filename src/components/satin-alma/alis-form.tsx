"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  X,
  ReceiptText,
  PackagePlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { KartBaslik } from "@/components/ui/kart-baslik";
import { formatTL, type Malzeme } from "@/lib/data";
import { alisKaydet } from "@/lib/db/actions";

/**
 * Yeni alış formu — fiş bilgileri kartı + hızlı malzeme ekleme + zengin
 * satırlar (mevcut stok / son alış fiyatı) + sağda özet.
 * Kaydet tek transaction'da stok girişi + stok hareketi + cari Alacak işler.
 */
type Satir = {
  malzemeId: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  /** Malzemenin son (kayıtlı) alış fiyatı — karşılaştırma için. */
  sonFiyat: number;
  /** Malzemenin mevcut stoğu — bilgi. */
  mevcutStok: number;
};

const bugun = () => new Date().toISOString().slice(0, 10);

function Alan({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AlisForm({
  tedarikciler,
  malzemeler,
  depolar,
}: {
  tedarikciler: { id: string; ad: string }[];
  malzemeler: Malzeme[];
  depolar: string[];
}) {
  const router = useRouter();

  const [cariId, setCariId] = React.useState("");
  const [tarih, setTarih] = React.useState(bugun);
  const [depo, setDepo] = React.useState(depolar[0] ?? "");
  const [belgeNo, setBelgeNo] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");
  const [satirlar, setSatirlar] = React.useState<Satir[]>([]);
  const [fiyatGuncelle, setFiyatGuncelle] = React.useState(true);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  // Hızlı ekleme etiketi: "Ad · birim · stok X · ₺fiyat".
  const araEtiket = (m: Malzeme) =>
    `${m.ad} · ${m.birim} · stok ${m.stok} · ${formatTL(m.birimFiyat)}`;
  const etiketMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [araEtiket(m), m])),
    [malzemeler],
  );

  const cari = tedarikciler.find((t) => t.id === cariId);

  // ── Özet ──────────────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  const satirTutari = (s: Satir) => s.miktar * s.birimFiyat;
  const toplam = gecerli.reduce((t, s) => t + satirTutari(s), 0);
  const toplamMiktar = gecerli.reduce((t, s) => t + s.miktar, 0);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function malzemeEkle(m: Malzeme) {
    setSatirlar((s) => [
      ...s,
      {
        malzemeId: m.id,
        miktar: 1,
        birim: m.birim,
        birimFiyat: m.birimFiyat,
        sonFiyat: m.birimFiyat,
        mevcutStok: m.stok,
      },
    ]);
  }
  function satirGuncelle(i: number, degisim: Partial<Satir>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  async function kaydet() {
    if (!cari) {
      toast.error("Tedarikçi seçin");
      return;
    }
    if (gecerli.length === 0) {
      toast.error("En az bir malzeme satırı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await alisKaydet({
      cariId: cari.id,
      cariAd: cari.ad,
      tarih,
      depo,
      belgeNo: belgeNo.trim() || undefined,
      aciklama: aciklama.trim() || undefined,
      satirlar: gecerli.map((s) => ({
        malzemeId: s.malzemeId,
        malzemeAd: malzemeMap.get(s.malzemeId)?.ad ?? s.malzemeId,
        miktar: s.miktar,
        birim: s.birim,
        birimFiyat: s.birimFiyat,
      })),
      fiyatGuncelle,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Alış kaydedilemedi.");
      return;
    }
    toast.success(
      `Alış kaydedildi (${res.id}) — stok girişi ve cari işlemi oluşturuldu`,
    );
    router.push("/satin-alma");
  }

  const aktifMalzemeler = malzemeler.filter((m) => m.durum === "Aktif");

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit — geri + Kaydet */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/satin-alma" aria-label="Satın almalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">Yeni Alış</span>
        <Button
          className="ml-auto"
          onClick={kaydet}
          disabled={!cari || gecerli.length === 0 || kaydediliyor}
        >
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: fiş bilgileri + satırlar ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Fiş bilgileri */}
          <div className="rounded-md border bg-card">
            <KartBaslik ikon={ReceiptText} baslik="Fiş Bilgileri" />
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <Alan label="Tedarikçi">
                <SearchSelect
                  items={tedarikciler.map((t) => t.ad)}
                  value={cari?.ad ?? null}
                  onValueChange={(ad) =>
                    setCariId(tedarikciler.find((t) => t.ad === ad)?.id ?? "")
                  }
                  placeholder="Tedarikçi seçin"
                  emptyText="Tedarikçi tipli cari yok"
                />
              </Alan>
              <Alan label="Tarih">
                <Input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                />
              </Alan>
              <Alan label="Depo">
                <SearchSelect
                  items={depolar}
                  value={depo || null}
                  onValueChange={(v) => setDepo(v ?? "")}
                  placeholder="Depo"
                />
              </Alan>
              <Alan label="Belge No">
                <Input
                  placeholder="Fatura/irsaliye (ops.)"
                  value={belgeNo}
                  onChange={(e) => setBelgeNo(e.target.value)}
                />
              </Alan>
            </div>
          </div>

          {/* Satırlar */}
          <div className="overflow-hidden rounded-md border bg-card">
            <KartBaslik
              ikon={PackagePlus}
              baslik="Malzemeler"
              sag={
                <span className="text-xs text-muted-foreground">
                  {gecerli.length} kalem
                </span>
              }
            />
            {/* Hızlı ekleme */}
            <div className="border-b bg-muted/30 p-2.5">
              <SearchSelect
                items={aktifMalzemeler.map(araEtiket)}
                value={null}
                onValueChange={(secim) => {
                  const m = secim ? etiketMap.get(secim) : undefined;
                  if (m) malzemeEkle(m);
                }}
                placeholder="Malzeme ara ve ekle…"
                emptyText="Malzeme bulunamadı"
              />
            </div>

            {satirlar.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Yukarıdaki kutudan malzeme aratıp ekleyin.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_84px_96px_110px_36px] items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <span>Malzeme</span>
                  <span className="text-right">Miktar</span>
                  <span className="text-right">Birim Fiyat</span>
                  <span className="text-right">Tutar</span>
                  <span />
                </div>
                <div className="divide-y">
                  {satirlar.map((s, i) => {
                    const m = malzemeMap.get(s.malzemeId);
                    const fark = s.birimFiyat - s.sonFiyat;
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_84px_96px_110px_36px] items-center gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {m?.ad ?? s.malzemeId}
                          </div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            stok {s.mevcutStok} {s.birim} · son{" "}
                            {formatTL(s.sonFiyat)}
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={s.miktar}
                          onChange={(e) =>
                            satirGuncelle(i, { miktar: Number(e.target.value) })
                          }
                          className="h-8 text-right tabular-nums"
                        />
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={s.birimFiyat}
                            onChange={(e) =>
                              satirGuncelle(i, {
                                birimFiyat: Number(e.target.value),
                              })
                            }
                            className="h-8 pr-5 text-right tabular-nums"
                          />
                          {Math.abs(fark) > 0.005 && (
                            <span
                              className={cn(
                                "absolute top-1/2 right-1.5 -translate-y-1/2",
                                fark > 0 ? "text-rose-500" : "text-emerald-600",
                              )}
                              title={`Son alışa göre ${fark > 0 ? "pahalı" : "ucuz"}: ${formatTL(Math.abs(fark))}`}
                            >
                              {fark > 0 ? (
                                <TrendingUp className="size-3.5" />
                              ) : (
                                <TrendingDown className="size-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        <span className="text-right text-sm font-medium tabular-nums">
                          {formatTL(satirTutari(s))}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Satırı kaldır"
                          onClick={() =>
                            setSatirlar((x) => x.filter((_, j) => j !== i))
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Sağ: özet ── */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Alış Özeti
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatTL(toplam)}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kalem sayısı</span>
                <span className="tabular-nums">{gecerli.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toplam miktar</span>
                <span className="tabular-nums">{toplamMiktar}</span>
              </div>
            </div>
            <div className="my-3 h-px bg-border" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFiyatGuncelle((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFiyatGuncelle((v) => !v);
                }
              }}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Birim fiyatları güncelle
                </span>
                <span className="text-xs text-muted-foreground">
                  Satır fiyatı malzemenin birim fiyatına yazılır (son alış).
                </span>
              </span>
              <Switch
                checked={fiyatGuncelle}
                className="pointer-events-none mt-0.5 shrink-0 data-checked:bg-emerald-600"
              />
            </div>
            <div className="mt-3">
              <Textarea
                placeholder="Açıklama (opsiyonel)"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
