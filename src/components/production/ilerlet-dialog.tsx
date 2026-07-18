"use client";

import * as React from "react";
import { AlertTriangle, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  aktifIstasyon,
  type FabrikaEmri,
  type Istasyon,
  type IstasyonSlug,
} from "@/lib/fabrika";

/** İlerletme onayı — hangi adımın kapanacağını söyler, opsiyonel not alır. */
export function IlerletDialog({
  emir,
  istasyonMap,
  not,
  onNot,
  hedef,
  onHedef,
  istasyonlar,
  mesgul,
  onKapat,
  onOnay,
}: {
  emir: FabrikaEmri;
  istasyonMap: Map<string, Istasyon>;
  not: string;
  onNot: (v: string) => void;
  /** Seçili hedef istasyon slug'ı (null = sıradaki adım). */
  hedef: string | null;
  onHedef: (v: string | null) => void;
  istasyonlar: Istasyon[];
  mesgul: boolean;
  onKapat: () => void;
  onOnay: () => void;
}) {
  // Rota dışı geçiş için ayrı onay — yanlışlıkla atlama/geri alma olmasın.
  const [rotaDisiOnay, setRotaDisiOnay] = React.useState(false);
  const isleniyor = emir.adimlar.find((a) => a.durum === "İşleniyor");
  const aktifSlug = aktifIstasyon(emir);
  const aktifAd = aktifSlug
    ? (istasyonMap.get(aktifSlug)?.ad ?? aktifSlug)
    : "—";
  // Tamamlanacak adımdan sonraki istasyon (varsa) — nereye geçileceği.
  const sonraki = isleniyor
    ? emir.adimlar.find((a) => a.sira === isleniyor.sira + 1)
    : null;
  const sonrakiAd = sonraki
    ? (istasyonMap.get(sonraki.istasyon)?.ad ?? sonraki.istasyon)
    : null;

  // Varsayılan hedef: sıradaki adım (başlatmada ilk bekleyen).
  const varsayilanSlug = isleniyor
    ? (sonraki?.istasyon ?? null)
    : (emir.adimlar.find((a) => a.durum === "Bekliyor")?.istasyon ?? null);
  const seciliSlug = hedef ?? varsayilanSlug;
  const rotaDisi = seciliSlug !== null && seciliSlug !== varsayilanSlug;
  const seciliAdim = emir.adimlar.find((a) => a.istasyon === seciliSlug);
  const seciliIst = seciliSlug ? istasyonMap.get(seciliSlug) : undefined;
  // Emrin rotasındaki istasyonlar (sıra korunur).
  const rotaIstasyonlari = emir.adimlar
    .map((a) => istasyonMap.get(a.istasyon))
    .filter((i): i is Istasyon => Boolean(i));
  const geriDonus =
    rotaDisi &&
    isleniyor != null &&
    seciliAdim != null &&
    seciliAdim.sira < isleniyor.sira;
  // Atlanacak adım sayısı (ileri sıçramada).
  const atlanan =
    rotaDisi && isleniyor && seciliAdim && seciliAdim.sira > isleniyor.sira
      ? emir.adimlar.filter(
          (a) =>
            a.sira > isleniyor.sira &&
            a.sira < seciliAdim.sira &&
            a.durum === "Bekliyor",
        ).length
      : 0;
  const onaylanabilir = !rotaDisi || rotaDisiOnay;

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isleniyor
              ? `${aktifAd} tamamlansın mı?`
              : "Üretim başlatılsın mı?"}
          </DialogTitle>
          <DialogDescription>
            {emir.id} · {emir.modelAd} × {emir.adet}
            {isleniyor
              ? sonrakiAd
                ? ` — ${sonrakiAd} istasyonuna geçecek.`
                : " — bu son adım, emir tamamlanacak."
              : ` — ${aktifAd} istasyonunda başlayacak.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Hedef istasyon
          </span>
          <SearchSelect
            items={rotaIstasyonlari.map((i) => i.ad)}
            value={seciliIst?.ad ?? null}
            onValueChange={(ad) => {
              const bulunan = rotaIstasyonlari.find((i) => i.ad === ad);
              onHedef(bulunan ? bulunan.slug : null);
              setRotaDisiOnay(false);
            }}
            placeholder="İstasyon seç"
          />
          {!rotaDisi && (
            <span className="text-[11px] text-muted-foreground">
              Rotadaki sıradaki adım.
            </span>
          )}
        </div>

        {rotaDisi && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
              <AlertTriangle className="size-3.5" />
              Rota dışı geçiş
            </p>
            <p className="mt-1 text-xs text-amber-900/80">
              {geriDonus
                ? `${seciliIst?.ad} adımına geri dönülecek; sonraki adımlar yeniden bekleyecek. Yeniden işleme o istasyonların malzemesini tekrar düşer.`
                : atlanan > 0
                  ? `${atlanan} adım atlanacak (Atlandı olarak işaretlenir); atlanan istasyonların malzemesi düşmez.`
                  : `Sıradaki adım yerine ${seciliIst?.ad} istasyonuna geçilecek.`}
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-900">
              <Checkbox
                checked={rotaDisiOnay}
                onCheckedChange={(v) => setRotaDisiOnay(v === true)}
              />
              Rota dışı geçişi onaylıyorum
            </label>
          </div>
        )}

        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Açıklama (opsiyonel)
          </span>
          <Textarea
            autoFocus
            rows={3}
            placeholder="Örn. 2 panel fire verildi, makine ayarı değişti…"
            value={not}
            onChange={(ev) => onNot(ev.target.value)}
          />
          <span className="text-[11px] text-muted-foreground">
            Not üretim geçmişinde bu adımın altında görünür.
          </span>
        </label>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Vazgeç
          </Button>
          <Button
            size="sm"
            disabled={mesgul || !onaylanabilir}
            onClick={onOnay}
          >
            <ChevronsRight className="size-3.5" />
            {mesgul
              ? "İşleniyor..."
              : rotaDisi
                ? geriDonus
                  ? "Geri Dön"
                  : "Atla ve Geç"
                : isleniyor
                  ? "İlerlet"
                  : "Başlat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
