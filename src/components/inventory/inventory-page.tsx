"use client";

import {
  DefinitionsPage,
  type TabKey as DefTab,
} from "@/components/definitions/definitions-page";
import { StockStatus } from "@/components/inventory/stock-status";
import { StockMovements } from "@/components/inventory/stock-movements";
import { Warehouses } from "@/components/inventory/warehouses";
import { StockCount } from "@/components/inventory/stock-count";
import { Materials } from "@/components/inventory/materials";
import { Parts } from "@/components/inventory/parts";
import { StockTracker } from "@/components/inventory/stock-tracker";

const TANIM_TIPLERI: DefTab[] = [
  "kategoriler",
  "markalar",
  "koleksiyonlar",
  "renkler",
  "kumaslar",
  "birimler",
];

export function InventoryPage({ bolum }: { bolum: string }) {
  // Stok bölümleri
  if (bolum === "durum") return <StockStatus />;
  if (bolum === "takip") return <StockTracker />;
  if (bolum === "hareketler") return <StockMovements />;
  if (bolum === "depolar") return <Warehouses />;
  if (bolum === "sayim") return <StockCount />;

  // Üretim
  if (bolum === "malzemeler") return <Materials />;
  if (bolum === "parcalar") return <Parts />;

  // Tanımlamalar
  if (TANIM_TIPLERI.includes(bolum as DefTab)) {
    return <DefinitionsPage hideMenu tip={bolum as DefTab} />;
  }

  return <StockStatus />;
}
