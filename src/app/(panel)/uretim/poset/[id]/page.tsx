import { notFound } from "next/navigation";

import { PosetForm } from "@/components/production/poset-form";
import {
  getMalzemeler,
  getModeller,
  getParcalar,
  getPoset,
} from "@/lib/db/queries";

export default async function PosetDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "yeni") notFound();
  const [poset, malzemeler, modeller, parcalar] = await Promise.all([
    getPoset(id),
    getMalzemeler(),
    getModeller(),
    getParcalar(),
  ]);
  if (!poset) notFound();
  return (
    <PosetForm
      poset={poset}
      malzemeler={malzemeler}
      modeller={modeller}
      parcalar={parcalar}
    />
  );
}
