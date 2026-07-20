"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
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
import { AnimatedField } from "@/components/ui/animated-field";
import { TarihSecici } from "@/components/ui/tarih-secici";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { uretimEmriOlustur } from "@/lib/db/actions";
import type { UretimOncelik } from "@/lib/data";

const ONCELIKLER: UretimOncelik[] = ["Düşük", "Normal", "Yüksek", "Acil"];

/**
 * Model listesinden hızlı üretim emri açma diyaloğu. Adet + öncelik + başlama
 * biçimi (taslak/hemen). Motor: uretimEmriOlustur — "Üretimde" seçilirse mod-1
 * toplu düşüm çalışır ve stok yetersizse emir Planlandı'ya çekilip uyarı döner;
 * bu uyarılar burada toast.warning ile gösterilir.
 */
export function UretimeGonderDialog({
  hedef,
  onKapat,
  // Parametrelerden gelir (varsayilan_oncelik / varsayilan_termin).
  // Termin SUNUCUDA hesaplanmış tarihtir: istemcide new Date() ile üretmek
  // sunucu-istemci farkı yaratıp hidrasyon uyuşmazlığına yol açardı.
  varsayilanOncelik = "Normal",
  varsayilanTermin = "",
}: {
  hedef: { id: string; ad: string } | null;
  onKapat: () => void;
  varsayilanOncelik?: UretimOncelik;
  varsayilanTermin?: string;
}) {
  const router = useRouter();
  const [adet, setAdet] = React.useState("1");
  const [oncelik, setOncelik] =
    React.useState<UretimOncelik>(varsayilanOncelik);
  const [termin, setTermin] = React.useState(varsayilanTermin);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Hedef değişince formu render sırasında sıfırla (proje standardı, effect değil).
  const hedefId = hedef?.id ?? null;
  const [oncekiId, setOncekiId] = React.useState<string | null>(null);
  if (hedefId !== oncekiId) {
    setOncekiId(hedefId);
    setAdet("1");
    setOncelik(varsayilanOncelik);
    setTermin(varsayilanTermin);
    setKaydediliyor(false);
  }

  const adetNum = Math.floor(Number(adet));
  const adetGecerli = Number.isFinite(adetNum) && adetNum >= 1;

  async function olustur(durum: "Planlandı" | "Üretimde") {
    if (!hedef || !adetGecerli || kaydediliyor) return;
    setKaydediliyor(true);
    const res = await uretimEmriOlustur([
      {
        refTip: "model",
        urunId: hedef.id,
        urunAd: hedef.ad,
        adet: adetNum,
        durum,
        oncelik,
        termin: termin || undefined,
      },
    ]);
    if (!res.ok) {
      setKaydediliyor(false);
      toast.error("Emir oluşturulamadı.");
      return;
    }
    toast.success(
      durum === "Üretimde"
        ? `Üretim emri oluşturuldu (${res.ids[0]})`
        : `Taslak emir kaydedildi (${res.ids[0]})`,
    );
    for (const u of res.uyarilar ?? []) toast.warning(u, { duration: 8000 });
    onKapat();
    router.push("/uretim/emirler");
  }

  return (
    <Dialog open={hedef !== null} onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Üretime Gönder</DialogTitle>
          <DialogDescription>{hedef?.ad} için üretim emri açın.</DialogDescription>
        </DialogHeader>

        <IconInput
          label="Adet"
          type="number"
          inputMode="numeric"
          min={1}
          value={adet}
          autoFocus
          onChange={(e) => setAdet(e.target.value)}
        />

        <div className="grid gap-0.5">
          <span className="text-sm font-medium text-muted-foreground">Öncelik</span>
          <div className="flex flex-wrap gap-1.5">
            {ONCELIKLER.map((o) => (
              <Button
                key={o}
                type="button"
                variant={oncelik === o ? "default" : "outline"}
                size="sm"
                className={cn(oncelik === o && "pointer-events-none")}
                onClick={() => setOncelik(o)}
              >
                {o}
              </Button>
            ))}
          </div>
        </div>

        <AnimatedField label="Termin (opsiyonel)" icon={CalendarDaysIcon}>
          <TarihSecici
            deger={termin}
            onChange={setTermin}
            placeholder="Termin seç"
          />
        </AnimatedField>

        <DialogFooter className="gap-2 sm:justify-between">
          <DialogClose render={<Button variant="outline">İptal</Button>} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => olustur("Planlandı")}
              disabled={!adetGecerli || kaydediliyor}
            >
              Taslak
            </Button>
            <Button
              onClick={() => olustur("Üretimde")}
              disabled={!adetGecerli || kaydediliyor}
            >
              {kaydediliyor ? "…" : "Üretime Başla"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
