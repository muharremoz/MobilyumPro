import * as React from "react";

import { LayoutPanelTopIcon } from "@/components/ui/icons/layout-panel-top";
import { CartIcon } from "@/components/ui/icons/cart";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { HammerIcon } from "@/components/ui/icons/hammer";
import { ChartPieIcon } from "@/components/ui/icons/chart-pie";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { SettingsIcon } from "@/components/ui/icons/settings";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { UsersIcon } from "@/components/ui/icons/users";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { ClipboardCheckIcon } from "@/components/ui/icons/clipboard-check";
import { LayersIcon } from "@/components/ui/icons/layers";
import { CpuIcon } from "@/components/ui/icons/cpu";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { ActivityIcon } from "@/components/ui/icons/activity";
import { HistoryIcon } from "@/components/ui/icons/history";
import { FolderTreeIcon } from "@/components/ui/icons/folder-tree";
import { FrameIcon } from "@/components/ui/icons/frame";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { SlidersHorizontalIcon } from "@/components/ui/icons/sliders-horizontal";

// Tüm pqoqubbw ikonları aynı imperative handle'ı paylaşır.
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
export type AnimatedIcon = React.ForwardRefExoticComponent<
  { size?: number; className?: string } & React.RefAttributes<AnimatedIconHandle>
>;

export type SubItem = {
  label: string;
  href: string;
  icon: AnimatedIcon;
  /** Bu öğenin hemen üstünde gösterilecek küçük grup başlığı (opsiyonel). */
  groupHeader?: string;
};

export type Section = {
  id: string;
  label: string;
  RailIcon: AnimatedIcon;
  /** Doğrudan gidilen bölüm (panel açmaz). */
  href?: string;
  /** Panelde gösterilen alt menüler. */
  items?: SubItem[];
};

const I = (c: unknown) => c as AnimatedIcon;

// Modüller — yalnızca sayfası yapılmış olanlar listelenir; yeni modül
// sayfası açıldıkça buraya eklenir. Hem rail hem alt menü ikonları
// pqoqubbw animasyonlu.
export const sections: Section[] = [
  {
    id: "genel-bakis",
    label: "Genel Bakış",
    RailIcon: I(LayoutPanelTopIcon),
    href: "/",
  },
  {
    id: "stok",
    label: "Stok Yönetimi",
    RailIcon: I(BoxesIcon),
    items: [
      { groupHeader: "Stok", label: "Modeller", href: "/urunler", icon: I(RockingChairIcon) },
      { label: "Stok Durumu", href: "/stok-yonetimi?bolum=durum", icon: I(BoxesIcon) },
      { label: "Stok Takip", href: "/stok-yonetimi?bolum=takip", icon: I(ActivityIcon) },
      { label: "Stok Hareketleri", href: "/stok-yonetimi?bolum=hareketler", icon: I(HistoryIcon) },
      { label: "Depolar", href: "/stok-yonetimi?bolum=depolar", icon: I(BlocksIcon) },
      { label: "Sayım", href: "/stok-yonetimi?bolum=sayim", icon: I(ClipboardCheckIcon) },
    ],
  },
  {
    id: "tanimlamalar",
    label: "Tanımlamalar",
    RailIcon: I(SlidersHorizontalIcon),
    items: [
      { groupHeader: "Üretim", label: "Malzemeler", href: "/stok-yonetimi?bolum=malzemeler", icon: I(LayersIcon) },
      { label: "Parçalar", href: "/stok-yonetimi?bolum=parcalar", icon: I(CpuIcon) },
      { label: "Reçete Oluşturma", href: "/uretim/recete", icon: I(ClipboardCheckIcon) },
      { label: "Malzeme Poşeti", href: "/uretim/poset", icon: I(BoxesIcon) },
      { groupHeader: "Model", label: "Gruplar", href: "/stok-yonetimi?bolum=gruplar", icon: I(FolderTreeIcon) },
      { label: "Markalar", href: "/stok-yonetimi?bolum=markalar", icon: I(BadgePercentIcon) },
      { label: "Koleksiyonlar", href: "/stok-yonetimi?bolum=koleksiyonlar", icon: I(FrameIcon) },
      { groupHeader: "Özellik", label: "Renkler", href: "/stok-yonetimi?bolum=renkler", icon: I(ChartPieIcon) },
      { label: "Kumaşlar", href: "/stok-yonetimi?bolum=kumaslar", icon: I(SlidersHorizontalIcon) },
      { label: "Birimler", href: "/stok-yonetimi?bolum=birimler", icon: I(ScanTextIcon) },
    ],
  },
  {
    id: "siparis",
    label: "Sipariş Yönetimi",
    RailIcon: I(CartIcon),
    items: [
      { label: "Siparişler", href: "/siparisler", icon: I(CartIcon) },
      { label: "Müşteriler", href: "/musteriler", icon: I(UsersIcon) },
    ],
  },
  {
    id: "uretim-plan",
    label: "Üretim Planı",
    RailIcon: I(CalendarDaysIcon),
    href: "/uretim/plan",
  },
  {
    id: "uretim-takibi",
    label: "Üretim Takibi",
    RailIcon: I(HammerIcon),
    items: [
      { label: "Üretim Emirleri", href: "/uretim/emirler", icon: I(HammerIcon) },
      { label: "Fabrika", href: "/uretim/fabrika", icon: I(BlocksIcon) },
      { label: "Reçeteler (BOM)", href: "/uretim/recete", icon: I(LayersIcon) },
    ],
  },
  {
    id: "cari",
    label: "Cari Yönetimi",
    RailIcon: I(WalletIcon),
    href: "/cari",
  },
];

export const bottomSections: Section[] = [
  {
    id: "ayarlar",
    label: "Ayarlar",
    RailIcon: I(SettingsIcon),
    items: [
      { label: "Genel", href: "/ayarlar", icon: I(SettingsIcon) },
      { label: "Sistem Parametreleri", href: "/ayarlar/parametreler", icon: I(SlidersHorizontalIcon) },
      { label: "Bağlantı Bilgileri", href: "/ayarlar/baglanti", icon: I(CpuIcon) },
      { label: "Kullanıcılar & Roller", href: "/kullanicilar", icon: I(ShieldCheckIcon) },
    ],
  },
];
