import { CariList } from "@/components/cari/cari-list";
import { getCariler } from "@/lib/db/queries";

export default async function CariPage() {
  const cariler = await getCariler();
  return <CariList cariler={cariler} />;
}
