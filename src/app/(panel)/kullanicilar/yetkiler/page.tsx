import { Yetkilendirme } from "@/components/users/yetkilendirme";
import {
  getKullanicilar,
  getKullaniciYetkileri,
  getRoller,
  getRolYetkileri,
  getYetkiSetleri,
} from "@/lib/db/queries";

export default async function YetkilerPage() {
  const [kullanicilar, roller, rolYetkileri, kullaniciYetkileri, setler] =
    await Promise.all([
      getKullanicilar(),
      getRoller(),
      getRolYetkileri(),
      getKullaniciYetkileri(),
      getYetkiSetleri(),
    ]);
  return (
    <Yetkilendirme
      kullanicilar={kullanicilar}
      roller={roller}
      rolYetkileri={rolYetkileri}
      kullaniciYetkileri={kullaniciYetkileri}
      setler={setler}
    />
  );
}
