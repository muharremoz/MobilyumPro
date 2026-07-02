import { PrismaClient } from "@prisma/client";

/**
 * Tek Prisma client örneği (LAN sunucusunda app ile aynı makinede çalışan
 * SQL Server'a bağlanır). Dev'de sıcak yeniden yüklemelerde client'ı tekrar
 * oluşturmamak için global'de tutulur.
 */
const globalForDb = globalThis as unknown as {
  __mobilyumPrisma?: PrismaClient;
};

export const db = globalForDb.__mobilyumPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mobilyumPrisma = db;
}

/** DB'deki DATE kolonunu uygulamanın kullandığı "YYYY-AA-GG" string'ine çevirir. */
export function tarihStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "YYYY-AA-GG" string'ini DATE kolonuna yazılacak Date'e çevirir (UTC gece yarısı). */
export function tarihDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
