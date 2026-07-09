"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { formatTL, type Malzeme } from "@/lib/data";
import { alisKaydet } from "@/lib/db/actions";

/**
 * Yeni alış formu — poset-form yerleşimiyle birebir aynı desen: üst şerit
 * (geri + tedarikçi + tarih + depo + belge no + Kaydet), solda satır grid'i
 * (#fafafa başlık + alt ekleme şeridi), sağda alış özeti.
 *
 * Kaydet tek transaction'da stok girişi + stok hareketi + cari Alacak işler
 * (src/lib/db/actions.ts → alisKaydet).
 */
type Satir = {
  malzemeId: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
};

const bugun = () => new Date().toISOString().slice(0, 10);

export function AlisForm({
  tedarikciler,
  malzemeler,
  depolar,
}: {
  /** Tedarikçi tipli cariler (Tedarikçi / Her İkisi). */
  tedarikciler: { id: string; ad: string }[];
  malzemeler: Malzeme[];
  /** Aktif depo adları. */
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
  // SearchSelect etiketi ("Ad · birim") ↔ malzeme eşlemesi.
  const etiket = (m: Malzeme) => `${m.ad} · ${m.birim}`;
  const etiketMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [etiket(m), m])),
    [malzemeler],
  );

  const cari = tedarikciler.find((t) => t.id === cariId);

  // ── Özet ──────────────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.malzemeId && s.miktar > 0);
  const satirTutari = (s: Satir) => s.miktar * s.birimFiyat;
  const toplam = gecerli.reduce((t, s) => t + satirTutari(s), 0);
  const toplamMiktar = gecerli.reduce((t, s) => t + s.miktar, 0);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function satirEkle() {
    setSatirlar((s) => [
      ...s,
      { malzemeId: "", miktar: 1, birim: "", birimFiyat: 0 },
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

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/satin-alma" aria-label="Satın almalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="w-64">
          <SearchSelect
            items={tedarikciler.map((t) => t.ad)}
            value={cari?.ad ?? null}
            onValueChange={(ad) =>
              setCariId(tedarikciler.find((t) => t.ad === ad)?.id ?? "")
            }
            placeholder="Tedarikçi seçin"
            emptyText="Tedarikçi tipli cari yok — Cari Hesaplar'dan ekleyin"
          />
        </div>
        <Input
          type="date"
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          className="w-40"
        />
        <div className="w-44">
          <SearchSelect
            items={depolar}
            value={depo || null}
            onValueChange={(v) => setDepo(v ?? "")}
            placeholder="Depo"
          />
        </div>
        <Input
          placeholder="Belge no (fatura/irsaliye, opsiyonel)"
          value={belgeNo}
          onChange={(e) => setBelgeNo(e.target.value)}
          className="min-w-56 flex-1"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={kaydet}
            disabled={!cari || gecerli.length === 0 || kaydediliyor}
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: satır grid'i ── */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="grid grid-cols-[1fr_90px_56px_100px_110px_36px] items-center gap-2 border-b bg-[#fafafa] px-3 py-2 text-xs font-medium text-foreground">
              <span>Malzeme</span>
              <span className="text-right">Miktar</span>
              <span>Birim</span>
              <span className="text-right">Birim Fiyat</span>
              <span className="text-right">Tutar</span>
              <span />
            </div>
            <div className="divide-y">
              {satirlar.map((s, i) => {
                const malzeme = s.malzemeId
                  ? malzemeMap.get(s.malzemeId)
                  : undefined;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_56px_100px_110px_36px] items-center gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      {/* Aynı malzeme birden çok satırda seçilebilir (farklı fiyat). */}
                      <SearchSelect
                        items={malzemeler
                          .filter((m) => m.durum === "Aktif")
                          .map(etiket)}
                        value={malzeme ? etiket(malzeme) : null}
                        onValueChange={(secim) => {
                          const ref = secim ? etiketMap.get(secim) : undefined;
                          satirGuncelle(i, {
                            malzemeId: ref?.id ?? "",
                            birim: ref?.birim ?? "",
                            birimFiyat: ref?.birimFiyat ?? 0,
                          });
                        }}
                        placeholder="Malzeme seçin"
                        className="h-8"
                      />
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
                    <span className="text-xs text-muted-foreground">
                      {s.birim || "—"}
                    </span>
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
                      className="h-8 text-right tabular-nums"
                    />
                    <span className="text-right text-xs text-muted-foreground tabular-nums">
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
              {satirlar.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Henüz satır yok — aşağıdan malzeme ekleyin.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 border-t bg-[#fafafa] px-3 py-2">
              <Button variant="outline" size="sm" onClick={satirEkle}>
                <Plus className="size-3.5" /> Satır ekle
              </Button>
            </div>
          </div>
        </div>

        {/* ── Sağ: özet kolonu ── */}
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
