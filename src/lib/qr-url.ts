import "server-only";

import os from "node:os";

import { parametreDegeri } from "./db/stok";

/**
 * QR'ların taşıyacağı mutlak taban adres.
 *
 * Öncelik: sistem parametresi (qr_taban_url) → istek host'u → yerel ağ IP'si.
 * Host "localhost"/"127.0.0.1" ise TELEFON AÇAMAZ; bu durumda sunucunun LAN
 * IP'si (192.168.x.x gibi) ile değiştirilir.
 */
export async function qrTabanUrl(istekHost?: string): Promise<string> {
  const ayar = (await parametreDegeri("qr_taban_url"))?.trim();
  if (ayar) return ayar.replace(/\/$/, "");

  const yerelMi = (h: string) =>
    /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(h);

  if (istekHost && !yerelMi(istekHost)) return `http://${istekHost}`;

  // Sunucunun dış (LAN) IPv4 adresi.
  const port = istekHost?.split(":")[1] ?? "1616";
  for (const arayuz of Object.values(os.networkInterfaces())) {
    for (const a of arayuz ?? [])
      if (a.family === "IPv4" && !a.internal)
        return `http://${a.address}:${port}`;
  }
  return istekHost ? `http://${istekHost}` : "";
}
