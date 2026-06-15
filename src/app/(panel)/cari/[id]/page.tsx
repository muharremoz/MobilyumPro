import { notFound } from "next/navigation";

import { CariFormPage } from "@/components/cari/cari-form-page";
import { cariler } from "@/lib/data";

export default async function CariDuzenleRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "yeni" zaten ayrı route — buraya düşmemesi gerek ama emniyet için.
  if (id === "yeni") notFound();
  const cari = cariler.find((c) => c.id === id);
  if (!cari) notFound();
  return <CariFormPage cari={cari} />;
}
