import { InventoryPage } from "@/components/inventory/inventory-page";
import {
  getUrunler,
  getMalzemeler,
  getParcalar,
  getDepolar,
} from "@/lib/db/queries";

export default async function StokYonetimiPage({
  searchParams,
}: {
  searchParams: Promise<{ bolum?: string }>;
}) {
  const { bolum = "durum" } = await searchParams;
  const [urunler, malzemeler, parcalar, depolar] = await Promise.all([
    getUrunler(),
    getMalzemeler(),
    getParcalar(),
    getDepolar(),
  ]);
  return (
    <InventoryPage
      bolum={bolum}
      urunler={urunler}
      malzemeler={malzemeler}
      parcalar={parcalar}
      depolar={depolar}
    />
  );
}
