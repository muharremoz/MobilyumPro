import { Yetkilendirme } from "@/components/users/yetkilendirme";
import {
  getKullanicilar,
  getKullaniciYetkileri,
  getRoller,
  getRolYetkileri,
} from "@/lib/db/queries";

export default async function YetkilerPage() {
  const [kullanicilar, roller, rolYetkileri, kullaniciYetkileri] =
    await Promise.all([
      getKullanicilar(),
      getRoller(),
      getRolYetkileri(),
      getKullaniciYetkileri(),
    ]);
  return (
    <Yetkilendirme
      kullanicilar={kullanicilar}
      roller={roller}
      rolYetkileri={rolYetkileri}
      kullaniciYetkileri={kullaniciYetkileri}
    />
  );
}
