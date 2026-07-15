import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Liste kartı başlığı — proje standardı (ilk kullanım: kullanıcılar listesi).
 * Kartın en üstünde kompakt bir şerit: solda başlık, sağda aksiyon butonları.
 *
 * Kullanım:
 *   <div className="overflow-hidden rounded-md border bg-card">
 *     <ListHeader title="Kullanıcılar">
 *       <Button variant="outline">…</Button>
 *       <Button>Yeni Kullanıcı</Button>
 *     </ListHeader>
 *     <Table>…</Table>
 *   </div>
 */
export function ListHeader({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Sağa yaslanan aksiyonlar (genelde butonlar). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Primary'nin açık tonu — kart başlık şeridi
        "flex items-center justify-between gap-3 border-b bg-primary/10 px-3 py-1.5",
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {children && (
        <div className="flex items-center gap-1.5">{children}</div>
      )}
    </div>
  );
}
