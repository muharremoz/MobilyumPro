"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ProductsTable } from "@/components/products/products-table";

function UrunlerInner() {
  const params = useSearchParams();
  const kategori = params.get("kategori") ?? "Tümü";

  return <ProductsTable key={kategori} initialKategori={kategori} />;
}

export default function UrunlerPage() {
  return (
    <Suspense>
      <UrunlerInner />
    </Suspense>
  );
}
