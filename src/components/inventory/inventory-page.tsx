"use client";

import {
  DefinitionsPage,
  type TabKey as DefTab,
} from "@/components/definitions/definitions-page";
import { StockStatus } from "@/components/inventory/stock-status";
import { StockTracker } from "@/components/inventory/stock-tracker";
import { StockMovements } from "@/components/inventory/stock-movements";
import { Warehouses } from "@/components/inventory/warehouses";
import { StockCount } from "@/components/inventory/stock-count";
import { Materials } from "@/components/inventory/materials";
import { Parts } from "@/components/inventory/parts";
import type { Model, Malzeme, Parca, Depo, StokHareket } from "@/lib/data";

const TANIM_TIPLERI: DefTab[] = [
  "kategoriler",
  "markalar",
  "koleksiyonlar",
  "renkler",
  "kumaslar",
  "birimler",
];

export function InventoryPage({
  bolum,
  urunler,
  malzemeler,
  parcalar,
  depolar,
  hareketler,
}: {
  bolum: string;
  urunler: Model[];
  malzemeler: Malzeme[];
  parcalar: Parca[];
  depolar: Depo[];
  hareketler: StokHareket[];
}) {
  // Stok bölümleri
  if (bolum === "takip")
    return (
      <StockTracker
        hareketler={hareketler}
        urunler={urunler}
        malzemeler={malzemeler}
      />
    );
  if (bolum === "hareketler")
    return (
      <StockMovements
        hareketler={hareketler}
        urunler={urunler}
        malzemeler={malzemeler}
      />
    );
  if (bolum === "depolar") return <Warehouses depolar={depolar} />;
  if (bolum === "sayim") return <StockCount />;

  // Üretim
  if (bolum === "malzemeler") return <Materials malzemeler={malzemeler} />;
  if (bolum === "parcalar")
    return <Parts parcalar={parcalar} malzemeler={malzemeler} />;

  // Tanımlamalar
  if (TANIM_TIPLERI.includes(bolum as DefTab)) {
    return <DefinitionsPage hideMenu tip={bolum as DefTab} />;
  }

  // Varsayılan: Stok Durumu
  return <StockStatus urunler={urunler} />;
}
