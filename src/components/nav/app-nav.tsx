"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sofa, LogOut, User, Settings } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  sections,
  bottomSections,
  type AnimatedIconHandle,
  type Section,
  type SubItem,
} from "@/components/nav/nav-config";

function useAktif() {
  const pathname = usePathname();
  const eslesir = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href.split("?")[0]);

  return {
    pathname,
    bolumAktif: (s: Section) => {
      if (s.href && s.href !== "#") return eslesir(s.href);
      return (
        s.items?.some((it) => it.href !== "#" && eslesir(it.href)) ?? false
      );
    },
    ogeAktif: (href: string) => href !== "#" && eslesir(href),
  };
}

/** Rail'deki tek bölüm düğmesi — hover'da pqoqubbw ikonunu oynatır. */
function RailButton({
  section,
  active,
  open,
  onSelect,
}: {
  section: Section;
  active: boolean;
  open: boolean;
  onSelect: (s: Section) => void;
}) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const { RailIcon } = section;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={section.label}
            onMouseEnter={() => ref.current?.startAnimation()}
            onMouseLeave={() => ref.current?.stopAnimation()}
            onClick={() => onSelect(section)}
            className={cn(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              (active || open) && "bg-sidebar-accent text-foreground",
            )}
          >
            <RailIcon ref={ref} size={18} />
          </button>
        }
      />
      <TooltipContent side="right">{section.label}</TooltipContent>
    </Tooltip>
  );
}

function RailUser() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="cursor-pointer rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">MO</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent side="right" align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="leading-tight">
            <p className="text-sm font-medium">Muharrem Öz</p>
            <p className="text-xs font-normal text-muted-foreground">
              hi@mobilyumpro.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" /> Profil
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" /> Ayarlar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => toast.success("Çıkış yapıldı (demo)")}
        >
          <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Panel alt menü öğesi — satır hover'ında pqoqubbw ikonunu oynatır. */
function PanelItem({
  item,
  active,
  onNavigate,
}: {
  item: SubItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const { icon: Icon } = item;
  const yakinda = item.href === "#";
  return (
    <li
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
    >
      <Link
        href={item.href}
        onClick={(e) => {
          if (yakinda) e.preventDefault();
          else onNavigate();
        }}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-foreground",
          active && "bg-sidebar-accent font-medium text-foreground",
          yakinda && "text-muted-foreground/60",
        )}
      >
        <Icon ref={ref} size={16} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

export function AppNav() {
  const router = useRouter();
  const { pathname, bolumAktif, ogeAktif } = useAktif();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const acikBolum = React.useMemo(
    () => [...sections, ...bottomSections].find((s) => s.id === openId) ?? null,
    [openId],
  );

  // Esc ile paneli kapat.
  React.useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  // Rota değişince paneli kapat.
  React.useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  function handleSelect(s: Section) {
    if (s.items?.length) {
      setOpenId((prev) => (prev === s.id ? null : s.id));
    } else {
      setOpenId(null);
      if (s.href && s.href !== "#") router.push(s.href);
    }
  }

  return (
    <TooltipProvider delay={200}>
      {/* Rail — her zaman görünür */}
      <nav className="relative z-30 flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-2.5">
        <Link
          href="/"
          aria-label="MobilyumPro"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <Sofa className="h-4 w-4" />
        </Link>

        <div className="mt-3 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <RailButton
              key={s.id}
              section={s}
              active={bolumAktif(s)}
              open={openId === s.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          {bottomSections.map((s) => (
            <RailButton
              key={s.id}
              section={s}
              active={bolumAktif(s)}
              open={openId === s.id}
              onSelect={handleSelect}
            />
          ))}
          <Separator className="my-1 w-6" />
          <RailUser />
        </div>
      </nav>

      {/* Panel: rail'in içinden çıkar, içeriği sağa iter (push) */}
      <div
        className={cn(
          "relative z-10 h-full shrink-0 overflow-hidden bg-[#f4efe9] transition-[width] duration-200 ease-out",
          acikBolum?.items ? "w-[220px] border-r" : "w-0",
        )}
      >
        {acikBolum?.items && (
          <aside className="flex h-full w-[220px] flex-col">
            <div className="flex h-10 shrink-0 items-center px-4">
              <span className="text-sm font-semibold">{acikBolum.label}</span>
            </div>
            <Separator />
            <nav className="flex-1 overflow-auto p-2">
              <ul className="flex flex-col gap-0.5">
                {acikBolum.items.map((it) => (
                  <PanelItem
                    key={it.label}
                    item={it}
                    active={ogeAktif(it.href)}
                    onNavigate={() => setOpenId(null)}
                  />
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </TooltipProvider>
  );
}
