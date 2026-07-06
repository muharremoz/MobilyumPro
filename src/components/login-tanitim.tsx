"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Blocks, CalendarDays, Plug } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Login sağ paneli — kart destesi konsepti.
 * Açık zemin + yumuşak renk lekeleri; duyurular üst üste bir deste halinde
 * durur, aktif kart öne gelir (otomatik döner, karta/noktaya tıklanabilir).
 * Şimdilik mock veri.
 */
type Slayt = {
  etiket: string;
  baslik: string;
  aciklama: string;
  renk: string; // vurgu rengi (ikon rozeti + nokta)
  Ikon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  alt: { deger: string; etiket: string };
};

const slaytlar: Slayt[] = [
  {
    etiket: "Entegrasyon",
    baslik: "Logo Yazılım ile tam entegre",
    aciklama:
      "Cari hesaplar ve faturalar Logo muhasebe ile otomatik senkronize olur — çift kayıt derdi biter.",
    renk: "#f97316",
    Ikon: Plug,
    alt: { deger: "%80", etiket: "daha az manuel kayıt" },
  },
  {
    etiket: "Entegrasyon",
    baslik: "Mikro ile veri akışı",
    aciklama:
      "Mikro kullanan bayilerinizle sipariş ve stok verisi tek tıkla karşılıklı akar.",
    renk: "#3b82f6",
    Ikon: Blocks,
    alt: { deger: "2 yön", etiket: "sipariş + stok senkronu" },
  },
  {
    etiket: "Duyuru",
    baslik: "2027 Mobilya Fuarı'ndayız",
    aciklama:
      "MobilyumPro'yu yerinde görmek için İstanbul Mobilya Fuarı'ndaki standımıza bekleriz.",
    renk: "#f59e0b",
    Ikon: CalendarDays,
    alt: { deger: "Salon 4", etiket: "Stant D-12 · CNR Expo" },
  },
];

const SURE_MS = 6000;

export function LoginTanitim({ className }: { className?: string }) {
  const [aktif, setAktif] = React.useState(0);
  const n = slaytlar.length;

  React.useEffect(() => {
    const id = setInterval(() => setAktif((a) => (a + 1) % n), SURE_MS);
    return () => clearInterval(id);
  }, [aktif, n]); // manuel seçimde sayaç baştan başlar

  // Destedeki sıra: 0 = önde, 1 = bir arkada, 2 = en arkada.
  const sira = (i: number) => (i - aktif + n) % n;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-[#fafafa]",
        className,
      )}
    >
      {/* Yumuşak renk lekeleri */}
      <div className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-[#f59e0b]/[0.10] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-28 size-[440px] rounded-full bg-[#3b82f6]/[0.09] blur-[110px]" />
      {/* Nokta dokusu */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
      />

      {/* Üst: marka */}
      <div className="relative flex items-center gap-2.5 p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="MobilyumPro"
          className="size-7 rounded-full border"
        />
        <span className="text-sm font-medium text-[#171717]">MobilyumPro</span>
      </div>

      {/* Orta: kart destesi */}
      <div className="relative flex flex-1 items-center justify-center px-10">
        <div className="relative h-96 w-full max-w-md">
          {slaytlar.map((s, i) => {
            const k = sira(i);
            const onde = k === 0;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => !onde && setAktif(i)}
                aria-label={s.baslik}
                animate={{
                  y: k * -22,
                  scale: 1 - k * 0.06,
                  opacity: k > 2 ? 0 : 1,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                style={{ zIndex: n - k }}
                className={cn(
                  "absolute inset-x-0 bottom-0 flex h-[340px] flex-col gap-5 overflow-hidden rounded-xl bg-white p-9 text-left shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_2px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.12)]",
                  onde ? "cursor-default" : "cursor-pointer",
                )}
              >
                {/* Kart içi tasarım: köşede ışık + filigran ikon */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -left-12 size-44 rounded-full blur-3xl"
                  style={{ backgroundColor: `${s.renk}14` }}
                />
                <s.Ikon
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -bottom-8 size-40"
                  style={{ color: `${s.renk}0d` }}
                />

                <div className="relative flex items-center justify-between">
                  <span
                    className="flex size-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${s.renk}1a` }}
                  >
                    <s.Ikon className="size-6" style={{ color: s.renk }} />
                  </span>
                  <span className="rounded-full bg-[#f2f2f2] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-[#666] uppercase">
                    {s.etiket}
                  </span>
                </div>
                <div className="relative flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[#171717]">
                    {s.baslik}
                  </h2>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {s.aciklama}
                  </p>
                </div>
                <div className="relative mt-auto flex items-center gap-3 border-t border-[#f2f2f2] pt-4">
                  <span className="text-xl font-semibold tracking-tight text-[#171717] tabular-nums">
                    {s.alt.deger}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.alt.etiket}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Alt: noktalar */}
      <div className="relative flex items-center justify-center gap-2 p-8">
        {slaytlar.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Duyuru ${i + 1}`}
            onClick={() => setAktif(i)}
            className="flex size-4 cursor-pointer items-center justify-center"
          >
            <motion.span
              animate={{
                width: i === aktif ? 20 : 8,
                backgroundColor: i === aktif ? s.renk : "#d4d4d4",
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
