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
import { IstasyonTanim } from "@/components/production/istasyon-tanim";
import type { Istasyon } from "@/lib/fabrika";
import type { ListeKolonAyariDegeri } from "@/components/ui/kolon-ayarlari";
import type {
  Model,
  Malzeme,
  Parca,
  Sayim,
  Depo,
  StokHareket,
  StokGrup,
  TanimTip,
  TanimKalemi,
  Makine,
} from "@/lib/data";

/** Sayım kapsamı seçenekleri — stok tablosundaki grup değerleri. */
const STOK_GRUPLARI = ["Hammadde", "Yarı Mamül", "Mamül"];

const TANIM_TIPLERI: DefTab[] = [
  "gruplar",
  "markalar",
  "koleksiyonlar",
  "renkler",
  "kumaslar",
  "birimler",
  "parca-tanim",
  "modul-tanim",
];

export function InventoryPage({
  bolum,
  kritikEsik,
  urunler,
  malzemeler,
  parcalar,
  depolar,
  sayimlar = [],
  hareketler,
  kolonAyarlari,
  kullanicilar,
  mevcutKullaniciId,
  gruplar,
  tanimlar,
  tedarikciler,
  istasyonlar,
  makineler,
}: {
  bolum: string;
  /** kritik_stok_esigi parametresi (sunucudan). */
  kritikEsik: number;
  urunler: Model[];
  malzemeler: Malzeme[];
  parcalar: Parca[];
  depolar: Depo[];
  sayimlar?: Sayim[];
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
  /** Üretim istasyonları (dinamik rota). */
  istasyonlar?: Istasyon[];
  /** İstasyonlara bağlı makineler (tezgahlar). */
  makineler?: Makine[];
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
        depoAdlari={depolar.map((d) => d.ad)}
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
        sayimlar={sayimlar}
        depolar={depolar.map((d) => d.ad)}
        gruplar={STOK_GRUPLARI}
        kolonAyari={kolonAyarlari?.["sayim"]}
        kullanicilar={kullanicilar}
        mevcutKullaniciId={mevcutKullaniciId}
      />
    );

  // Üretim
  if (bolum === "istasyonlar")
    return <IstasyonTanim istasyonlar={istasyonlar} makineler={makineler} />;
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
      kritikEsik={kritikEsik}
    />
  );
}
