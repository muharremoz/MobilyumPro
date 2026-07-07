import { notFound } from "next/navigation";

import { PosetForm } from "@/components/production/poset-form";
import { getMalzemeler, getPoset } from "@/lib/db/queries";

export default async function PosetDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "yeni") notFound();
  const [poset, malzemeler] = await Promise.all([
    getPoset(id),
    getMalzemeler(),
  ]);
  if (!poset) notFound();
  return <PosetForm poset={poset} malzemeler={malzemeler} />;
}
