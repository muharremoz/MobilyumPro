import { GuncellemeAyarlari } from "@/components/settings/guncelleme";
import { guncellemeAyarlari } from "@/lib/db/guncelleme-actions";

export default async function GuncellemeRoute() {
  const durum = await guncellemeAyarlari();
  return <GuncellemeAyarlari durum={durum} />;
}
