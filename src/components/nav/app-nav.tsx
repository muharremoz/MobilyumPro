"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Search,
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
        "group/rail flex h-9 w-full shrink-0 cursor-pointer items-center rounded-md text-sm font-medium text-[#4d4d4d] transition-colors hover:bg-[#f2f2f2] hover:text-[#171717]",
        daralt ? "justify-center" : "gap-2 px-2",
        (active || open) && "bg-[#ebebeb] text-[#171717] hover:bg-[#ebebeb]",
      )}
    >
      <RailIcon ref={ref} size={16} className="shrink-0" />
      {!daralt && (
        <span className="flex-1 truncate text-left">{section.label}</span>
      )}
      {!daralt && altVar && (
        <span
          className={cn(
            "-mr-1 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors group-hover/rail:bg-black/[0.07]",
            open && "bg-black/[0.07]",
          )}
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover/rail:text-[#171717]",
              open && "text-[#171717]",
            )}
          />
        </span>
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
              "flex h-9 w-full cursor-pointer items-center rounded-full text-left outline-none transition-colors hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-ring",
              daralt ? "justify-center" : "gap-2 px-1.5",
            )}
          >
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="text-[10px]">MO</AvatarFallback>
            </Avatar>
            {!daralt && (
              <span className="min-w-0 flex-1 truncate text-sm text-[#171717]">
                Muharrem Öz
              </span>
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
      {/* Grup adı gösterilmez; gruplar arasına ince çizgi konur (ilk grup hariç). */}
      {item.groupHeader && index > 0 && (
        <li
          aria-hidden="true"
          className={cn("my-1 h-px bg-[#ebebeb]", animasyon)}
          style={gecikme}
        />
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
            "flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-[#4d4d4d] transition-colors hover:bg-[#f2f2f2] hover:text-[#171717]",
            active && "bg-[#ebebeb] text-[#171717] hover:bg-[#ebebeb]",
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
  const { bolumAktif, ogeAktif } = useAktif();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [daralt, setDaralt] = React.useState(false);
  // Drill-in'den geri dönüşte ana menü de aynı animasyonla gelsin (ilk
  // yüklemede oynamaz; her dönüşte key değişip animasyon yeniden tetiklenir).
  const [donus, setDonus] = React.useState(0);
  // Sidebar araması (Vercel "Find…") — yazınca tüm menü öğeleri süzülür.
  const [arama, setArama] = React.useState("");
  const aramaRef = React.useRef<HTMLInputElement>(null);

  // "F" kısayolu arama alanına odaklanır (Vercel'deki gibi).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement;
      if (
        e.key.toLowerCase() === "f" &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(hedef.tagName) &&
        !hedef.isContentEditable
      ) {
        e.preventDefault();
        aramaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Arama sonuçları: tüm bölümler + alt öğeler içinde düz liste.
  const aramaSonuclari = React.useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    if (!q) return null;
    const sonuc: SubItem[] = [];
    for (const s of [...sections, ...bottomSections]) {
      if (s.href && s.href !== "#" && s.label.toLocaleLowerCase("tr").includes(q)) {
        sonuc.push({ label: s.label, href: s.href, icon: s.RailIcon });
      }
      for (const it of s.items ?? []) {
        if (it.href !== "#" && it.label.toLocaleLowerCase("tr").includes(q)) {
          sonuc.push(it);
        }
      }
    }
    return sonuc;
  }, [arama]);

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
      if (e.key === "Escape") {
        setOpenId(null);
        setDonus((d) => d + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  function handleSelect(s: Section) {
    if (s.items?.length) {
      // Dar moddayken alt menü açılırsa sidebar'ı genişlet (drill-in sığsın).
      if (daralt) {
        setDaralt(false);
        localStorage.setItem(DARALT_KEY, "0");
      }
      setOpenId((prev) => (prev === s.id ? null : s.id));
    } else {
      setOpenId(null);
      if (s.href && s.href !== "#") router.push(s.href);
    }
  }

  return (
    <TooltipProvider delay={200}>
      {/* Sidebar — Vercel dashboard yapısı: #fafafa zemin, sağda ince çizgi,
          kenar ortasında hover'da beliren yuvarlak daralt butonu */}
      <nav
        className={cn(
          "group/nav relative z-30 flex h-full shrink-0 flex-col border-r border-[#ebebeb] bg-[#fafafa] px-2 pb-2 transition-[width] duration-200 ease-out",
          daralt ? "w-14" : "w-64",
        )}
      >
        {/* Başlık: logo + marka */}
        <Link
          href="/"
          aria-label="MobilyumPro"
          className={cn(
            // Header'la (h-14) aynı yükseklik — üst şeritler hizalı
            "flex h-14 shrink-0 items-center rounded-md transition-colors hover:bg-[#f2f2f2]",
            daralt ? "justify-center" : "gap-2 px-2",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="MobilyumPro"
              className="size-full object-cover"
            />
          </span>
          {!daralt && (
            <span className="flex-1 truncate text-[15px] font-medium text-[#171717]">
              MobilyumPro
            </span>
          )}
        </Link>

        {/* Kenar ortasında daralt/genişlet butonu (hover'da belirir) */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={daraltDegis}
                aria-label={daralt ? "Genişlet" : "Daralt"}
                className="absolute top-1/2 -right-3 z-40 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#ebebeb] bg-white text-muted-foreground opacity-0 transition-opacity group-hover/nav:opacity-100 hover:text-foreground focus-visible:opacity-100"
              >
                {daralt ? (
                  <ChevronRight className="size-3.5" />
                ) : (
                  <ChevronLeft className="size-3.5" />
                )}
              </button>
            }
          />
          <TooltipContent side="right">
            {daralt ? "Genişlet" : "Daralt"}
          </TooltipContent>
        </Tooltip>

        {/* Arama (Vercel "Find…"): beyaz alan + ring, solda büyüteç, sağda F rozeti */}
        {!daralt && (
          <div className="mt-2 flex h-9 shrink-0 items-center gap-2 rounded-md bg-white bg-clip-padding pr-1.5 pl-2.5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.16),0_0_0_4px_rgba(0,0,0,0.16)]">
            <Search className="size-4 shrink-0 text-[#8f8f8f]" />
            <input
              ref={aramaRef}
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setArama("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Ara…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8f8f8f]"
            />
            {!arama && (
              <kbd className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[#fafafa] text-xs text-[#666] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
                F
              </kbd>
            )}
          </div>
        )}

        {/* Ana bölümler / drill-in alt menü (panel sidebar'ın yerinde açılır) */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {aramaSonuclari && !daralt ? (
            <nav>
              <ul key={arama} className="flex flex-col gap-px">
                {aramaSonuclari.map((it, i) => (
                  <PanelItem
                    key={`${it.href}-${it.label}`}
                    item={it}
                    index={i}
                    active={ogeAktif(it.href)}
                    onNavigate={() => setArama("")}
                  />
                ))}
                {aramaSonuclari.length === 0 && (
                  <li className="px-2 py-3 text-sm text-[#8f8f8f]">
                    Sonuç bulunamadı
                  </li>
                )}
              </ul>
            </nav>
          ) : acikBolum?.items && !daralt ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setDonus((d) => d + 1);
                }}
                className="flex h-9 w-full shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f2f2f2] animate-in fade-in slide-in-from-left-3 duration-300 ease-out"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left">
                  {acikBolum.label}
                </span>
              </button>
              <div
                aria-hidden="true"
                className="my-1 h-px shrink-0 bg-[#ebebeb] duration-300 animate-in fade-in"
              />
              <nav>
                <ul key={acikBolum.id} className="flex flex-col gap-px">
                  {acikBolum.items.map((it, i) => (
                    <PanelItem
                      key={it.label}
                      item={it}
                      index={i}
                      active={ogeAktif(it.href)}
                      onNavigate={() => {}}
                    />
                  ))}
                </ul>
              </nav>
            </>
          ) : (
            <div key={donus} className="flex flex-col gap-px">
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    donus > 0 &&
                      "animate-in fade-in slide-in-from-left-3 duration-300 fill-mode-backwards ease-out",
                  )}
                  style={donus > 0 ? { animationDelay: `${i * 35}ms` } : undefined}
                >
                  <RailButton
                    section={s}
                    active={bolumAktif(s)}
                    open={openId === s.id}
                    daralt={daralt}
                    onSelect={handleSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alt bölümler + kullanıcı */}
        <div className="flex flex-col gap-px">
          <Separator className="my-1 bg-[#ebebeb]" />
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
          <Separator className="my-1 bg-[#ebebeb]" />
          <RailUser daralt={daralt} />
        </div>
      </nav>

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
