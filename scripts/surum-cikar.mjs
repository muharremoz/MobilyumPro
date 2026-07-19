/**
 * Yeni bir müşteri sürümü çıkarır (git tag).
 * Kullanım:
 *   npm run surum-cikar          → yama sürümü (0.1.0 → 0.1.1)
 *   npm run surum-cikar -- minor → 0.1.0 → 0.2.0
 *   npm run surum-cikar -- major → 0.1.0 → 1.0.0
 *   npm run surum-cikar -- 1.4.0 → tam olarak 1.4.0
 *
 * Ne yapar: package.json sürümünü yükseltir, commit + `vX.Y.Z` etiketi atar,
 * ikisini de origin'e gönderir. Fabrika sunucuları YALNIZ bu etiketleri görür;
 * normal push'lar müşteriye gitmez. Yani "artık kararlı" dediğin an bunu çalıştır.
 *
 * Güvenlik: temiz olmayan çalışma ağacında veya main dışı bir dalda çalışmaz
 * (yanlışlıkla yarım iş sürüm olmasın diye).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CIKIS_DALI = "main"; // sürüm yalnız bu daldan çıkar

function git(komut, sessiz = false) {
  return execSync(`git ${komut}`, {
    encoding: "utf8",
    stdio: sessiz ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "inherit"],
  }).trim();
}

function dur(mesaj) {
  console.error(`\n✖ ${mesaj}\n`);
  process.exit(1);
}

// --- Ön kontroller -------------------------------------------------------
const dal = git("rev-parse --abbrev-ref HEAD");
if (dal !== CIKIS_DALI) {
  dur(`Sürüm yalnız '${CIKIS_DALI}' dalından çıkar. Şu an '${dal}' dalındasın.`);
}

if (git("status --porcelain")) {
  dur("Çalışma ağacı temiz değil. Önce commit/stash yap, sonra sürüm çıkar.");
}

// Uzaktakiyle senkron mu? (geride olan sürüm çıkarmak karışıklık yaratır)
git("fetch origin --tags --quiet", true);
const yerel = git("rev-parse HEAD");
const uzak = git(`rev-parse origin/${CIKIS_DALI}`);
if (yerel !== uzak) {
  dur(`Yerel '${CIKIS_DALI}' ile origin farklı. Önce push/pull ile eşitle.`);
}

// --- Yeni sürüm numarasını hesapla ---------------------------------------
const pkgYol = path.resolve("package.json");
const pkg = JSON.parse(fs.readFileSync(pkgYol, "utf8"));
const [maj, min, yam] = pkg.version.split(".").map(Number);

const arg = (process.argv[2] || "patch").trim();
let yeni;
if (arg === "patch") yeni = `${maj}.${min}.${yam + 1}`;
else if (arg === "minor") yeni = `${maj}.${min + 1}.0`;
else if (arg === "major") yeni = `${maj + 1}.0.0`;
else if (/^\d+\.\d+\.\d+$/.test(arg)) yeni = arg;
else dur(`Geçersiz argüman: '${arg}'. patch | minor | major | X.Y.Z bekleniyor.`);

const etiket = `v${yeni}`;

// Etiket zaten var mı?
const etiketler = git("tag --list", true).split("\n");
if (etiketler.includes(etiket)) {
  dur(`'${etiket}' etiketi zaten var. Farklı bir sürüm seç.`);
}

// --- Uygula --------------------------------------------------------------
pkg.version = yeni;
fs.writeFileSync(pkgYol, JSON.stringify(pkg, null, 2) + "\n", "utf8");

git(`add package.json`);
git(`commit -m "chore(surum): ${etiket}"`);
git(`tag -a ${etiket} -m "Sürüm ${yeni}"`);
git(`push origin ${CIKIS_DALI}`);
git(`push origin ${etiket}`);

console.log(`\n✔ Sürüm çıkarıldı: ${etiket}`);
console.log(`  Fabrika sunucuları bir sonraki kontrolde bu sürümü görecek.`);
console.log(`  (Uygulama danışmalıdır — hemen kurulmaz.)\n`);
