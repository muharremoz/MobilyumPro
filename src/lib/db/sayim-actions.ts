"use server";

import { getSayimDetay } from "./queries";
import { yetkiVarMi } from "@/lib/yetki-sunucu";
import type { SayimDetay } from "@/lib/data";

/**
 * Sayım detayını istemciye açar.
 *
 * Sorgular server-only olduğu için istemci doğrudan çağıramaz; sayım satırları
 * ise sayfa yüklenirken değil, belge açılınca isteniyor (250 kartlık belgeler
 * her liste yüklemesinde taşınmasın).
 */
export async function getSayimDetayAction(
  id: string,
): Promise<SayimDetay | null> {
  if (!(await yetkiVarMi("stok", "isList"))) return null;
  return getSayimDetay(id);
}
