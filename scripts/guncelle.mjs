/**
 * Fabrika sunucusu güncelleyicisi. Git etiketlerinden (vX.Y.Z) yeni sürümü
 * çeker, kurar; hata olursa eski sürüme GERİ DÖNER (rollback).
 *
 * İki mod:
 *   node scripts/guncelle.mjs --kontrol   → sadece bakar, JSON basar, hiçbir şeyi
 *                                            değiştirmez. Offline'ken sessizce "yok" der.
 *   node scripts/guncelle.mjs             → yeni sürüm varsa uygular (build + migrate + restart).
 *
 * TASARIM İLKELERİ
 *  - Offline güvenli: internet yoksa hiçbir şeye dokunmaz, 0 ile çıkar.
 *  - Veri korunur: DB için YALNIZ `prisma migrate deploy` (ekler/değiştirir, silmez).
 *    `db:geri-yukle` ASLA çağrılmaz — o snapshot'ı siler-yükler, prod'da veri kaybı olur.
 *  - Kullanıcı dosyaları korunur: /uploads ve .env git dışıdır, checkout onlara dokunmaz.
 *  - Rollback: build/migrate patlarsa eski commit + eski .next geri gelir.
 *  - Tek çalışır: kilit dosyası aynı anda iki güncellemeyi engeller.
 *
 * ORTAM DEĞİŞKENLERİ (installer .env'e yazar)
 *  GUNCELLE_DAL            : sürümlerin çıktığı dal (varsayılan: main)
 *  GUNCELLE_DB_YEDEK_KOMUT : migrate ÖNCESİ çalışan DB yedek komutu (SQL Server backup).
 *                            Ayarlıysa ve başarısız olursa güncelleme başlamaz.
 *  GUNCELLE_RESTART_KOMUT  : başarılı build sonrası servisi yeniden başlatan komut
 *                            (örn. "nssm restart MobilyumPro"). Yoksa "restart gerekli" yazılır.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DAL = process.env.GUNCELLE_DAL || "main";
const KILIT = path.resolve(".guncelle.kilit");
const NEXT_DIZIN = path.resolve(".next");
const NEXT_YEDEK = path.resolve(".next.eski");
const SADECE_KONTROL = process.argv.includes("--kontrol");

function komut(c, opts = {}) {
  return execSync(c, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
}
function calistir(c) {
  // Çıktıyı ekrana da bas (uzun süren build/migrate için).
  execSync(c, { stdio: "inherit" });
}
function log(m) {
  if (!SADECE_KONTROL) console.log(m);
}

/** Semver etiketlerini büyükten küçüğe sıralar, en yenisini döndürür. */
function enYeniEtiket() {
  const ham = komut("git tag --list");
  const surumler = ham
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^v\d+\.\d+\.\d+$/.test(s))
    .map((s) => ({ etiket: s, p: s.slice(1).split(".").map(Number) }))
    .sort((a, b) => b.p[0] - a.p[0] || b.p[1] - a.p[1] || b.p[2] - a.p[2]);
  return surumler[0]?.etiket ?? null;
}

/** Şu an checkout edili sürüm etiketi (yoksa null). */
function mevcutEtiket() {
  try {
    return komut("git describe --tags --exact-match HEAD");
  } catch {
    return null;
  }
}

// --- Uzaktan etiketleri tazele (offline güvenli) -------------------------
let internetVar = true;
try {
  komut(`git fetch origin ${DAL} --tags --quiet`, { timeout: 30000 });
} catch {
  internetVar = false; // internet yok / origin erişilemiyor
}

const mevcut = mevcutEtiket();
const enYeni = enYeniEtiket();
const guncellemeVar = Boolean(enYeni && enYeni !== mevcut);

// --- Kontrol modu: sadece raporla ----------------------------------------
if (SADECE_KONTROL) {
  process.stdout.write(
    JSON.stringify({ mevcut, enYeni, guncellemeVar, internetVar }) + "\n"
  );
  process.exit(0);
}

// --- Uygulama modu -------------------------------------------------------
if (!internetVar) {
  log("İnternet yok — güncelleme kontrolü atlandı. Uygulama çalışmaya devam ediyor.");
  process.exit(0);
}
if (!guncellemeVar) {
  log(`Zaten güncel${mevcut ? ` (${mevcut})` : ""}.`);
  process.exit(0);
}

// Kilit
if (fs.existsSync(KILIT)) {
  log("Başka bir güncelleme sürüyor (kilit var). Çıkılıyor.");
  process.exit(0);
}
fs.writeFileSync(KILIT, `${mevcut ?? "?"} -> ${enYeni}\n`, "utf8");

const oncekiRef = komut("git rev-parse HEAD"); // rollback noktası
let asamaCheckout = false;
let asamaNextYedek = false;

function rollback(sebep) {
  console.error(`\n✖ Güncelleme başarısız: ${sebep}`);
  console.error("↩ Eski sürüme geri dönülüyor...");
  try {
    if (asamaCheckout) calistir(`git checkout --quiet --force ${oncekiRef}`);
    if (asamaNextYedek && fs.existsSync(NEXT_YEDEK)) {
      fs.rmSync(NEXT_DIZIN, { recursive: true, force: true });
      fs.renameSync(NEXT_YEDEK, NEXT_DIZIN);
    }
    console.error("↩ Eski sürüm geri yüklendi. Uygulama eski haliyle çalışıyor.");
    console.error(
      "  NOT: DB migrate adımı geçtiyse şema geri ALINMAZ — GUNCELLE_DB_YEDEK_KOMUT ile\n" +
      "  alınan yedekten elle dönmek gerekebilir."
    );
  } catch (e) {
    console.error(`⚠ Rollback sırasında hata: ${e.message}`);
    console.error("  Sunucu elle kontrol edilmeli!");
  } finally {
    fs.rmSync(KILIT, { force: true });
  }
  process.exit(1);
}

try {
  log(`Güncelleniyor: ${mevcut ?? "?"} → ${enYeni}`);

  // 1) Eski build'i yedekle (rollback için)
  if (fs.existsSync(NEXT_DIZIN)) {
    fs.rmSync(NEXT_YEDEK, { recursive: true, force: true });
    fs.renameSync(NEXT_DIZIN, NEXT_YEDEK);
    asamaNextYedek = true;
  }

  // 2) Yeni sürüme geç
  log(`• Kod: ${enYeni} sürümüne geçiliyor`);
  calistir(`git checkout --quiet --force ${enYeni}`);
  asamaCheckout = true;

  // 3) Bağımlılıklar
  log("• Bağımlılıklar kuruluyor (npm ci)");
  calistir("npm ci");

  // 4) Prisma client
  log("• Prisma client üretiliyor");
  calistir("npx prisma generate");

  // 5) DB yedeği (migrate ÖNCESİ — güvenlik ağı)
  if (process.env.GUNCELLE_DB_YEDEK_KOMUT) {
    log("• DB yedeği alınıyor (migrate öncesi)");
    calistir(process.env.GUNCELLE_DB_YEDEK_KOMUT);
  } else {
    log("• (DB yedek komutu ayarlı değil — migrate öncesi yedek atlanıyor)");
  }

  // 6) DB şeması — VERİYİ KORUR
  log("• DB şeması uygulanıyor (prisma migrate deploy)");
  calistir("npx prisma migrate deploy");

  // 7) Build
  log("• Uygulama derleniyor (next build)");
  calistir("npm run build");

  // 8) Başarılı → eski build yedeğini temizle
  fs.rmSync(NEXT_YEDEK, { recursive: true, force: true });
  fs.rmSync(KILIT, { force: true });

  // 9) Servisi yeniden başlat (tek anlık geçiş)
  if (process.env.GUNCELLE_RESTART_KOMUT) {
    log("• Servis yeniden başlatılıyor");
    calistir(process.env.GUNCELLE_RESTART_KOMUT);
  } else {
    log("• Servisi yeniden başlatın (GUNCELLE_RESTART_KOMUT ayarlı değil).");
  }

  log(`\n✔ Güncelleme tamam: ${enYeni}`);
} catch (e) {
  rollback(e.message);
}
