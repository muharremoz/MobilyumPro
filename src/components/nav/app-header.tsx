"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sections, bottomSections } from "@/components/nav/nav-config";

function getCrumbs(pathname: string): string[] {
  const match = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);

  for (const s of [...sections, ...bottomSections]) {
    const it = s.items?.find((i) => i.href !== "#" && match(i.href));
    if (it) return [s.label, it.label];
    if (s.href && s.href !== "#" && match(s.href)) return [s.label];
  }
  return ["Genel Bakış"];
}

export function AppHeader() {
  const pathname = usePathname();
  const crumbs = getCrumbs(pathname);

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={
                i === crumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Bildirimler">
          <Bell />
        </Button>
      </div>
    </header>
  );
}
