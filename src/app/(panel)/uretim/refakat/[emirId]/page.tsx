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
  const kagitlar = await getRefakatKagitlari(emirId);
  if (kagitlar.length === 0 && !emirId.startsWith("UE-")) notFound();
  return <RefakatKagitlari kagitlar={kagitlar} emirId={emirId} />;
}
