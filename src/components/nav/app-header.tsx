"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sections,
  bottomSections,
  type AnimatedIcon,
} from "@/components/nav/nav-config";
import { urunler } from "@/lib/data";

type Crumb = { label: string; href?: string };
type CrumbSonuc = { crumbs: Crumb[]; Icon?: AnimatedIcon; meta?: string };

/** Bir href'e karşılık gelen nav ikonunu bulur (alt menü veya bölüm rail ikonu). */
function iconForHref(href: string): AnimatedIcon | undefined {
  const base = href.split("?")[0];
  for (const s of [...sections, ...bottomSections]) {
    const it = s.items?.find((i) => i.href.split("?")[0] === base);
    if (it) return it.icon;
    if (s.href && s.href.split("?")[0] === base) return s.RailIcon;
  }
  return undefined;
}

function getCrumbs(
  pathname: string,
  search: URLSearchParams,
): CrumbSonuc {
  // Bir SubItem'ın href'i (path?query) tam eşleşiyor mu?
  const fullMatch = (href: string) => {
    const [path, query] = href.split("?");
    if (path !== "/" && !pathname.startsWith(path)) return false;
    if (path === "/" && pathname !== "/") return false;
    if (!query) return true;
    const want = new URLSearchParams(query);
    for (const [k, v] of want) {
      if (search.get(k) !== v) return false;
    }
    return true;
  };

  // Nav'da olmayan özel sayfalar
  if (pathname.startsWith("/uretim/plan")) {
    return {
      crumbs: [{ label: "Üretim Takibi" }, { label: "Üretim Planla" }],
      Icon: iconForHref("/uretim/recete"),
    };
  }
  if (pathname === "/urunler/yeni") {
    return {
      crumbs: [
        { label: "Stok Yönetimi" },
        { label: "Modeller", href: "/urunler" },
        { label: "Yeni Model" },
      ],
      Icon: iconForHref("/urunler"),
    };
  }
  if (/^\/urunler\/[^/]+\/duzenle$/.test(pathname)) {
    const id = pathname.split("/")[2];
    const urun = urunler.find((u) => u.id === id);
    return {
      crumbs: [
        { label: "Stok Yönetimi" },
        { label: "Modeller", href: "/urunler" },
        { label: urun?.ad ?? "Model", href: `/urunler/${id}` },
        { label: "Düzenle" },
      ],
      Icon: iconForHref("/urunler"),
    };
  }
  if (/^\/urunler\/[^/]+$/.test(pathname)) {
    const id = pathname.split("/")[2];
    const urun = urunler.find((u) => u.id === id);
    return {
      crumbs: [
        { label: "Stok Yönetimi" },
        { label: "Modeller", href: "/urunler" },
        { label: urun?.ad ?? "Model" },
      ],
      Icon: iconForHref("/urunler"),
      meta: urun?.id,
    };
  }
  if (pathname === "/cari/yeni") {
    return {
      crumbs: [
        { label: "Cari Yönetimi" },
        { label: "Cari Hesaplar", href: "/cari" },
        { label: "Yeni Cari" },
      ],
      Icon: iconForHref("/cari"),
    };
  }
  if (/^\/cari\/[^/]+$/.test(pathname)) {
    return {
      crumbs: [
        { label: "Cari Yönetimi" },
        { label: "Cari Hesaplar", href: "/cari" },
        { label: "Cari Düzenle" },
      ],
      Icon: iconForHref("/cari"),
    };
  }
  if (pathname.startsWith("/kullanicilar/yetkiler")) {
    return {
      crumbs: [
        { label: "Ayarlar" },
        { label: "Kullanıcılar & Roller", href: "/kullanicilar" },
        { label: "Yetkilendirmeler" },
      ],
      Icon: iconForHref("/kullanicilar"),
    };
  }

  const tumBolumler = [...sections, ...bottomSections];

  // 1) Önce TÜM bölümlerde tam (path+query) eşleşmeyi ara — aynı path'i paylaşan
  //    bölümlerde doğru olanı bulmak için (ör. /stok-yonetimi?bolum=...).
  for (const s of tumBolumler) {
    const exact = s.items?.find((i) => i.href !== "#" && fullMatch(i.href));
    if (exact)
      return {
        crumbs: [{ label: s.label }, { label: exact.label }],
        Icon: exact.icon,
      };
  }

  // 2) Tam eşleşme yoksa path eşleşmesine düş.
  for (const s of tumBolumler) {
    const pathOnly = s.items?.find((i) => {
      if (i.href === "#") return false;
      const [p] = i.href.split("?");
      return p !== "/" ? pathname.startsWith(p) : pathname === "/";
    });
    if (pathOnly)
      return {
        crumbs: [{ label: s.label }, { label: pathOnly.label }],
        Icon: pathOnly.icon,
      };
    if (s.href && s.href !== "#") {
      const [p] = s.href.split("?");
      if (p === "/" ? pathname === "/" : pathname.startsWith(p)) {
        return { crumbs: [{ label: s.label }], Icon: s.RailIcon };
      }
    }
  }
  return { crumbs: [{ label: "Genel Bakış" }], Icon: sections[0]?.RailIcon };
}

function AppHeaderInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { crumbs, Icon, meta } = getCrumbs(pathname, search);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#f2f2f2] bg-[#fafafa] px-4 md:px-6">
      {Icon && (
        <Icon size={20} className="shrink-0 text-foreground" />
      )}
      <nav className="flex items-center gap-2 text-[15px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
              {!last && c.href ? (
                <Link
                  href={c.href}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={
                    last
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
        {meta && (
          <span className="ml-1.5 rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {meta}
          </span>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Bildirimler"
          className="[&_svg]:size-4.5"
        >
          <Bell />
        </Button>
      </div>
    </header>
  );
}

export function AppHeader() {
  return (
    <Suspense
      fallback={
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4 md:px-6" />
      }
    >
      <AppHeaderInner />
    </Suspense>
  );
}
