"use client";

import { motion } from "motion/react";

/**
 * PROJE STANDARDI — Panel sayfa geçiş animasyonu.
 *
 * Next `template.tsx`: layout kalıcı kalırken bu bileşen HER sayfa
 * navigasyonunda yeniden mount edilir. Böylece panel altındaki tüm
 * sayfalar (yeni eklenenler dahil) otomatik olarak aynı yumuşak
 * geçişi alır — sayfa bazında ekstra bir şey yapmaya gerek yok.
 *
 * Not: yalnızca giriş (enter) animasyonu; hafif yukarı kayma + fade.
 * Yükseklik zincirini bozmamak için h-full/min-h-0 (fabrika 3D sahnesi
 * gibi tam yükseklik isteyen sayfalar için).
 *
 * `after:` boşluğu: içerik bu kutuyu taştığında (uzun listeler) kaydırma
 * kabının alt dolgusu taşan içeriğin ardına uygulanmaz — sayfalama şeridi
 * ekranın dibine yapışırdı. Akışta içerikten sonra gelen bu blok, taşmayı
 * uzatarak gerçek bir alt boşluk bırakır.
 *
 * Yükseklik bu yüzden 100% değil 100%-1.5rem: boşluk kutunun dışına eklenip
 * tam yükseklik isteyen sayfalarda (fabrika 3D) gereksiz kaydırma açmasın.
 */
export default function PanelTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="h-[calc(100%-1.5rem)] min-h-0 after:block after:h-6 after:content-['']"
    >
      {children}
    </motion.div>
  );
}
