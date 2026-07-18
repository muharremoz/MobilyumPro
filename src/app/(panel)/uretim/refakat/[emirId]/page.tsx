import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { RefakatKagitlari } from "@/components/production/refakat-kagidi";
import { getRefakatKagitlari } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function RefakatRoute({
  params,
}: {
  params: Promise<{ emirId: string }>;
}) {
  const { emirId } = await params;
  // QR mutlak URL taşımalı ki telefon açabilsin — istekten host çözülür.
  const h = await headers();
  const host = h.get("host") ?? "";
  const protokol = h.get("x-forwarded-proto") ?? "http";
  const kagitlar = await getRefakatKagitlari(
    emirId,
    host ? `${protokol}://${host}` : undefined,
  );
  if (kagitlar.length === 0 && !emirId.startsWith("UE-")) notFound();
  return <RefakatKagitlari kagitlar={kagitlar} emirId={emirId} />;
}
