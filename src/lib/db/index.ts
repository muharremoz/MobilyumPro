import { PrismaClient } from "@prisma/client";

/**
 * Tek Prisma client örneği (LAN sunucusunda app ile aynı makinede çalışan
 * SQL Server'a bağlanır). Dev'de sıcak yeniden yüklemelerde client'ı tekrar
 * oluşturmamak için global'de tutulur.
 *
 * TEMBEL kurulum: client modül yüklenirken değil, ilk kullanımda doğar.
 * Sebebi kurulum sihirbazı — ilk açılışta `.env` henüz yoktur ve
 * `new PrismaClient()` "DATABASE_URL yok" diye patlayıp uygulamayı hiç
 * açtırmazdı. Kullanıcı SQL bilgilerini girecekse uygulamanın DB'siz de
 * ayağa kalkabilmesi şart.
 */
const globalForDb = globalThis as unknown as {
  __mobilyumPrisma?: PrismaClient | null;
};

/**
 * .env henüz yokken kullanılan yer tutucu. Bağlanmaya çalışırsa hata verir;
 * bu bilinçli — çağıran taraf hatayı "kurulum yapılmamış" diye yorumlar.
 */
const KURULMADI_URL =
  "sqlserver://localhost:1433;database=_kurulmadi_;user=_;password={_};trustServerCertificate=true";

function olustur(): PrismaClient {
  const url = process.env.DATABASE_URL?.trim();
  return new PrismaClient({ datasourceUrl: url || KURULMADI_URL });
}

function istemci(): PrismaClient {
  if (!globalForDb.__mobilyumPrisma) {
    globalForDb.__mobilyumPrisma = olustur();
  }
  return globalForDb.__mobilyumPrisma;
}

/**
 * Kurulum sihirbazı `.env`'i yazdıktan sonra çağırır: eski client atılır,
 * bir sonraki kullanımda yeni DATABASE_URL ile yenisi doğar. Bu olmasaydı
 * SQL adımından sonra sunucuyu yeniden başlatmak gerekirdi.
 */
export async function dbYenile(): Promise<void> {
  const eski = globalForDb.__mobilyumPrisma;
  globalForDb.__mobilyumPrisma = null;
  if (eski) await eski.$disconnect().catch(() => {});
}

/**
 * Proje boyunca `db.kullanici.findMany()` gibi kullanılır. Proxy olmasının
 * tek sebebi tembelliği ~100 çağrı yerine tek noktada çözmek.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_hedef, ad: string | symbol) {
    const c = istemci() as unknown as Record<string | symbol, unknown>;
    const deger = c[ad];
    return typeof deger === "function" ? deger.bind(c) : deger;
  },
});

/** DB'deki DATE kolonunu uygulamanın kullandığı "YYYY-AA-GG" string'ine çevirir. */
export function tarihStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "YYYY-AA-GG" string'ini DATE kolonuna yazılacak Date'e çevirir (UTC gece yarısı). */
export function tarihDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
