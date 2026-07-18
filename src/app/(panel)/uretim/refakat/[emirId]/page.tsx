import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { RefakatKagitlari } from "@/components/production/refakat-kagidi";
import { getRefakatKagitlari } from "@/lib/db/queries";
import { qrTabanUrl } from "@/lib/qr-url";

export const dynamic = "force-dynamic";

export default async function RefakatRoute({
  params,
}: {
  params: Promise<{ emirId: string }>;
}) {
  const { emirId } = await params;
  // QR mutlak URL taşımalı ki telefon açabilsin; localhost ise LAN IP'ye çevrilir.
  const h = await headers();
  const taban = await qrTabanUrl(h.get("host") ?? undefined);
  const kagitlar = await getRefakatKagitlari(emirId, taban);
  if (kagitlar.length === 0 && !emirId.startsWith("UE-")) notFound();
  return <RefakatKagitlari kagitlar={kagitlar} emirId={emirId} />;
}
