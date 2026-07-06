"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Login sağ paneli — tam tasarımlı tanıtım/duyuru alanı.
 * Koyu zemin; ince çizgi ızgarası + eş merkezli halkalar, slayta göre renk
 * değiştiren ışık haleleri, hayalet slayt numarası, cam (glass) istatistik
 * kartı ve süreli ilerleme çubukları. Şimdilik mock veri.
 */
type Slayt = {
  etiket: string;
  baslik: string;
  aciklama: string;
  /** Slayta özel vurgu rengi (hale + rozet noktası). */
  renk: string;
  istatistik: { deger: string; etiket: string };
};

const slaytlar: Slayt[] = [
  {
    etiket: "Entegrasyon",
    baslik: "Logo Yazılım ile tam entegre",
    aciklama:
      "Cari hesaplar ve faturalar Logo muhasebe ile otomatik senkronize olur — çift kayıt derdi biter.",
    renk: "#f97316", // turuncu
    istatistik: { deger: "%80", etiket: "daha az manuel kayıt" },
  },
  {
    etiket: "Entegrasyon",
    baslik: "Mikro ile veri akışı",
    aciklama:
      "Mikro kullanan bayilerinizle sipariş ve stok verisi tek tıkla karşılıklı akar.",
    renk: "#3b82f6", // mavi
    istatistik: { deger: "2 yön", etiket: "sipariş + stok senkronu" },
  },
  {
    etiket: "Duyuru",
    baslik: "2027 Mobilya Fuarı'ndayız",
    aciklama:
      "MobilyumPro'yu yerinde görmek için İstanbul Mobilya Fuarı'ndaki standımıza bekleriz.",
    renk: "#f59e0b", // amber
    istatistik: { deger: "Salon 4", etiket: "Stant D-12 · CNR Expo" },
  },
];

const SURE_MS = 6000;

export function LoginTanitim({ className }: { className?: string }) {
  const [aktif, setAktif] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(
      () => setAktif((a) => (a + 1) % slaytlar.length),
      SURE_MS,
    );
    return () => clearInterval(id);
  }, [aktif]); // manuel seçimde sayaç baştan başlar

  const s = slaytlar[aktif];

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden bg-[#141414] p-10",
        className,
      )}
    >
      {/* Doku: ince çizgi ızgarası (merkezden kenara doğru söner) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"
      />
      {/* Eş merkezli halkalar (sağ üstte, hayalet numaranın arkasında) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24"
      >
        {[180, 280, 380].map((cap) => (
          <span
            key={cap}
            style={{ width: cap, height: cap }}
            className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 rounded-full border border-white/[0.06]"
          />
        ))}
      </div>

      {/* Slayta göre renklenen ışık haleleri */}
      <motion.div
        animate={{ backgroundColor: s.renk }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute -top-48 -right-32 size-[520px] rounded-full opacity-[0.13] blur-[120px]"
      />
      <motion.div
        animate={{ backgroundColor: s.renk }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute -bottom-56 -left-40 size-[480px] rounded-full opacity-[0.07] blur-[110px]"
      />

      {/* Hayalet slayt numarası */}
      <AnimatePresence mode="wait">
        <motion.span
          key={aktif}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 text-[200px] leading-none font-semibold tracking-tighter text-white/[0.045] select-none"
        >
          0{aktif + 1}
        </motion.span>
      </AnimatePresence>

      {/* Üst: marka */}
      <div className="relative flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="MobilyumPro"
          className="size-7 rounded-full border border-white/20"
        />
        <span className="text-sm font-medium text-white">MobilyumPro</span>
      </div>

      {/* Alt: slayt içeriği */}
      <div className="relative flex flex-col gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={aktif}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-start gap-4"
          >
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-medium tracking-wide text-white uppercase backdrop-blur-sm">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: s.renk }}
              />
              {s.etiket}
            </span>
            <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight text-white">
              {s.baslik}
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/55">
              {s.aciklama}
            </p>

            {/* Cam istatistik kartı */}
            <div className="mt-2 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3.5 backdrop-blur-sm">
              <span className="text-2xl font-semibold tracking-tight text-white tabular-nums">
                {s.istatistik.deger}
              </span>
              <span className="h-8 w-px bg-white/10" />
              <span className="max-w-40 text-xs leading-snug text-white/55">
                {s.istatistik.etiket}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* İlerleme çubukları + sayaç */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slaytlar.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slayt ${i + 1}`}
                onClick={() => setAktif(i)}
                className="h-1 w-12 cursor-pointer overflow-hidden rounded-full bg-white/15"
              >
                {i === aktif ? (
                  <motion.span
                    key={aktif}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: SURE_MS / 1000, ease: "linear" }}
                    className="block h-full bg-white"
                  />
                ) : (
                  <span
                    className={cn(
                      "block h-full",
                      i < aktif ? "w-full bg-white/40" : "w-0",
                    )}
                  />
                )}
              </button>
            ))}
          </div>
          <span className="text-xs text-white/40 tabular-nums">
            0{aktif + 1} / 0{slaytlar.length}
          </span>
        </div>
      </div>
    </div>
  );
}
