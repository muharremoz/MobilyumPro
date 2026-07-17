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
import { Textarea } from "@/components/ui/textarea";
import { stokDuzelt } from "@/lib/db/actions";

/**
 * Elle stok düzeltme (sayım farkı) diyaloğu. Kullanıcı SAYILAN miktarı girer;
 * eldeki değerle farkı bir Giriş/Çıkış hareketine dönüşür (motor: stokDuzelt).
 * Gerekçe zorunlu — gerekçesiz düzeltme denetlenemez.
 */
export function StokDuzeltDialog({
  hedef,
  onKapat,
  onUygulandi,
}: {
  /** Düzeltilecek kayıt; null iken dialog kapalı. */
  hedef: { id: string; ad: string; stok: number } | null;
  onKapat: () => void;
  /** Başarılı düzeltme sonrası yeni eldeki miktarı üst listeye bildirir. */
  onUygulandi: (id: string, yeniMiktar: number) => void;
}) {
  const [sayilan, setSayilan] = React.useState("");
  const [gerekce, setGerekce] = React.useState("");
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Hedef değişince formu render sırasında sıfırla (effect değil — proje
  // standardı: "Adjusting some state when a prop changes"). Yeni bir kart
  // açıldığında sayaç eldeki değerle başlar, gerekçe boşalır. Aynı kart açıkken
  // hedefId değişmez, bu yüzden kullanıcı girdisi ezilmez.
  const hedefId = hedef?.id ?? null;
  const [oncekiId, setOncekiId] = React.useState<string | null>(null);
  if (hedefId !== oncekiId) {
    setOncekiId(hedefId);
    setSayilan(hedef ? String(hedef.stok) : "");
    setGerekce("");
    setKaydediliyor(false);
  }

  const sayilanNum = Number(sayilan.replace(",", "."));
  const gecerliSayi = sayilan.trim() !== "" && Number.isFinite(sayilanNum);
  const fark = gecerliSayi ? sayilanNum - (hedef?.stok ?? 0) : 0;
  const gerekceGecerli = gerekce.trim() !== "";
  const gonderilebilir =
    gecerliSayi && gerekceGecerli && Math.abs(fark) >= 0.0005 && !kaydediliyor;

  async function uygula() {
    if (!hedef || !gonderilebilir) return;
    setKaydediliyor(true);
    const res = await stokDuzelt(hedef.id, sayilanNum, gerekce.trim());
    if (res.ok) {
      onUygulandi(hedef.id, res.yeniMiktar ?? sayilanNum);
      toast.success(`${hedef.ad} stoğu ${res.yeniMiktar} olarak düzeltildi`);
      onKapat();
    } else {
      setKaydediliyor(false);
      toast.error(res.error ?? "Düzeltilemedi.");
    }
  }

  return (
    <Dialog open={hedef !== null} onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Stok Düzelt</DialogTitle>
          <DialogDescription>
            {hedef?.ad} — eldeki {hedef?.stok}. Sayılan miktarı girin; fark bir
            stok hareketine yazılır.
          </DialogDescription>
        </DialogHeader>

        <IconInput
          label="Sayılan Miktar"
          type="number"
          inputMode="decimal"
          value={sayilan}
          autoFocus
          onChange={(e) => setSayilan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && gonderilebilir) {
              e.preventDefault();
              uygula();
            }
          }}
        />

        {gecerliSayi && Math.abs(fark) >= 0.0005 && (
          <p className="text-sm text-muted-foreground">
            Fark:{" "}
            <span
              className={
                fark > 0 ? "font-medium text-emerald-600" : "font-medium text-rose-600"
              }
            >
              {fark > 0 ? "+" : ""}
              {fark} ({fark > 0 ? "giriş" : "çıkış"})
            </span>
          </p>
        )}

        <div className="grid gap-0.5">
          <label
            htmlFor="stok-duzelt-gerekce"
            className="text-sm font-medium text-muted-foreground"
          >
            Gerekçe
          </label>
          <Textarea
            id="stok-duzelt-gerekce"
            rows={2}
            placeholder="Örn. sayım farkı, fire, hatalı giriş"
            value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">İptal</Button>} />
          <Button onClick={uygula} disabled={!gonderilebilir}>
            {kaydediliyor ? "Kaydediliyor…" : "Düzelt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
