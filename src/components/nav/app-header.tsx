"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sections, bottomSections } from "@/components/nav/nav-config";

type Crumb = { label: string; href?: string };

function getCrumbs(
  pathname: string,
  search: URLSearchParams,
): Crumb[] {
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
    return [{ label: "Üretim Takibi" }, { label: "Üretim Planla" }];
  }
  if (pathname === "/urunler/yeni") {
    return [
      { label: "Stok Yönetimi" },
      { label: "Ürünler", href: "/urunler" },
      { label: "Yeni Ürün" },
    ];
  }
  if (/^\/urunler\/[^/]+$/.test(pathname)) {
    return [
      { label: "Stok Yönetimi" },
      { label: "Ürünler", href: "/urunler" },
      { label: "Ürünü Düzenle" },
    ];
  }
  if (pathname === "/cari/yeni") {
    return [
      { label: "Cari Yönetimi" },
      { label: "Cari Hesaplar", href: "/cari" },
      { label: "Yeni Cari" },
    ];
  }
  if (/^\/cari\/[^/]+$/.test(pathname)) {
    return [
      { label: "Cari Yönetimi" },
      { label: "Cari Hesaplar", href: "/cari" },
      { label: "Cari Düzenle" },
    ];
  }

  for (const s of [...sections, ...bottomSections]) {
    const exact = s.items?.find((i) => i.href !== "#" && fullMatch(i.href));
    if (exact) return [{ label: s.label }, { label: exact.label }];
    // Aynı path'te query yoksa veya başka querylik öğelere düşmemiş — path eşleşeni kullan
    const pathOnly = s.items?.find((i) => {
      if (i.href === "#") return false;
      const [p] = i.href.split("?");
      return p !== "/" ? pathname.startsWith(p) : pathname === "/";
    });
    if (pathOnly) return [{ label: s.label }, { label: pathOnly.label }];
    if (s.href && s.href !== "#") {
      const [p] = s.href.split("?");
      if (p === "/" ? pathname === "/" : pathname.startsWith(p)) {
        return [{ label: s.label }];
      }
    }
  }
  return [{ label: "Genel Bakış" }];
}

function AppHeaderInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const crumbs = getCrumbs(pathname, search);

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
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
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Bildirimler">
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
