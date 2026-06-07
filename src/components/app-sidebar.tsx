"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sofa, ChevronRight } from "lucide-react";

import { LayoutPanelTopIcon } from "@/components/ui/icons/layout-panel-top";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { CartIcon } from "@/components/ui/icons/cart";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { UsersIcon } from "@/components/ui/icons/users";
import { SettingsIcon } from "@/components/ui/icons/settings";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Kategori } from "@/lib/data";

// Tüm pqoqubbw ikonları aynı imperative handle'ı paylaşır.
type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
type AnimatedIcon = React.ForwardRefExoticComponent<
  { size?: number; className?: string } & React.RefAttributes<AnimatedIconHandle>
>;

type NavLink = { baslik: string; href: string; Icon: AnimatedIcon };

const anaMenu: NavLink[] = [
  { baslik: "Genel Bakış", href: "/", Icon: LayoutPanelTopIcon as AnimatedIcon },
  { baslik: "Siparişler", href: "/siparisler", Icon: CartIcon as AnimatedIcon },
  { baslik: "Müşteriler", href: "/musteriler", Icon: UsersIcon as AnimatedIcon },
];

const kategoriler: Kategori[] = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];

function useAktif() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]);
}

/** Satır hover'ında pqoqubbw ikonunu tetikleyen menü öğesi. */
function NavItem({ item, aktif }: { item: NavLink; aktif: boolean }) {
  const ref = React.useRef<AnimatedIconHandle>(null);
  const { Icon } = item;
  return (
    <SidebarMenuItem
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
    >
      <SidebarMenuButton
        isActive={aktif}
        tooltip={item.baslik}
        className="text-[13px]"
        render={<Link href={item.href} />}
      >
        <Icon ref={ref} size={18} />
        <span>{item.baslik}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Genişleyebilir "Kategoriler" ağacı (referanstaki Folders gibi). */
function KategoriGrubu() {
  const [open, setOpen] = React.useState(true);
  const ref = React.useRef<AnimatedIconHandle>(null);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem
        onMouseEnter={() => ref.current?.startAnimation()}
        onMouseLeave={() => ref.current?.stopAnimation()}
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip="Kategoriler" className="text-[13px]">
              <FolderOpenIcon ref={ref} size={18} />
              <span>Kategoriler</span>
              <ChevronRight
                className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  open ? "rotate-90" : ""
                }`}
              />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {kategoriler.map((k) => (
              <SidebarMenuSubItem key={k}>
                <SidebarMenuSubButton
                  className="text-[13px]"
                  render={
                    <Link href={`/urunler?kategori=${encodeURIComponent(k)}`} />
                  }
                >
                  <span>{k}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const aktifMi = useAktif();
  const settingsRef = React.useRef<AnimatedIconHandle>(null);

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sofa className="h-4 w-4" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold">MobilyumPro</p>
            <p className="text-[11px] text-muted-foreground">Yönetim Paneli</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Ana menü */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {anaMenu.map((item) => (
                <NavItem key={item.href} item={item} aktif={aktifMi(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Katalog bölümü */}
        <SidebarGroup>
          <SidebarGroupLabel>Katalog</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                item={{
                  baslik: "Ürünler",
                  href: "/urunler",
                  Icon: RockingChairIcon as AnimatedIcon,
                }}
                aktif={aktifMi("/urunler")}
              />
              <KategoriGrubu />
              <NavItem
                item={{
                  baslik: "Stok",
                  href: "/stok",
                  Icon: BoxesIcon as AnimatedIcon,
                }}
                aktif={aktifMi("/stok")}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem
            onMouseEnter={() => settingsRef.current?.startAnimation()}
            onMouseLeave={() => settingsRef.current?.stopAnimation()}
          >
            <SidebarMenuButton
              isActive={aktifMi("/ayarlar")}
              tooltip="Ayarlar"
              className="text-[13px]"
              render={<Link href="/ayarlar" />}
            >
              <SettingsIcon ref={settingsRef} size={18} />
              <span>Ayarlar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
