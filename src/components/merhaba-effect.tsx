"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * "merhaba" — Apple hello efektinin Türkçe karşılığı.
 * El yazısı font + soldan sağa clip-path açılımıyla yazılıyormuş hissi verir.
 */
export function MerhabaEffect({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn("select-none leading-none", className)}
      initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
      animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
      transition={{
        clipPath: { duration: 2.4, ease: "easeInOut", delay: 0.5 },
        opacity: { duration: 0.4, delay: 0.5 },
      }}
    >
      merhaba
    </motion.span>
  );
}
