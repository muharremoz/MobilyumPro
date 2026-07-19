import "server-only";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Kurulum sihirbazının `.env` yazma katmanı.
 *
 * Sihirbaz SQL bilgilerini alır, buradan DATABASE_URL kurulur ve `.env`
 * dosyasına yazılır. Dosya kurulum dışında ASLA yazılmaz — çalışan bir
 * sistemin ayarını uygulama içinden değiştirmek istemiyoruz.
 */

export type SqlBilgi = {
  sunucu: string;
  port: number;
  veritabani: string;
  /** true → Windows kimlik doğrulaması (kullanici/sifre yok sayılır) */
  windowsKimlik: boolean;
  kullanici: string;
  sifre: string;
};

const ENV_YOL = () => join(process.cwd(), ".env");

/**
 * Prisma sqlserver bağlantı dizesi kurar.
 *
 * Şifre `{...}` içine alınır ki `;` `=` gibi karakterler dizeyi bozmasın.
 * Şifrenin kendi içindeki `}` ise ikilenerek kaçırılır — bu yapılmazsa
 * içinde `}` olan bir şifre dizeyi erkenden kapatır ve bağlantı sessizce
 * yanlış kurulur.
 */
export function baglantiDizesi(s: SqlBilgi): string {
  const temel = `sqlserver://${s.sunucu}:${s.port};database=${s.veritabani}`;
  const kuyruk = "trustServerCertificate=true;encrypt=true";
  if (s.windowsKimlik) return `${temel};integratedSecurity=true;${kuyruk}`;
  const sifre = s.sifre.replace(/\}/g, "}}");
  return `${temel};user=${s.kullanici};password={${sifre}};${kuyruk}`;
}

/** Aynı dizeyi `master`'a çevirir — veritabanını oluşturmak için gerekir. */
export function masterDizesi(s: SqlBilgi): string {
  return baglantiDizesi({ ...s, veritabani: "master" });
}

/** Oturum çerezini imzalayan anahtar; her kurulumda benzersiz olmalı. */
export function oturumAnahtariUret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * `.env`'i satır bazında günceller: var olan anahtarın değeri değişir,
 * olmayan sona eklenir. Dosyayı baştan yazmıyoruz ki kullanıcının elle
 * eklediği satırlar ve yorumlar kaybolmasın.
 */
export function envGuncelle(degerler: Record<string, string>): void {
  const yol = ENV_YOL();
  let satirlar: string[] = [];

  if (existsSync(yol)) {
    satirlar = readFileSync(yol, "utf8").split(/\r?\n/);
  } else if (existsSync(join(process.cwd(), ".env.example"))) {
    // Şablondan başla: açıklama yorumları müşteri sunucusunda da dursun.
    satirlar = readFileSync(join(process.cwd(), ".env.example"), "utf8").split(
      /\r?\n/,
    );
  }

  for (const [anahtar, deger] of Object.entries(degerler)) {
    const satir = `${anahtar}="${deger}"`;
    const i = satirlar.findIndex((s) =>
      new RegExp(`^\\s*${anahtar}\\s*=`).test(s),
    );
    if (i >= 0) satirlar[i] = satir;
    else satirlar.push(satir);
  }

  writeFileSync(yol, satirlar.join("\n"), "utf8");
}

/** `.env` içinde DATABASE_URL dolu mu? (kurulum yapılmış mı sorusunun ilk yarısı) */
export function envDbVar(): boolean {
  const yol = ENV_YOL();
  if (!existsSync(yol)) return false;
  const m = /^\s*DATABASE_URL\s*=\s*"?([^"\r\n]*)"?/m.exec(
    readFileSync(yol, "utf8"),
  );
  const deger = m?.[1]?.trim() ?? "";
  // Şablondaki `{PAROLA}` yer tutucusu doldurulmadıysa kurulmuş sayılmaz.
  return deger.length > 0 && !deger.includes("{PAROLA}");
}
