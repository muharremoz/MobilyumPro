"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/** Liste satırının sağ tık menüsündeki tek aksiyon. */
export type SatirAksiyon = {
  etiket: string;
  /** lucide ikonu (16px basılır). */
  ikon?: React.ComponentType<{ className?: string }>;
  /** Alt menüsü olan öğelerde verilmez. */
  onSecim?: () => void;
  /** Alt menü (örn. "Kopyala → Kod / Ad / Bağlantı"). İç içe olabilir. */
  altAksiyonlar?: SatirAksiyon[];
  /** Sağda gösterilen kısayol ipucu (örn. "⏎"). */
  kisayol?: string;
  /** Silme gibi geri dönüşsüz işlemler — kırmızı gösterilir, sona konur. */
  tehlike?: boolean;
  /** Bu öğeden önce ayraç çizgisi. */
  ayracOnce?: boolean;
  /** Koşullu öğeler: false ise menüde görünmez (yetki/durum). */
  gizli?: boolean;
  pasif?: boolean;
  /** Alt menü genişliği (varsayılan w-44). */
  altClassName?: string;
};

/** Aksiyon listesini menü öğelerine çevirir (alt menüler için kendini çağırır). */
function ogeler(aksiyonlar: SatirAksiyon[]) {
  return aksiyonlar
    .filter((a) => !a.gizli)
    .map((a, i) => (
      <React.Fragment key={`${a.etiket}-${i}`}>
        {a.ayracOnce && i > 0 && <ContextMenuSeparator />}
        {a.altAksiyonlar ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              {a.ikon && <a.ikon className="mr-2 size-4" />}
              {a.etiket}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className={cn("w-44", a.altClassName)}>
              {ogeler(a.altAksiyonlar)}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : (
          <ContextMenuItem
            disabled={a.pasif}
            variant={a.tehlike ? "destructive" : undefined}
            onClick={a.onSecim}
          >
            {a.ikon && <a.ikon className="mr-2 size-4" />}
            {a.etiket}
            {a.kisayol && (
              <ContextMenuShortcut>{a.kisayol}</ContextMenuShortcut>
            )}
          </ContextMenuItem>
        )}
      </React.Fragment>
    ));
}

/**
 * Liste satırlarının STANDART sağ tık menüsü. Tüm listelerde aynı davranış:
 * satırı `render` ile sarar, aksiyonları tek yerden tanımlarsınız.
 *
 *   <SatirMenu
 *     aksiyonlar={[
 *       { etiket: "Düzenle", ikon: Pencil, onSecim: () => ac(s) },
 *       { etiket: "Sil", ikon: Trash2, tehlike: true, onSecim: () => sil(s) },
 *     ]}
 *   >
 *     <TableRow>…</TableRow>
 *   </SatirMenu>
 *
 * Görünür aksiyon yoksa satır menüsüz basılır (boş menü açılmaz).
 */
export function SatirMenu({
  aksiyonlar,
  className,
  children,
}: {
  aksiyonlar: SatirAksiyon[];
  /** Menü genişliği (varsayılan w-48). */
  className?: string;
  /** Sarılacak satır — genelde <TableRow>. */
  children: React.ReactElement;
}) {
  const gorunur = aksiyonlar.filter((a) => !a.gizli);
  if (gorunur.length === 0) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className={cn("w-48", className)}>
        {ogeler(gorunur)}
      </ContextMenuContent>
    </ContextMenu>
  );
}
