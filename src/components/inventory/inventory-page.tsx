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
import { Parts } from "@/components/inventory/parts";
import type { ListeKolonAyariDegeri } from "@/components/ui/kolon-ayarlari";
import type {
  Model,
  Malzeme,
  Parca,
  Depo,
  StokHareket,
  StokGrup,
  TanimTip,
  TanimKalemi,
} from "@/lib/data";

const TANIM_TIPLERI: DefTab[] = [
  "gruplar",
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
  kolonAyarlari,
  kullanicilar,
  mevcutKullaniciId,
  gruplar,
  tanimlar,
  tedarikciler,
}: {
  bolum: string;
  urunler: Model[];
  malzemeler: Malzeme[];
  parcalar: Parca[];
  depolar: Depo[];
  hareketler: StokHareket[];
  /** listeId → kolon ayarı (liste_ayar); alt listeler kendi anahtarını okur. */
  kolonAyarlari?: Record<string, ListeKolonAyariDegeri>;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  /** Stok grup ağacı (Tanımlamalar → Gruplar). */
  gruplar?: StokGrup[];
  /** Düz tanımlar (Tanımlamalar → Marka/Renk/Kumaş/Birim...). */
  tanimlar?: Record<TanimTip, TanimKalemi[]>;
  /** Tedarikçi seçenekleri (cari kartlardan: Tedarikçi / Her İkisi). */
  tedarikciler?: string[];
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
        kolonAyari={kolonAyarlari?.["stok-hareketleri"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    );
  if (bolum === "depolar")
    return (
      <Warehouses
        depolar={depolar}
        kolonAyari={kolonAyarlari?.["depolar"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    );
  if (bolum === "sayim")
    return (
      <StockCount
        kolonAyari={kolonAyarlari?.["sayim"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    );

  // Üretim
  if (bolum === "parcalar")
    return (
      <Parts
        parcalar={parcalar}
        malzemeler={malzemeler}
        kolonAyari={kolonAyarlari?.["parcalar"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    );

  // Tanımlamalar
  if (TANIM_TIPLERI.includes(bolum as DefTab)) {
    return (
      <DefinitionsPage
        hideMenu
        tip={bolum as DefTab}
        kolonAyari={kolonAyarlari?.["tanimlamalar"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
        gruplar={gruplar}
        tanimlar={tanimlar}
      />
    );
  }

  // Varsayılan: Stok Durumu
  return (
    <StockStatus
      urunler={urunler}
      kolonAyari={kolonAyarlari?.["stok-durumu"]}
      kullanicilar={kullanicilar}
      mevcutKullaniciId={mevcutKullaniciId}
    />
  );
}
