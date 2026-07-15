import { TalepListe } from "@/components/satin-alma/talep-liste";
import { getTalepler } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TaleplerRoute() {
  const talepler = await getTalepler();
  return <TalepListe talepler={talepler} />;
}
