import * as React from "react";

import { LayoutPanelTopIcon } from "@/components/ui/icons/layout-panel-top";
import { CartIcon } from "@/components/ui/icons/cart";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { TruckIcon } from "@/components/ui/icons/truck";
import { ReceiptIcon } from "@/components/ui/icons/receipt";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { HammerIcon } from "@/components/ui/icons/hammer";
import { WrenchIcon } from "@/components/ui/icons/wrench";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { TrendingUpIcon } from "@/components/ui/icons/trending-up";
import { ChartPieIcon } from "@/components/ui/icons/chart-pie";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { SettingsIcon } from "@/components/ui/icons/settings";
import { CircleHelpIcon } from "@/components/ui/icons/circle-help";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { UsersIcon } from "@/components/ui/icons/users";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { BlocksIcon } from "@/components/ui/icons/blocks";
import { FileTextIcon } from "@/components/ui/icons/file-text";
import { UndoIcon } from "@/components/ui/icons/undo";
import { ClipboardCheckIcon } from "@/components/ui/icons/clipboard-check";
import { CheckCheckIcon } from "@/components/ui/icons/check-check";
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
import { SendIcon } from "@/components/ui/icons/send";
import { GaugeIcon } from "@/components/ui/icons/gauge";
import { CalendarCogIcon } from "@/components/ui/icons/calendar-cog";
import { LayersIcon } from "@/components/ui/icons/layers";
import { CpuIcon } from "@/components/ui/icons/cpu";
import { WorkflowIcon } from "@/components/ui/icons/workflow";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { MessageSquareXIcon } from "@/components/ui/icons/message-square-x";
import { ChartLineIcon } from "@/components/ui/icons/chart-line";
import { ActivityIcon } from "@/components/ui/icons/activity";
import { ChartColumnIncreasingIcon } from "@/components/ui/icons/chart-column-increasing";
import { ChartSplineIcon } from "@/components/ui/icons/chart-spline";
import { HandCoinsIcon } from "@/components/ui/icons/hand-coins";
import { FileChartLineIcon } from "@/components/ui/icons/file-chart-line";

// Tüm pqoqubbw ikonları aynı imperative handle'ı paylaşır.
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
export type AnimatedIcon = React.ForwardRefExoticComponent<
  { size?: number; className?: string } & React.RefAttributes<AnimatedIconHandle>
>;

export type SubItem = { label: string; href: string; icon: AnimatedIcon };

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

// Modüller (rakip yazılımdaki özellik seti + bizim Cari Hareketler).
// Henüz sayfası olmayan öğeler "#" ile işaretli. Hem rail hem alt menü
// ikonları pqoqubbw animasyonlu.
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
      { label: "Ürünler", href: "/urunler", icon: I(RockingChairIcon) },
      { label: "Stok Yönetimi", href: "/stok-yonetimi", icon: I(BoxesIcon) },
    ],
  },
  {
    id: "siparis",
    label: "Sipariş Yönetimi",
    RailIcon: I(CartIcon),
    items: [
      { label: "Siparişler", href: "/siparisler", icon: I(CartIcon) },
      { label: "Teklifler", href: "#", icon: I(FileTextIcon) },
      { label: "İadeler", href: "#", icon: I(UndoIcon) },
    ],
  },
  {
    id: "sevkiyat",
    label: "Sevkiyat",
    RailIcon: I(TruckIcon),
    items: [
      { label: "Sevkiyat Emirleri", href: "#", icon: I(ClipboardCheckIcon) },
      { label: "Sevkiyatlar", href: "#", icon: I(TruckIcon) },
      { label: "İrsaliyeler", href: "#", icon: I(FileTextIcon) },
      { label: "Teslimatlar", href: "#", icon: I(CheckCheckIcon) },
    ],
  },
  {
    id: "satin-alma",
    label: "Satın Alma",
    RailIcon: I(ReceiptIcon),
    items: [
      { label: "Satın Alma Siparişleri", href: "#", icon: I(ClipboardCheckIcon) },
      { label: "Tedarikçiler", href: "#", icon: I(UsersRoundIcon) },
      { label: "Talepler", href: "#", icon: I(SendIcon) },
      { label: "Alış Faturaları", href: "#", icon: I(ReceiptIcon) },
    ],
  },
  {
    id: "uretim-plan",
    label: "Üretim Planı",
    RailIcon: I(CalendarDaysIcon),
    items: [
      { label: "Üretim Planı", href: "#", icon: I(CalendarDaysIcon) },
      { label: "İş Emirleri", href: "#", icon: I(ClipboardCheckIcon) },
      { label: "Kapasite Planı", href: "#", icon: I(GaugeIcon) },
      { label: "Çizelgeleme", href: "#", icon: I(CalendarCogIcon) },
    ],
  },
  {
    id: "uretim-takibi",
    label: "Üretim Takibi",
    RailIcon: I(HammerIcon),
    items: [
      { label: "Üretim Emirleri", href: "#", icon: I(HammerIcon) },
      { label: "Reçeteler (BOM)", href: "/uretim/recete", icon: I(LayersIcon) },
      { label: "İş İstasyonları", href: "#", icon: I(CpuIcon) },
      { label: "İş Akışı", href: "#", icon: I(WorkflowIcon) },
    ],
  },
  {
    id: "ssh",
    label: "Satış Sonrası Hizmet",
    RailIcon: I(WrenchIcon),
    items: [
      { label: "Servis Talepleri", href: "#", icon: I(WrenchIcon) },
      { label: "Garanti Takibi", href: "#", icon: I(ShieldCheckIcon) },
      { label: "Bakım", href: "#", icon: I(SettingsIcon) },
      { label: "Şikayetler", href: "#", icon: I(MessageSquareXIcon) },
    ],
  },
  {
    id: "maliyet",
    label: "Maliyet",
    RailIcon: I(TurkishLiraIcon),
    items: [
      { label: "Maliyet Analizi", href: "#", icon: I(ChartLineIcon) },
      { label: "Ürün Maliyetleri", href: "#", icon: I(TurkishLiraIcon) },
      { label: "Gider Merkezleri", href: "#", icon: I(BlocksIcon) },
      { label: "Fiyatlandırma", href: "#", icon: I(BadgePercentIcon) },
    ],
  },
  {
    id: "verimlilik",
    label: "Verimlilik & Performans",
    RailIcon: I(TrendingUpIcon),
    items: [
      { label: "OEE", href: "#", icon: I(GaugeIcon) },
      { label: "İstasyon Performansı", href: "#", icon: I(ActivityIcon) },
      { label: "Personel", href: "#", icon: I(UsersIcon) },
      { label: "KPI'lar", href: "#", icon: I(ChartSplineIcon) },
    ],
  },
  {
    id: "raporlama",
    label: "Raporlama",
    RailIcon: I(ChartPieIcon),
    items: [
      { label: "Satış Raporları", href: "#", icon: I(TrendingUpIcon) },
      { label: "Stok Raporları", href: "#", icon: I(ChartColumnIncreasingIcon) },
      { label: "Üretim Raporları", href: "#", icon: I(ChartSplineIcon) },
      { label: "Finans Raporları", href: "#", icon: I(ChartPieIcon) },
    ],
  },
  {
    id: "cari",
    label: "Cari Hareketler",
    RailIcon: I(WalletIcon),
    items: [
      { label: "Cariler", href: "/musteriler", icon: I(UsersIcon) },
      { label: "Tahsilatlar", href: "#", icon: I(HandCoinsIcon) },
      { label: "Ödemeler", href: "#", icon: I(WalletIcon) },
      { label: "Ekstre", href: "#", icon: I(FileChartLineIcon) },
    ],
  },
];

export const bottomSections: Section[] = [
  {
    id: "destek",
    label: "Destek",
    RailIcon: I(CircleHelpIcon),
    href: "#",
  },
  {
    id: "ayarlar",
    label: "Ayarlar",
    RailIcon: I(SettingsIcon),
    items: [
      { label: "Genel", href: "/ayarlar", icon: I(SettingsIcon) },
      { label: "Kullanıcılar & Roller", href: "#", icon: I(ShieldCheckIcon) },
      { label: "Vergi & Ödeme", href: "#", icon: I(BadgePercentIcon) },
    ],
  },
];
