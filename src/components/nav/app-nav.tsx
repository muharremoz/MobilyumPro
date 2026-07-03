"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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

const DARALT_KEY = "mp_nav_daralt";

function useAktif() {
  const pathname = usePathname();
  const search = useSearchParams();
  const eslesir = (href: string) => {
    if (href === "/") return pathname === "/";
    const [p, q] = href.split("?");
    if (!pathname.startsWith(p)) return false;
    if (!q) return true;
    const want = new URLSearchParams(q);
    for (const [k, v] of want) {
      if (search.get(k) !== v) return false;
    }
    return true;
  };
  return {
    pathname,
    bolumAktif: (s: Section) => {
      if (s.href && s.href !== "#") return eslesir(s.href);
      return s.items?.some((it) => it.href !== "#" && eslesir(it.href)) ?? false;
    },
    ogeAktif: (href: string) => href !== "#" && eslesir(href),
  };
}

/** Sidebar bölüm satırı — geniş: ikon+etiket(+chevron), dar: sadece ikon (tooltip). */
function RailButton({
  section,
  active,
  open,
  daralt,
  onSelect,
}: {
  section: Section;
  active: boolean;
  open: boolean;
  daralt: boolean;
  onSelect: (s: Section) => void;
}) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const { RailIcon } = section;
  const altVar = !!section.items?.length;

  const btn = (
    <button
      type="button"
      aria-label={section.label}
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
      onClick={() => onSelect(section)}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        daralt ? "justify-center p-2" : "gap-2.5 px-2.5 py-2 text-sm",
        (active || open) &&
          "bg-sidebar-border text-foreground hover:bg-sidebar-border",
      )}
    >
      <RailIcon ref={ref} size={18} className="shrink-0" />
      {!daralt && (
        <span className="flex-1 truncate text-left">{section.label}</span>
      )}
      {!daralt && altVar && (
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground/50 transition-colors",
            open && "text-foreground",
          )}
        />
      )}
    </button>
  );

  if (!daralt) return btn;
  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent side="right">{section.label}</TooltipContent>
    </Tooltip>
  );
}

function RailUser({ daralt }: { daralt: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center rounded-lg text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring",
              daralt ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5",
            )}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">MO</AvatarFallback>
            </Avatar>
            {!daralt && (
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">Muharrem Öz</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  hi@mobilyumpro.com
                </p>
              </div>
            )}
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
  index,
  onNavigate,
}: {
  item: SubItem;
  active: boolean;
  index: number;
  onNavigate: () => void;
}) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const { icon: Icon } = item;
  const yakinda = item.href === "#";
  const animasyon =
    "animate-in fade-in slide-in-from-left-3 duration-300 fill-mode-backwards ease-out";
  const gecikme = { animationDelay: `${index * 35}ms` };
  return (
    <>
      {item.groupHeader && (
        <li
          className={cn(
            "mt-2 px-2.5 pt-1 pb-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase first:mt-0",
            animasyon,
          )}
          style={gecikme}
        >
          {item.groupHeader}
        </li>
      )}
      <li
        className={animasyon}
        style={gecikme}
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
    </>
  );
}

function AppNavInner() {
  const router = useRouter();
  const { pathname, bolumAktif, ogeAktif } = useAktif();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [daralt, setDaralt] = React.useState(false);

  // Daraltma durumunu localStorage'dan yükle.
  React.useEffect(() => {
    setDaralt(localStorage.getItem(DARALT_KEY) === "1");
  }, []);

  function daraltDegis() {
    setDaralt((d) => {
      const yeni = !d;
      localStorage.setItem(DARALT_KEY, yeni ? "1" : "0");
      if (yeni) setOpenId(null);
      return yeni;
    });
  }

  const acikBolum = React.useMemo(
    () => [...sections, ...bottomSections].find((s) => s.id === openId) ?? null,
    [openId],
  );

  React.useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

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
      {/* Sidebar */}
      <nav
        className={cn(
          "relative z-30 flex h-full shrink-0 flex-col gap-1 px-2 py-2 transition-[width] duration-200 ease-out",
          daralt ? "w-14" : "w-56",
        )}
      >
        {/* Başlık: logo + marka + daralt butonu */}
        <div
          className={cn(
            "flex items-center gap-2",
            daralt ? "flex-col" : "px-1",
          )}
        >
          <Link
            href="/"
            aria-label="MobilyumPro"
            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="MobilyumPro"
              className="size-full object-cover"
            />
          </Link>
          {!daralt && (
            <span className="flex-1 truncate text-sm font-semibold">
              MobilyumPro
            </span>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={daraltDegis}
                  aria-label={daralt ? "Genişlet" : "Daralt"}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  {daralt ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </button>
              }
            />
            <TooltipContent side="right">
              {daralt ? "Genişlet" : "Daralt"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Ana bölümler */}
        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <RailButton
              key={s.id}
              section={s}
              active={bolumAktif(s)}
              open={openId === s.id}
              daralt={daralt}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Alt bölümler + kullanıcı */}
        <div className="flex flex-col gap-0.5">
          {bottomSections.map((s) => (
            <RailButton
              key={s.id}
              section={s}
              active={bolumAktif(s)}
              open={openId === s.id}
              daralt={daralt}
              onSelect={handleSelect}
            />
          ))}
          <Separator className="my-1" />
          <RailUser daralt={daralt} />
        </div>
      </nav>

      {/* Panel: sidebar yanında yüzen rounded kart olarak açılır */}
      <div
        className={cn(
          "relative z-10 h-full shrink-0 overflow-hidden transition-[width,margin] duration-200 ease-out",
          acikBolum?.items
            ? "ml-2.5 w-[220px] rounded-[10px] border bg-card"
            : "ml-0 w-0",
        )}
      >
        {acikBolum?.items && (
          <aside className="flex h-full w-[220px] flex-col">
            <div className="flex h-10 shrink-0 items-center px-4">
              <span className="text-sm font-semibold">{acikBolum.label}</span>
            </div>
            <Separator />
            <nav className="flex-1 overflow-auto p-2">
              <ul key={acikBolum.id} className="flex flex-col gap-0.5">
                {acikBolum.items.map((it, i) => (
                  <PanelItem
                    key={it.label}
                    item={it}
                    index={i}
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

export function AppNav() {
  return (
    <React.Suspense fallback={null}>
      <AppNavInner />
    </React.Suspense>
  );
}
