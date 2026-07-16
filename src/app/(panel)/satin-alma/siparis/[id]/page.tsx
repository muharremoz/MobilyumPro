import { notFound } from "next/navigation";

import { SiparisBelge } from "@/components/satin-alma/siparis-belge";
import { getSatinAlmaSiparis, getCari, getDepolar } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SiparisBelgeRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siparis = await getSatinAlmaSiparis(id);
  if (!siparis) notFound();
  const [cari, depolar] = await Promise.all([
    getCari(siparis.cariId),
    getDepolar(),
  ]);
  const depo = depolar.find((d) => d.id === siparis.depo || d.ad === siparis.depo);
  return <SiparisBelge siparis={siparis} cari={cari} depo={depo ?? null} />;
}
