"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  CalendarDays,
  Factory,
  Layers,
  MapPin,
  Plug,
  QrCode,
} from "lucide-react";

import { HexagonPattern } from "@/components/ui/hexagon-pattern";
import { cn } from "@/lib/utils";

/**
 * Login sağ paneli — duyuru sahneleri.
 *
 * Kart destesi konseptinden vazgeçildi: duyurular artık bir kutunun içine
 * sıkışmıyor, her biri sağ alanın TAMAMINI kendi tasarımıyla kaplıyor.
 * Bu yüzden ortak bir "slayt bileşeni" YOK — her duyuru kendi bileşeni.
 * Ortak olan tek şey sahne çerçevesi (giriş/çıkış animasyonu ve gezinme).
 *
 * Yeni duyuru eklerken: bir sahne bileşeni yaz, SAHNELER dizisine ekle.
 * Şimdilik mock veri.
 */

type Sahne = {
  ad: string;
  /** Gezinme çubuğunun o sahnedeki rengi — zemine göre değişir. */
  nokta: string;
  /** Koyu zeminli sahnelerde gezinme açık renge döner. */
  koyu?: boolean;
  Icerik: React.ComponentType;
};

const SURE_MS = 7000;

// ── Sahne 1: Logo entegrasyonu ────────────────────────────────────────
// Koyu lacivert (primary) tam zemin. İki sistemin birbirine akışını
// anlatıyor; en güçlü mesaj olduğu için en iddialı sahne bu.
function LogoSahne() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-primary px-12 py-14 text-primary-foreground">
      <HexagonPattern
        radius={46}
        strokeDasharray="2 3"
        className="pointer-events-none absolute inset-0 size-full text-white/[0.07] [mask-image:radial-gradient(ellipse_at_70%_20%,white,transparent_70%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 size-[380px] rounded-full bg-orange-500/25 blur-[120px]"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
          <Plug className="size-4" />
        </span>
        <span className="text-xs font-medium tracking-[0.18em] text-white/60 uppercase">
          Entegrasyon
        </span>
      </div>

      <div className="relative flex flex-col gap-6">
        <h2 className="max-w-[15ch] text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance">
          Logo Yazılım ile tam entegre
        </h2>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-white/70">
          Cari hesaplar ve faturalar Logo muhasebe ile otomatik senkronize
          olur — çift kayıt derdi biter.
        </p>

        {/* İki sistem, aralarında akan bağ */}
        <div className="flex items-center gap-4 pt-2">
          <span className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium">
            Logo
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-white/15">
            <motion.span
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
              animate={{ x: ["-4rem", "22rem"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
          <span className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-primary">
            MobilyumPro
          </span>
        </div>
      </div>

      <div className="relative flex items-baseline gap-3">
        <span className="text-6xl font-semibold tracking-tighter tabular-nums">
          %80
        </span>
        <span className="text-sm text-white/60">daha az manuel kayıt</span>
      </div>
    </div>
  );
}

// ── Sahne 2: Mikro veri akışı ─────────────────────────────────────────
// Açık zemin, içerik sola/alta yaslı, sağ üstte büyük altıgen alanı.
// Bilerek 1. sahnenin tam tersi: aydınlık ve sakin.
function MikroSahne() {
  return (
    <div className="relative flex h-full flex-col justify-end overflow-hidden bg-[#fafafa] px-12 py-14">
      {/* Desen TÜM paneli kaplamalı; sınırı maske çizer. Sabit boyutlu bir
          kutuya (size-[520px]) konduğunda petekler maske bitmeden kutunun
          kenarında sert biçimde kesiliyordu. */}
      <HexagonPattern
        radius={34}
        className="pointer-events-none absolute inset-0 size-full text-sky-500/[0.13] [mask-image:radial-gradient(ellipse_120%_90%_at_85%_0%,white,transparent_70%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-[420px] rounded-full bg-sky-500/[0.08] blur-[110px]"
      />

      <div className="relative flex flex-col gap-7">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-sky-700/70 uppercase">
          <ArrowLeftRight className="size-3.5" />
          Entegrasyon
        </span>

        <h2 className="max-w-[14ch] text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-foreground text-balance">
          Mikro ile veri akışı
        </h2>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
          Mikro kullanan bayilerinizle sipariş ve stok verisi tek tıkla
          karşılıklı akar.
        </p>

        {/* Çift yön: iki satır, ters yönlerde ilerleyen izler */}
        <div className="flex max-w-md flex-col gap-2.5 border-t pt-6">
          {[
            { etiket: "Sipariş", yon: 1 },
            { etiket: "Stok", yon: -1 },
          ].map((s) => (
            <div key={s.etiket} className="flex items-center gap-3">
              <span className="w-14 text-xs text-muted-foreground">
                {s.etiket}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sky-500/10">
                <motion.span
                  className="absolute inset-y-0 w-1/3 rounded-full bg-sky-500/50"
                  animate={{ x: s.yon > 0 ? ["-40%", "300%"] : ["300%", "-40%"] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-semibold tracking-tighter text-sky-700">
            2 yön
          </span>
          <span className="text-sm text-muted-foreground">
            sipariş + stok senkronu
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Sahne 3: Fuar duyurusu ────────────────────────────────────────────
// Afiş kurgusu: ortalanmış, dev yıl rakamı ve altta bilet künyesi.
// Diğer ikisi "ürün anlatımı", bu "davet" — o yüzden kompozisyon da farklı.
function FuarSahne() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-[#fffaf2] to-orange-100/60 px-12 py-14 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[19rem] leading-none font-semibold tracking-tighter text-amber-500/[0.09] tabular-nums select-none"
      >
        2027
      </span>

      <div className="relative flex flex-col items-center gap-6">
        <span className="flex items-center gap-2 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-xs font-medium tracking-[0.14em] text-amber-800 uppercase">
          <CalendarDays className="size-3.5" />
          Duyuru
        </span>

        <h2 className="max-w-[16ch] text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance text-amber-950">
          2027 Mobilya Fuarı&apos;ndayız
        </h2>
        <p className="max-w-[40ch] text-[15px] leading-relaxed text-amber-900/70">
          MobilyumPro&apos;yu yerinde görmek için İstanbul Mobilya
          Fuarı&apos;ndaki standımıza bekleriz.
        </p>

        {/* Bilet künyesi: kesikli ayraçla iki parça */}
        <div className="mt-2 flex items-stretch overflow-hidden rounded-xl border border-amber-500/25 bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center px-6 py-3.5">
            <span className="text-lg font-semibold text-amber-950">
              Salon 4
            </span>
            <span className="text-[11px] tracking-wide text-amber-900/60 uppercase">
              Stant D-12
            </span>
          </div>
          <span className="my-2 border-l border-dashed border-amber-500/35" />
          <div className="flex items-center gap-2 px-6 py-3.5 text-sm text-amber-900/80">
            <MapPin className="size-4 shrink-0" />
            CNR Expo · İstanbul
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sahne 4: Fabrika 3D / üretim takibi ───────────────────────────────
// Koyu kömür zemin. Kompozisyon YATAY: istasyonlar bir hat boyunca dizili,
// çünkü anlatılan şey de bir hat. Diğer sahnelerde içerik dikey akıyor.
const ISTASYONLAR = [
  { ad: "Kesim", oran: 100 },
  { ad: "Bantlama", oran: 100 },
  { ad: "Delik", oran: 62 },
  { ad: "Montaj", oran: 18 },
  { ad: "Paket", oran: 0 },
];

function FabrikaSahne() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#101418] px-12 py-14 text-white">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/15 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_top,black,transparent_75%)]"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <Factory className="size-4 text-emerald-400" />
        </span>
        <span className="text-xs font-medium tracking-[0.18em] text-white/50 uppercase">
          Yeni özellik
        </span>
      </div>

      <div className="relative flex flex-col gap-6">
        <h2 className="max-w-[15ch] text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-balance">
          Üretim hattını canlı izleyin
        </h2>
        <p className="max-w-[40ch] text-[15px] leading-relaxed text-white/60">
          Her emir hangi istasyonda, ne kadar ilerlemiş — fabrika görünümünde
          tek bakışta görün.
        </p>

        {/* Hat: istasyonlar soldan sağa, dolan çubuklarla */}
        <div className="flex items-end gap-2 pt-2">
          {ISTASYONLAR.map((s, i) => (
            <div key={s.ad} className="flex flex-1 flex-col gap-2">
              <span className="text-[11px] text-white/45">{s.ad}</span>
              <span className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    s.oran === 100 ? "bg-emerald-400" : "bg-emerald-400/70",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.oran}%` }}
                  transition={{ duration: 0.9, delay: 0.25 + i * 0.12 }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-baseline gap-3">
        <span className="text-6xl font-semibold tracking-tighter tabular-nums">
          3D
        </span>
        <span className="text-sm text-white/50">fabrika görünümü</span>
      </div>
    </div>
  );
}

// ── Sahne 5: QR ile atölye refakat ────────────────────────────────────
// İki sütun: solda anlatım, sağda dev QR. Tek "yatay bölünmüş" sahne bu.
const QR_DESEN = [
  "111010111",
  "101101101",
  "111001111",
  "000110010",
  "011010110",
  "010101000",
  "111011010",
  "101100101",
  "111010011",
];

function RefakatSahne() {
  return (
    <div className="relative grid h-full grid-cols-[1.15fr_1fr] items-center gap-8 overflow-hidden bg-white px-12 py-14">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 size-[460px] rounded-full bg-violet-500/[0.07] blur-[110px]"
      />

      <div className="relative flex flex-col gap-6">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-violet-700/70 uppercase">
          <QrCode className="size-3.5" />
          Yeni özellik
        </span>
        <h2 className="text-[2.5rem] leading-[1.06] font-semibold tracking-tight text-foreground text-balance">
          Atölyede kâğıt yok, QR var
        </h2>
        <p className="max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          Refakat kartındaki kodu telefonla okutan usta, işi görür ve adımı
          ilerletir. Giriş yapmasına bile gerek yok.
        </p>
        <div className="flex items-baseline gap-3 border-t pt-5">
          <span className="text-4xl font-semibold tracking-tighter text-violet-700">
            0
          </span>
          <span className="text-sm text-muted-foreground">
            kurulum · tarayıcı yeter
          </span>
        </div>
      </div>

      {/* Dev QR: taranıyor izlenimi için üzerinden geçen çizgi */}
      <div className="relative flex items-center justify-center">
        <div className="relative rounded-2xl border bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-9 gap-1">
            {QR_DESEN.flatMap((satir, y) =>
              satir.split("").map((h, x) => (
                <span
                  key={`${y}-${x}`}
                  className={cn(
                    "size-4 rounded-[3px]",
                    h === "1" ? "bg-violet-950" : "bg-violet-950/[0.06]",
                  )}
                />
              )),
            )}
          </div>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 h-8 rounded-full bg-gradient-to-b from-transparent via-violet-500/25 to-transparent"
            animate={{ top: ["1.25rem", "calc(100% - 3.25rem)", "1.25rem"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sahne 6: Reçete patlatma + anlık maliyet ──────────────────────────
// Ağaç kurgusu: içerik girintili satırlarla aşağı iniyor, altta toplam.
// Anlatılan şey hiyerarşi olduğu için kompozisyon da hiyerarşik.
const AGAC = [
  { ad: "Gardırop 4 Kapaklı", derinlik: 0, tutar: "₺12.480", ana: true },
  { ad: "Yan panel · 18mm MDF", derinlik: 1, tutar: "₺3.240" },
  { ad: "Kapak · Gana ceviz", derinlik: 1, tutar: "₺5.910" },
  { ad: "Kenar bandı · 2mm", derinlik: 2, tutar: "₺410" },
  { ad: "Menteşe · yavaş kapanır", derinlik: 1, tutar: "₺2.920" },
];

function ReceteSahne() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-8 overflow-hidden bg-gradient-to-b from-white to-indigo-50/70 px-12 py-14">
      <HexagonPattern
        radius={40}
        strokeDasharray="2 4"
        className="pointer-events-none absolute inset-0 size-full text-indigo-500/[0.10] [mask-image:radial-gradient(ellipse_100%_80%_at_10%_100%,white,transparent_72%)]"
      />

      <div className="relative flex flex-col gap-5">
        <span className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-indigo-700/70 uppercase">
          <Layers className="size-3.5" />
          Yeni özellik
        </span>
        <h2 className="max-w-[16ch] text-[2.5rem] leading-[1.06] font-semibold tracking-tight text-foreground text-balance">
          Reçeteyi patlatın, maliyeti anında görün
        </h2>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
          Modelin altındaki her parça ve malzeme fire payıyla hesaplanır;
          alış fiyatı değiştiğinde maliyet kendiliğinden güncellenir.
        </p>
      </div>

      {/* Ağaç: girinti derinliği taşıyor */}
      <div className="relative flex max-w-lg flex-col gap-1.5">
        {AGAC.map((s, i) => (
          <motion.div
            key={s.ad}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.09 }}
            style={{ marginLeft: `${s.derinlik * 1.5}rem` }}
            className={cn(
              "flex items-center justify-between gap-4 rounded-lg px-3.5 py-2.5 text-sm",
              s.ana
                ? "bg-indigo-950 font-medium text-white"
                : "border border-indigo-500/15 bg-white/80 text-foreground",
            )}
          >
            <span className="truncate">{s.ad}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                s.ana ? "text-white" : "text-muted-foreground",
              )}
            >
              {s.tutar}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const SAHNELER: Sahne[] = [
  { ad: "Logo entegrasyonu", nokta: "#fb923c", koyu: true, Icerik: LogoSahne },
  { ad: "Üretim hattı canlı takip", nokta: "#34d399", koyu: true, Icerik: FabrikaSahne },
  { ad: "Mikro veri akışı", nokta: "#0284c7", Icerik: MikroSahne },
  { ad: "QR ile atölye refakat", nokta: "#7c3aed", Icerik: RefakatSahne },
  { ad: "Reçete patlatma ve maliyet", nokta: "#4f46e5", Icerik: ReceteSahne },
  { ad: "2027 Mobilya Fuarı", nokta: "#d97706", Icerik: FuarSahne },
];

export function LoginTanitim({ className }: { className?: string }) {
  const [aktif, setAktif] = React.useState(0);
  const n = SAHNELER.length;
  const sahne = SAHNELER[aktif];

  React.useEffect(() => {
    const id = setInterval(() => setAktif((a) => (a + 1) % n), SURE_MS);
    return () => clearInterval(id); // manuel seçimde sayaç baştan başlar
  }, [aktif, n]);

  return (
    <div className={cn("relative h-full overflow-hidden", className)}>
      <AnimatePresence mode="sync">
        <motion.div
          key={aktif}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <sahne.Icerik />
        </motion.div>
      </AnimatePresence>

      {/* Gezinme: sahnenin üstünde durur, zemine göre renk değiştirir */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-8">
        {SAHNELER.map((s, i) => (
          <button
            key={s.ad}
            type="button"
            aria-label={s.ad}
            aria-current={i === aktif}
            onClick={() => setAktif(i)}
            className="flex h-4 cursor-pointer items-center justify-center px-0.5"
          >
            <motion.span
              animate={{
                width: i === aktif ? 28 : 8,
                backgroundColor:
                  i === aktif
                    ? s.nokta
                    : sahne.koyu
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(0,0,0,0.15)",
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
