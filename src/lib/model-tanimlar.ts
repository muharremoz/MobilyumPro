// Model formu için kategori/marka seçenekleri — varsayılanlar + DB'de
// halihazırda kullanılanlar (Tanımlamalar modülü DB'ye bağlanana dek).

import type { Model } from "@/lib/data";

const VARSAYILAN_KATEGORILER = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];

export function modelTanimSecenekleri(modeller: Model[]): {
  kategoriler: string[];
  markalar: string[];
} {
  const kategoriler = [
    ...new Set([...VARSAYILAN_KATEGORILER, ...modeller.map((m) => m.kategori)]),
  ];
  const markalar = [
    ...new Set(modeller.map((m) => m.marka).filter((m): m is string => !!m)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
  return { kategoriler, markalar };
}
