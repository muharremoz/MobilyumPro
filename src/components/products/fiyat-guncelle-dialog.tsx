"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconInput } from "@/components/ui/icon-input";
import { formatTL } from "@/lib/data";
import { modelFiyatGuncelle } from "@/lib/db/actions";

/**
 * Model satış fiyatı güncelleme diyaloğu. İki yol: doğrudan yeni fiyat, ya da
 * yüzde oran (+/-). Oran girildiğinde yeni fiyat otomatik hesaplanır ve alana
 * yansır — kullanıcı isterse üzerine yazar. Kaydedilen tek şey nihai fiyattır.
 */
export function FiyatGuncelleDialog({
  hedef,
  onKapat,
  onUygulandi,
}: {
  hedef: { id: string; ad: string; fiyat: number } | null;
  onKapat: () => void;
  onUygulandi: (id: string, yeniFiyat: number) => void;
}) {
  const [yeniFiyat, setYeniFiyat] = React.useState("");
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Hedef değişince formu render sırasında sıfırla (effect değil — proje
  // standardı). Alan eldeki fiyatla başlar.
  const hedefId = hedef?.id ?? null;
  const [oncekiId, setOncekiId] = React.useState<string | null>(null);
  if (hedefId !== oncekiId) {
    setOncekiId(hedefId);
    setYeniFiyat(hedef ? String(hedef.fiyat) : "");
    setKaydediliyor(false);
  }

  const fiyatNum = Number(yeniFiyat.replace(",", "."));
  const gecerli =
    yeniFiyat.trim() !== "" && Number.isFinite(fiyatNum) && fiyatNum >= 0;
  const mevcut = hedef?.fiyat ?? 0;
  const degisti = gecerli && Math.abs(fiyatNum - mevcut) >= 0.005;
  const yuzde =
    degisti && mevcut > 0 ? ((fiyatNum - mevcut) / mevcut) * 100 : null;
  const gonderilebilir = gecerli && degisti && !kaydediliyor;

  /** Eldeki fiyata yüzde oran uygular ve alana yazar (2 ondalığa yuvarlar). */
  function oranUygula(oran: number) {
    const sonuc = Math.round(mevcut * (1 + oran / 100) * 100) / 100;
    setYeniFiyat(String(sonuc));
  }

  async function uygula() {
    if (!hedef || !gonderilebilir) return;
    setKaydediliyor(true);
    const res = await modelFiyatGuncelle(hedef.id, fiyatNum);
    if (res.ok) {
      onUygulandi(hedef.id, fiyatNum);
      toast.success(`${hedef.ad} fiyatı ${formatTL(fiyatNum)} yapıldı`);
      onKapat();
    } else {
      setKaydediliyor(false);
      toast.error(res.error ?? "Güncellenemedi.");
    }
  }

  return (
    <Dialog open={hedef !== null} onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fiyat Güncelle</DialogTitle>
          <DialogDescription>
            {hedef?.ad} — mevcut {formatTL(mevcut)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {[-10, -5, 5, 10, 20].map((o) => (
            <Button
              key={o}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => oranUygula(o)}
            >
              {o > 0 ? "+" : ""}
              {o}%
            </Button>
          ))}
        </div>

        <IconInput
          label="Yeni Fiyat"
          type="number"
          inputMode="decimal"
          value={yeniFiyat}
          autoFocus
          onChange={(e) => setYeniFiyat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && gonderilebilir) {
              e.preventDefault();
              uygula();
            }
          }}
        />

        {yuzde !== null && (
          <p className="text-sm text-muted-foreground">
            Değişim:{" "}
            <span
              className={
                yuzde > 0
                  ? "font-medium text-emerald-600"
                  : "font-medium text-rose-600"
              }
            >
              {yuzde > 0 ? "+" : ""}
              {yuzde.toFixed(1)}%
            </span>
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">İptal</Button>} />
          <Button onClick={uygula} disabled={!gonderilebilir}>
            {kaydediliyor ? "Kaydediliyor…" : "Güncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
