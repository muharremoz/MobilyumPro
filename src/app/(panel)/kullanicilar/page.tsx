import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import {
  getDepartmanlar,
  getKullanicilar,
  getRoller,
} from "@/lib/db/queries";

export default async function KullanicilarPage() {
  const [kullanicilar, roller, departmanlar] = await Promise.all([
    getKullanicilar(),
    getRoller(),
    getDepartmanlar(),
  ]);
  return (
    <KullanicilarTable
      kullanicilar={kullanicilar}
      roller={roller}
      departmanlar={departmanlar}
    />
  );
}
