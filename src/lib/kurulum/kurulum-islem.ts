import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

import { db, dbYenile } from "@/lib/db";
import {
  baglantiDizesi,
  envDbVar,
  envGuncelle,
  masterDizesi,
  oturumAnahtariUret,
  type SqlBilgi,
} from "./env-dosya";

const calistir = promisify(execFile);

/**
 * Kurulum sihirbazının iş katmanı: SQL bağlantısı, şema kurulumu ve
 * "hangi adımdayız" tespiti.
 */

// ── Adım tespiti ──────────────────────────────────────────────────────

export type KurulumAdim =
  | "sql"
  | "kullanici"
  | "lisans"
  | "ozet"
  | "bitti"
  /** `.env` yapılandırılmış ama DB'ye ulaşılamıyor — kurulum DEĞİL, arıza. */
  | "baglanti-hatasi";

const TAMAMLANDI = "kurulum_tamamlandi";

/**
 * Sihirbazın hangi adımda olduğunu söyler.
 *
 * `kurulum_tamamlandi` parametresi üç durumu ayırır:
 *   "1"  → kurulum bitmiş, sihirbaz kapalı
 *   "0"  → sihirbaz başlamış, yarıda
 *   yok  → parametre hiç yazılmamış = ESKİ kurulum. Bu durumda kullanıcı
 *          varsa bitmiş sayılır; yoksa sıfırdan kurulumdur.
 *
 * Bu ayrım olmasaydı, kullanıcı adımı biter bitmez "kullanıcı var → bitti"
 * denip lisans ve özet adımları atlanırdı.
 */
export async function kurulumAdimi(): Promise<KurulumAdim> {
  if (!envDbVar()) return "sql";

  try {
    const bayrak = await db.sistemParametre.findUnique({
      where: { anahtar: TAMAMLANDI },
    });

    if (bayrak?.deger === "1") return "bitti";

    const kullaniciSayisi = await db.kullanici.count();

    if (!bayrak) return kullaniciSayisi > 0 ? "bitti" : "kullanici";
    if (kullaniciSayisi === 0) return "kullanici";

    const lisans = await db.sistemParametre.findUnique({
      where: { anahtar: "lisans_anahtar" },
    });
    return lisans ? "ozet" : "lisans";
  } catch {
    // .env'de çalışan bir DATABASE_URL yazıyor ama şu an bağlanılamıyor:
    // sunucu kapalı, ağ koptu, şifre değişti. Bu bir ARIZADIR, kurulum değil.
    //
    // Buradan sihirbaza düşürmek tehlikeli olurdu: geçici bir DB kesintisi,
    // "isteyen uygulamayı kendi veritabanına yönlendirip yönetici olsun"
    // deliğine dönüşürdü. .env yalnız BAŞARILI kurulumdan sonra yazıldığı
    // için, dolu bir .env + bağlanamama her zaman arıza demektir.
    return "baglanti-hatasi";
  }
}

// ── SQL adımı ─────────────────────────────────────────────────────────

export type TestSonuc = { ok: boolean; error?: string; surum?: string };

/** Bağlantıyı `master` üzerinden dener; veritabanı henüz olmayabilir. */
export async function sqlTest(bilgi: SqlBilgi): Promise<TestSonuc> {
  const dogrulama = sqlDogrula(bilgi);
  if (dogrulama) return { ok: false, error: dogrulama };

  const istemci = new PrismaClient({ datasourceUrl: masterDizesi(bilgi) });
  try {
    const satir =
      await istemci.$queryRawUnsafe<Record<string, string>[]>(
        "SELECT @@VERSION AS s",
      );
    const tam = String(Object.values(satir[0])[0] ?? "");
    return { ok: true, surum: tam.split("\n")[0].trim() };
  } catch (e) {
    return { ok: false, error: sqlHataMesaji(e) };
  } finally {
    await istemci.$disconnect().catch(() => {});
  }
}

function sqlDogrula(b: SqlBilgi): string | null {
  if (!b.sunucu.trim()) return "Sunucu adresi zorunludur.";
  if (!Number.isInteger(b.port) || b.port < 1 || b.port > 65535)
    return "Port 1-65535 aralığında olmalıdır.";
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(b.veritabani))
    return "Veritabanı adı harfle başlamalı; yalnız harf, rakam ve alt çizgi içerebilir.";
  if (!b.windowsKimlik && !b.kullanici.trim())
    return "SQL kimlik doğrulaması için kullanıcı adı zorunludur.";
  return null;
}

/** Prisma'nın uzun hata metnini kullanıcıya anlatılabilir hâle getirir. */
function sqlHataMesaji(e: unknown): string {
  const m = (e as Error)?.message ?? "";
  // Kalıplar Prisma 6'nın gerçek metinlerine bakılarak yazıldı; tahminle
  // yazılan ilk sürüm hepsini genel mesaja düşürüyordu ve kullanıcıya
  // "neyi düzelteceğim" sorusunun cevabını vermiyordu.
  if (/Authentication failed|Login failed|credentials .* are not valid/i.test(m))
    return "Kullanıcı adı veya şifre hatalı.";
  if (/Can't reach database server|ECONNREFUSED|timed? ?out/i.test(m))
    return "Sunucuya ulaşılamadı. Adres, port ve SQL Server'ın çalıştığını denetleyin.";
  if (/certificate/i.test(m))
    return "Sertifika doğrulanamadı. SQL Server yapılandırmasını denetleyin.";
  if (/does not exist|Cannot open database/i.test(m))
    return "Veritabanı bulunamadı.";
  return "Bağlantı kurulamadı. Bilgileri denetleyin.";
}

export type KurSonuc = { ok: boolean; error?: string; yeniVeritabani?: boolean };

/**
 * SQL adımının tamamı: bağlan → veritabanını (yoksa) oluştur → `.env` yaz →
 * şemayı kur.
 *
 * Şema `prisma migrate deploy` ile kurulur; elle SQL çalıştırmıyoruz çünkü
 * `_prisma_migrations` kaydı tutulmazsa güncelleme sistemi (o da migrate
 * kullanıyor) sonradan bozulurdu.
 */
export async function sqlKur(bilgi: SqlBilgi): Promise<KurSonuc> {
  const test = await sqlTest(bilgi);
  if (!test.ok) return { ok: false, error: test.error };

  let yeniVeritabani = false;
  const master = new PrismaClient({ datasourceUrl: masterDizesi(bilgi) });
  try {
    const varMi = await master.$queryRawUnsafe<Record<string, number>[]>(
      `SELECT COUNT(*) AS n FROM sys.databases WHERE name = '${bilgi.veritabani}'`,
    );
    if (Number(Object.values(varMi[0])[0]) === 0) {
      // Ad zaten sqlDogrula'da harf/rakam/alt çizgiye kısıtlandı; enjeksiyon
      // yüzeyi yok. CREATE DATABASE parametre kabul etmediği için raw şart.
      await master.$executeRawUnsafe(`CREATE DATABASE [${bilgi.veritabani}]`);
      yeniVeritabani = true;
    }
  } catch (e) {
    return {
      ok: false,
      error: `Veritabanı oluşturulamadı: ${sqlHataMesaji(e)} Kullanıcının veritabanı oluşturma yetkisi olmalı ya da veritabanını önceden açın.`,
    };
  } finally {
    await master.$disconnect().catch(() => {});
  }

  const url = baglantiDizesi(bilgi);

  const semaSonuc = await semayiKur(url);
  if (!semaSonuc.ok) return semaSonuc;

  // .env'i şema kurulduktan SONRA yazıyoruz: migrate yarıda kalırsa dosyada
  // çalışmayan bir bağlantı bırakmayalım, kullanıcı SQL adımını yineleyebilsin.
  const yazilacak: Record<string, string> = { DATABASE_URL: url };
  if (!process.env.OTURUM_ANAHTARI?.trim()) {
    const anahtar = oturumAnahtariUret();
    yazilacak.OTURUM_ANAHTARI = anahtar;
    process.env.OTURUM_ANAHTARI = anahtar;
  }
  envGuncelle(yazilacak);
  process.env.DATABASE_URL = url;
  await dbYenile();

  try {
    await db.sistemParametre.upsert({
      where: { anahtar: TAMAMLANDI },
      update: { deger: "0" },
      create: { anahtar: TAMAMLANDI, deger: "0" },
    });
  } catch {
    return { ok: false, error: "Şema kuruldu ama veritabanına yazılamadı." };
  }

  return { ok: true, yeniVeritabani };
}

/** Hedef veritabanının durumu — şemayı nasıl kuracağımızı bu belirler. */
type SemaDurum = "bos" | "mobilyumpro" | "yabanci";

/**
 * Boş DB'ye `migrate deploy`, dolu bir MobilyumPro DB'sine ise baseline
 * gerekir. Ayrımı yapmazsak dolu DB'de Prisma P3005 ile duruyor ve müşteriye
 * "migrate-baseline" bağlantılı ham hata gösteriliyordu — kendi verisine
 * yeniden bağlanmak isteyen biri için çıkmaz sokak.
 *
 * Üçüncü durum kasıtlı: tabloları olan ama BİZE ait olmayan bir veritabanı.
 * Onu baseline'lamak, yabancı bir veritabanının üstüne şema açmak olurdu.
 */
async function semaDurumu(url: string): Promise<SemaDurum> {
  const c = new PrismaClient({ datasourceUrl: url });
  try {
    const say = async (q: string) =>
      Number(
        Object.values(
          (await c.$queryRawUnsafe<Record<string, unknown>[]>(q))[0],
        )[0],
      );
    const tablo = await say(
      "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'",
    );
    if (tablo === 0) return "bos";

    // İmza tabloları: üçü birden varsa bu bir MobilyumPro veritabanıdır.
    const imza = await say(
      "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES " +
        "WHERE TABLE_NAME IN ('kullanici','stok','sistem_parametre')",
    );
    return imza === 3 ? "mobilyumpro" : "yabanci";
  } catch {
    // Okunamıyorsa boş varsayıp migrate deploy'a bırakıyoruz; o da kendi
    // hatasını verir. Burada tahminle baseline atmak tehlikeli olurdu.
    return "bos";
  } finally {
    await c.$disconnect().catch(() => {});
  }
}

async function semayiKur(url: string): Promise<KurSonuc> {
  const cli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  if (!existsSync(cli)) {
    return {
      ok: false,
      error:
        "Prisma araçları bulunamadı (node_modules eksik). Kurulum paketi eksik gelmiş olabilir.",
    };
  }

  const durum = await semaDurumu(url);

  if (durum === "yabanci") {
    return {
      ok: false,
      error:
        "Bu veritabanında başka bir uygulamanın tabloları var. Boş bir veritabanı adı verin ya da MobilyumPro için ayrı bir veritabanı açın.",
    };
  }

  if (durum === "mobilyumpro") {
    // Mevcut MobilyumPro verisi: şema zaten yerinde, yalnız baseline'ı
    // "uygulanmış" işaretliyoruz. VERİYE DOKUNULMAZ.
    try {
      await calistir(process.execPath, [cli, "migrate", "resolve", "--applied", "0_init"], {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: url },
        timeout: 60_000,
        windowsHide: true,
      });
    } catch {
      // Zaten işaretliyse resolve hata verir; sorun değil, deploy devam etsin.
    }
  }

  try {
    await calistir(process.execPath, [cli, "migrate", "deploy"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
      // Büyük şema + yavaş disk: cömert ama sonsuz değil.
      timeout: 5 * 60_000,
      windowsHide: true,
    });
    return { ok: true };
  } catch (e) {
    const ayrinti = ((e as { stderr?: string; stdout?: string }).stderr ||
      (e as { stdout?: string }).stdout ||
      (e as Error).message ||
      "").slice(-400);
    return { ok: false, error: `Veritabanı şeması kurulamadı. ${ayrinti}` };
  }
}

// ── Lisans adımı (MOCK) ───────────────────────────────────────────────

/**
 * GEÇİCİ: gerçek lisans API'si henüz yok. Burası yalnız biçim denetimi
 * yapar ve girilen bilgiyi kaydeder — hiçbir şeyi DOĞRULAMAZ ve kopyalamayı
 * engellemez. API hazır olduğunda yalnız bu fonksiyonun içi değişecek.
 */
export async function lisansDogrula(
  firmaId: string,
  anahtar: string,
): Promise<{ ok: boolean; error?: string }> {
  const f = firmaId.trim();
  const a = anahtar.trim().toUpperCase();

  if (!f) return { ok: false, error: "Firma ID zorunludur." };
  if (!/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(a))
    return {
      ok: false,
      error: "Lisans anahtarı XXXX-XXXX-XXXX-XXXX biçiminde olmalıdır.",
    };

  // Ağ gecikmesini taklit etmiyoruz; sahte bir bekleme gerçek doğrulama
  // izlenimi verir ve ileride hata ayıklamayı zorlaştırır.
  return { ok: true };
}

export async function lisansKaydet(
  firmaId: string,
  anahtar: string,
): Promise<{ ok: boolean; error?: string }> {
  const dogrulama = await lisansDogrula(firmaId, anahtar);
  if (!dogrulama.ok) return dogrulama;

  try {
    for (const [k, v] of [
      ["lisans_firma_id", firmaId.trim()],
      ["lisans_anahtar", anahtar.trim().toUpperCase()],
      // Gerçek doğrulama yapılmadığını DB'de de belli ediyoruz ki ileride
      // "bu lisans doğrulandı mı" sorusu yanlış cevaplanmasın.
      ["lisans_durum", "dogrulanmadi"],
    ]) {
      await db.sistemParametre.upsert({
        where: { anahtar: k },
        update: { deger: v },
        create: { anahtar: k, deger: v },
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Lisans bilgisi kaydedilemedi." };
  }
}

// ── Özet / bitiş ──────────────────────────────────────────────────────

export type KurulumOzet = {
  veritabani: string;
  sunucu: string;
  firmaAdi: string;
  yonetici: string;
  kullaniciAdi: string;
  lisansFirmaId: string;
  lisansAnahtar: string;
};

export async function kurulumOzeti(): Promise<KurulumOzet> {
  const [parametreler, yonetici] = await Promise.all([
    db.sistemParametre.findMany({
      where: {
        anahtar: { in: ["firma_adi", "lisans_firma_id", "lisans_anahtar"] },
      },
    }),
    db.kullanici.findFirst({ where: { rol: "Yönetici" } }),
  ]);
  const p = (k: string) =>
    parametreler.find((x) => x.anahtar === k)?.deger ?? "";

  const url = process.env.DATABASE_URL ?? "";
  const sunucu = /sqlserver:\/\/([^;]+)/.exec(url)?.[1] ?? "";
  const veritabani = /database=([^;]+)/.exec(url)?.[1] ?? "";

  return {
    sunucu,
    veritabani,
    firmaAdi: p("firma_adi"),
    yonetici: yonetici?.adSoyad ?? "",
    kullaniciAdi: yonetici?.kullaniciAdi ?? "",
    lisansFirmaId: p("lisans_firma_id"),
    lisansAnahtar: p("lisans_anahtar"),
  };
}

/** Sihirbazı kapatır. Bundan sonra /kurulum bir daha açılmaz. */
export async function kurulumuBitir(): Promise<{ ok: boolean; error?: string }> {
  const adim = await kurulumAdimi();
  if (adim !== "ozet" && adim !== "bitti")
    return { ok: false, error: "Önceki adımlar tamamlanmadan bitirilemez." };
  try {
    await db.sistemParametre.upsert({
      where: { anahtar: TAMAMLANDI },
      update: { deger: "1" },
      create: { anahtar: TAMAMLANDI, deger: "1" },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Kurulum kapatılamadı." };
  }
}
