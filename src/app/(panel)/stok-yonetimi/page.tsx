import { InventoryPage } from "@/components/inventory/inventory-page";
import {
  getUrunler,
  getMalzemeler,
  getParcalar,
  getDepolar,
  getStokHareketleri,
} from "@/lib/db/queries";

export default async function StokYonetimiPage({
  searchParams,
}: {
  searchParams: Promise<{ bolum?: string }>;
}) {
  const { bolum = "durum" } = await searchParams;
  const [urunler, malzemeler, parcalar, depolar, hareketler] =
    await Promise.all([
      getUrunler(),
      getMalzemeler(),
      getParcalar(),
      getDepolar(),
      getStokHareketleri(),
    ]);
  return (
    <InventoryPage
      bolum={bolum}
      urunler={urunler}
      malzemeler={malzemeler}
      parcalar={parcalar}
      depolar={depolar}
      hareketler={hareketler}
    />
  );
}
