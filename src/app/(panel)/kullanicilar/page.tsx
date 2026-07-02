import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import { getKullanicilar } from "@/lib/db/queries";

export default async function KullanicilarPage() {
  const kullanicilar = await getKullanicilar();
  return <KullanicilarTable kullanicilar={kullanicilar} />;
}
