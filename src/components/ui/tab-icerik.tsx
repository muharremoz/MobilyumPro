"use client";

import { motion } from "motion/react";

/**
 * PROJE STANDARDI — Sekme (tab) içerik geçiş animasyonu.
 *
 * Sekmeli sayfalarda aktif sekmenin içeriğini bununla sar; `tabKey`
 * değiştiğinde içerik yeniden mount olur ve fade + hafif yukarı kayma
 * ile gelir. Sayfa geçiş animasyonuyla ([(panel)/template.tsx]) aynı dil,
 * daha kısa süre.
 *
 * Kullanım:
 *   <TabIcerik tabKey={tab}>
 *     {tab === "genel" && <GenelTab .../>}
 *     {tab === "fiyat" && <FiyatTab .../>}
 *   </TabIcerik>
 */
export function TabIcerik({
  tabKey,
  children,
  className,
}: {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
