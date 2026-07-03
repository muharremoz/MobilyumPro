import { Yetkilendirme } from "@/components/users/yetkilendirme";
import {
  getCariler,
  getKullanicilar,
  getKullaniciCariEngelleri,
  getKullaniciYetkileri,
  getRoller,
  getRolYetkileri,
  getYetkiSetleri,
} from "@/lib/db/queries";

export default async function YetkilerPage() {
  const [
    kullanicilar,
    roller,
    rolYetkileri,
    kullaniciYetkileri,
    setler,
    cariler,
    cariEngelleri,
  ] = await Promise.all([
    getKullanicilar(),
    getRoller(),
    getRolYetkileri(),
    getKullaniciYetkileri(),
    getYetkiSetleri(),
    getCariler(),
    getKullaniciCariEngelleri(),
  ]);
  return (
    <Yetkilendirme
      kullanicilar={kullanicilar}
      roller={roller}
      rolYetkileri={rolYetkileri}
      kullaniciYetkileri={kullaniciYetkileri}
      setler={setler}
      cariler={cariler}
      cariEngelleri={cariEngelleri}
    />
  );
}
