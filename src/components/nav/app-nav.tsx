"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, User, Settings } from "lucide-react";
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
  const search = useSearchParams();
  // Hem path hem (varsa) query parametrelerini kıyaslar.
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
    // Bölüm aktifliği query-duyarlı: aynı path'i (ör. /stok-yonetimi) paylaşan
    // bölümlerden yalnızca eşleşen bölüm aktif olur.
    bolumAktif: (s: Section) => {
      if (s.href && s.href !== "#") return eslesir(s.href);
      return s.items?.some((it) => it.href !== "#" && eslesir(it.href)) ?? false;
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
              "flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              (active || open) &&
                "bg-sidebar-border text-foreground hover:bg-sidebar-border",
            )}
          >
            <RailIcon ref={ref} size={18} />
            <span className="line-clamp-2 text-center text-[10px] leading-tight">
              {section.label}
            </span>
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
  // Panel açılışında sırayla (stagger) içeri kayma animasyonu.
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
      {/* Rail — her zaman görünür, #FAFAFA zemine yüzer */}
      <nav className="relative z-30 flex h-full w-20 shrink-0 flex-col items-center gap-1 py-1">
        <Link
          href="/"
          aria-label="MobilyumPro"
          className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="MobilyumPro"
            className="size-full object-cover"
          />
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

      {/* Panel: rail yanında yüzen rounded kart olarak açılır */}
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
