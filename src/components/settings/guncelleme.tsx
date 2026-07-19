"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Hand,
  Power,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnay } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  guncellemeAyarKaydet,
  guncellemeKontrolEt,
  guncellemeUygula,
  type GuncellemeDurum,
  type GuncellemeMod,
} from "@/lib/db/guncelleme-actions";

const MODLAR: {
  deger: GuncellemeMod;
  etiket: string;
  aciklama: string;
  ikon: typeof Clock;
}[] = [
  {
    deger: "otomatik",
    etiket: "Gece otomatik",
    aciklama: "Yeni sürüm gece belirlenen saatte kendiliğinden kurulur.",
    ikon: Clock,
  },
  {
    deger: "elle",
    etiket: "Elle onay",
    aciklama: "Yeni sürüm hazır olunca burada gösterilir; siz onaylayınca kurulur.",
    ikon: Hand,
  },
  {
    deger: "kapali",
    etiket: "Kapalı",
    aciklama: "Otomatik kontrol yapılmaz. Güncellemeyi tümüyle siz yönetirsiniz.",
    ikon: Power,
  },
];

/**
 * Güncelleme ayarları — sürüm bilgisi, mod seçimi (gece otomatik / elle / kapalı)
 * ve "Şimdi uygula". Sayfa açılışında ağ kontrolü YAPILMAZ (git fetch yavaş
 * olabilir); kullanıcı "Kontrol et" ile tetikler.
 */
export function GuncellemeAyarlari({ durum: ilk }: { durum: GuncellemeDurum }) {
  const { onayla, onayDialog } = useOnay();
  const [durum, setDurum] = React.useState(ilk);
  const [mod, setMod] = React.useState<GuncellemeMod>(ilk.mod);
  const [saat, setSaat] = React.useState(ilk.saat);
  const [kontrolEdiliyor, setKontrolEdiliyor] = React.useState(false);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [baslatiliyor, setBaslatiliyor] = React.useState(false);
  const [kontrolYapildi, setKontrolYapildi] = React.useState(false);

  const degisti = mod !== durum.mod || saat !== durum.saat;

  async function kontrolEt() {
    setKontrolEdiliyor(true);
    const res = await guncellemeKontrolEt();
    setKontrolEdiliyor(false);
    setKontrolYapildi(true);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDurum((d) => ({ ...d, ...res.durum, mod: d.mod, saat: d.saat }));
    if (!res.durum.internetVar) toast.warning("İnternet erişimi yok.");
    else if (res.durum.guncellemeVar)
      toast.success(`Yeni sürüm bulundu: ${res.durum.enYeni}`);
    else toast.success("Sistem güncel.");
  }

  async function ayarKaydet() {
    setKaydediliyor(true);
    const res = await guncellemeAyarKaydet(mod, saat);
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    setDurum((d) => ({ ...d, mod, saat }));
    toast.success("Ayarlar kaydedildi.");
  }

  async function simdiUygula() {
    const onaylandi = await onayla({
      title: "Güncelleme şimdi uygulansın mı?",
      description:
        `Sürüm ${durum.enYeni} kurulacak. İşlem sırasında uygulama kısa süre ` +
        `yeniden başlar. Hata olursa otomatik olarak eski sürüme dönülür. ` +
        `Yoğun mesai saatinde uygulamamanız önerilir.`,
      confirmLabel: "Şimdi uygula",
      destructive: false,
    });
    if (!onaylandi) return;
    setBaslatiliyor(true);
    const res = await guncellemeUygula();
    setBaslatiliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Başlatılamadı.");
      return;
    }
    toast.success(
      "Güncelleme başlatıldı. Uygulama birazdan yeniden başlayacak.",
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Sürüm durumu */}
      <Card>
        <CardHeader>
          <CardTitle>Sürüm</CardTitle>
          <CardDescription>
            Sunucuda kurulu ve mevcut en yeni sürüm.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Kurulu sürüm</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                v{durum.mevcut}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En yeni sürüm</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {kontrolYapildi ? durum.enYeni ?? "—" : "?"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={kontrolEt}
              disabled={kontrolEdiliyor}
              className="ml-auto"
            >
              <RefreshCw
                className={cn("size-4", kontrolEdiliyor && "animate-spin")}
              />
              Kontrol et
            </Button>
          </div>

          {kontrolYapildi && !durum.internetVar && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <WifiOff className="size-4 shrink-0" />
              İnternet erişimi yok. Uygulama çevrimdışı çalışmaya devam ediyor;
              güncelleme internet gelince kontrol edilebilir.
            </div>
          )}

          {kontrolYapildi && durum.internetVar && !durum.guncellemeVar && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" />
              Sistem güncel.
            </div>
          )}

          {durum.guncellemeVar && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-3">
              <div className="flex items-center gap-2 text-sm text-sky-900">
                <Download className="size-4 shrink-0" />
                <span>
                  <strong>{durum.enYeni}</strong> sürümü hazır.
                </span>
              </div>
              <Button onClick={simdiUygula} disabled={baslatiliyor}>
                {baslatiliyor ? "Başlatılıyor…" : "Şimdi uygula"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mod ayarı */}
      <Card>
        <CardHeader>
          <CardTitle>Güncelleme modu</CardTitle>
          <CardDescription>
            Yeni sürümlerin nasıl kurulacağını belirler.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            {MODLAR.map((m) => {
              const secili = mod === m.deger;
              return (
                <button
                  key={m.deger}
                  type="button"
                  onClick={() => setMod(m.deger)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors",
                    secili
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <m.ikon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      secili ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{m.etiket}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.aciklama}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {mod === "otomatik" && (
            <div className="flex items-center gap-3">
              <Label htmlFor="saat" className="text-sm">
                Kurulum saati
              </Label>
              <Input
                id="saat"
                type="time"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                className="h-9 w-32"
              />
              <span className="text-xs text-muted-foreground">
                Mesai dışı bir saat önerilir.
              </span>
            </div>
          )}

          <div>
            <Button onClick={ayarKaydet} disabled={!degisti || kaydediliyor}>
              {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {onayDialog}
    </div>
  );
}
