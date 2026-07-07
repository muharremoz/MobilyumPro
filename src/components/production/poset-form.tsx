"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { formatTL, type Poset, type PosetSatiri, type Malzeme } from "@/lib/data";
import { posetKaydet } from "@/lib/db/actions";

/**
 * Poşet oluşturma/düzenleme — reçete detay sayfasıyla (recete-detay) birebir
 * aynı yerleşim: üst şerit (geri + ad + durum + açıklama + Kaydet), solda
 * bileşen grid'i (#fafafa başlık + alt ekleme şeridi), sağda maliyet özeti.
 */
export function PosetForm({
  poset,
  malzemeler,
}: {
  poset: Poset | null;
  malzemeler: Malzeme[];
}) {
  const router = useRouter();
  const yeniMi = poset === null;

  const [ad, setAd] = React.useState(poset?.ad ?? "");
  const [aciklama, setAciklama] = React.useState(poset?.aciklama ?? "");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">(
    poset?.durum ?? "Aktif",
  );
  const [satirlar, setSatirlar] = React.useState<PosetSatiri[]>(
    poset?.malzemeler.map((m) => ({ ...m })) ?? [],
  );
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );

  // ── Kirli takibi ──────────────────────────────────────────────────────
  const kirli = React.useMemo(() => {
    if (yeniMi) return ad.trim() !== "" || satirlar.length > 0;
    if (!poset) return false;
    if (
      ad !== poset.ad ||
      aciklama !== (poset.aciklama ?? "") ||
      durum !== poset.durum
    )
      return true;
    const key = (r: PosetSatiri[]) =>
      JSON.stringify(r.map((s) => [s.malzemeId, s.miktar]));
    return key(satirlar) !== key(poset.malzemeler);
  }, [ad, aciklama, durum, satirlar, poset, yeniMi]);

  // ── Maliyet özeti ─────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.malzemeId);
  const satirTutari = (s: PosetSatiri): number =>
    (malzemeMap.get(s.malzemeId)?.birimFiyat ?? 0) * s.miktar;
  const toplam = gecerli.reduce((t, s) => t + satirTutari(s), 0);
  const toplamAdet = gecerli.reduce((t, s) => t + s.miktar, 0);
  const enPahali = [...gecerli]
    .map((s) => ({ s, tutar: satirTutari(s) }))
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, 3);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function satirEkle() {
    setSatirlar((s) => [...s, { malzemeId: "", miktar: 1 }]);
  }
  function satirGuncelle(i: number, degisim: Partial<PosetSatiri>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  async function kaydet() {
    if (!ad.trim()) {
      toast.error("Poşet adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await posetKaydet({
      id: poset?.id ?? "",
      ad: ad.trim(),
      aciklama: aciklama.trim() || undefined,
      durum,
      malzemeler: gecerli,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Poşet kaydedildi");
    if (yeniMi) router.replace(`/uretim/poset/${res.id}`);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/uretim/poset" aria-label="Poşetlere dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          placeholder="Poşet adı"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          className="w-64 font-medium"
        />
        <div className="w-40">
          <SearchSelect
            items={["Aktif", "Pasif"]}
            value={durum}
            onValueChange={(v) => setDurum((v as "Aktif" | "Pasif") ?? "Aktif")}
            placeholder="Durum"
          />
        </div>
        <Input
          placeholder="Açıklama (opsiyonel)"
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          className="min-w-56 flex-1"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={kaydet} disabled={!kirli || kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: malzeme grid'i ── */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="grid grid-cols-[1fr_90px_56px_100px_36px] items-center gap-2 border-b bg-[#fafafa] px-3 py-2 text-xs font-medium text-foreground">
              <span>Malzeme</span>
              <span className="text-right">Miktar</span>
              <span>Birim</span>
              <span className="text-right">Tutar</span>
              <span />
            </div>
            <div className="divide-y">
              {satirlar.map((s, i) => {
                const malzeme = s.malzemeId
                  ? malzemeMap.get(s.malzemeId)
                  : undefined;
                const seciliBaskaIds = new Set(
                  satirlar
                    .filter((_, j) => j !== i)
                    .map((x) => x.malzemeId)
                    .filter(Boolean),
                );
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_56px_100px_36px] items-center gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <SearchSelect
                        items={malzemeler
                          .filter(
                            (m) =>
                              m.durum === "Aktif" && !seciliBaskaIds.has(m.id),
                          )
                          .map((m) => m.ad)}
                        value={malzeme?.ad ?? null}
                        onValueChange={(adSecim) => {
                          const ref = malzemeler.find(
                            (m) => m.ad === adSecim,
                          )?.id;
                          satirGuncelle(i, { malzemeId: ref ?? "" });
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
                      {malzeme?.birim ?? "—"}
                    </span>
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
                  Henüz malzeme yok — aşağıdan malzeme ekleyin.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 border-t bg-[#fafafa] px-3 py-2">
              <Button variant="outline" size="sm" onClick={satirEkle}>
                <Plus className="size-3.5" /> Malzeme
              </Button>
            </div>
          </div>
        </div>

        {/* ── Sağ: özet kolonu ── */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
          {/* Maliyet özeti */}
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Maliyet Özeti
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatTL(toplam)}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Malzeme çeşidi</span>
                <span className="tabular-nums">{gecerli.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toplam miktar</span>
                <span className="tabular-nums">{toplamAdet}</span>
              </div>
            </div>
            {enPahali.length > 0 && (
              <>
                <div className="my-3 h-px bg-border" />
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  En Maliyetli
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enPahali.map(({ s, tutar }, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">
                        {malzemeMap.get(s.malzemeId)?.ad ?? s.malzemeId}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {toplam > 0 ? Math.round((tutar / toplam) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
