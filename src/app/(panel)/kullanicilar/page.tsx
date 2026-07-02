import { KullaniciYonetimi } from "@/components/users/kullanici-yonetimi";
import {
  getDepartmanlar,
  getKullanicilar,
  getRoller,
  getRolYetkileri,
} from "@/lib/db/queries";

export default async function KullanicilarPage() {
  const [kullanicilar, roller, departmanlar, yetkiler] = await Promise.all([
    getKullanicilar(),
    getRoller(),
    getDepartmanlar(),
    getRolYetkileri(),
  ]);
  return (
    <KullaniciYonetimi
      kullanicilar={kullanicilar}
      roller={roller}
      departmanlar={departmanlar}
      yetkiler={yetkiler}
    />
  );
}
