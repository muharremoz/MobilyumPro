import { InventoryPage } from "@/components/inventory/inventory-page";
import { getUrunler, getMalzemeler, getParcalar } from "@/lib/db/queries";

export default async function StokYonetimiPage() {
  const [urunler, malzemeler, parcalar] = await Promise.all([
    getUrunler(),
    getMalzemeler(),
    getParcalar(),
  ]);
  return (
    <InventoryPage
      urunler={urunler}
      malzemeler={malzemeler}
      parcalar={parcalar}
    />
  );
}
