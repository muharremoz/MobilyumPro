"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { InventoryPage } from "@/components/inventory/inventory-page";

function Inner() {
  const params = useSearchParams();
  const bolum = params.get("bolum") ?? "durum";
  return <InventoryPage bolum={bolum} />;
}

export default function StokYonetimiPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
