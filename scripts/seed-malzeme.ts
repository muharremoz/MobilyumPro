import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function ean13(t: string) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(t[i]) * (i % 2 === 0 ? 1 : 3);
  return t + ((10 - (s % 10)) % 10);
}
function kodBarkod(kod: string) {
  const m = /(\d+)$/.exec(kod);
  const no = m ? Number(m[1]) : 0;
  return ean13("869" + String(no).padStart(9, "0"));
}

type M = {
  ad: string;
  tur: string;
  cins: string;
  altGrup: string; // grup ağacındaki ad
  birim: string;
  kalinlik: number | null;
  bolum: string; // istasyon adı
  marka: string; // üretici/marka
  maliyet: number;
};

const MALZEMELER: M[] = [
  { ad: "MDF 18mm", tur: "Levha", cins: "MDF", altGrup: "Ahşap Ürün", birim: "m²", kalinlik: 18, bolum: "Kesim", marka: "Kastamonu Entegre", maliyet: 250 },
  { ad: "Sunta / Yonga Levha 18mm", tur: "Levha", cins: "Sunta", altGrup: "Ahşap Ürün", birim: "m²", kalinlik: 18, bolum: "Kesim", marka: "Starwood", maliyet: 180 },
  { ad: "Kenar Bandı (PVC)", tur: "Bant", cins: "PVC Bant", altGrup: "Kenarbant", birim: "m", kalinlik: 1, bolum: "Bantlama", marka: "", maliyet: 5 },
  { ad: "Menteşe", tur: "Bağlantı", cins: "Menteşe", altGrup: "Hırdavat", birim: "adet", kalinlik: null, bolum: "Montaj", marka: "Samet", maliyet: 15 },
  { ad: "Çekmece Rayı", tur: "Bağlantı", cins: "Ray", altGrup: "Hırdavat", birim: "takım", kalinlik: null, bolum: "Montaj", marka: "Samet", maliyet: 60 },
  { ad: "Vida / Dübel", tur: "Hırdavat", cins: "Vida", altGrup: "Hırdavat", birim: "adet", kalinlik: null, bolum: "Montaj", marka: "", maliyet: 0.5 },
  { ad: "Kulp", tur: "Aksesuar", cins: "Kulp", altGrup: "Aksesuar", birim: "adet", kalinlik: null, bolum: "Montaj", marka: "", maliyet: 20 },
  { ad: "Ayna Cam", tur: "Cam", cins: "Ayna", altGrup: "Ayna-Cam", birim: "m²", kalinlik: 4, bolum: "Kesim", marka: "", maliyet: 300 },
  { ad: "Sünger", tur: "Döşeme", cins: "Sünger", altGrup: "Döşeme", birim: "m²", kalinlik: 30, bolum: "Montaj", marka: "", maliyet: 120 },
  { ad: "Döşemelik Kumaş", tur: "Tekstil", cins: "Döşemelik Kumaş", altGrup: "Döşeme", birim: "m", kalinlik: null, bolum: "Montaj", marka: "", maliyet: 150 },
  { ad: "Alüminyum Profil", tur: "Profil", cins: "Alüminyum", altGrup: "Aluminyum", birim: "m", kalinlik: null, bolum: "Kesim", marka: "", maliyet: 90 },
  { ad: "Tutkal / Vernik", tur: "Kimyasal", cins: "Yapıştırıcı", altGrup: "Kimyasal Ürün", birim: "kg", kalinlik: null, bolum: "Montaj", marka: "", maliyet: 80 },
];

async function main() {
  // 1) Cins tanımları (dropdown listelesin)
  const cinsler = [...new Set(MALZEMELER.map((m) => m.cins))];
  for (const [tip, adlar] of [["cins", cinsler]] as const) {
    const mevcut = new Set(
      (await db.tanim.findMany({ where: { tip } })).map((t) => t.ad),
    );
    const eksik = adlar.filter((a) => !mevcut.has(a));
    if (eksik.length)
      await db.tanim.createMany({
        data: eksik.map((ad) => ({ tip, ad, durum: "Aktif" })),
      });
  }

  // 2) Üretici cari eşleştirme (varsa bağla)
  const cariler = await db.cari.findMany({ select: { id: true, ad: true } });
  const cariByAd = new Map(cariler.map((c) => [c.ad.toLowerCase(), c.id]));

  // 3) Sıradaki STK numarası
  const stoklar = await db.stok.findMany({ select: { id: true, ad: true } });
  let maxNo = 1000;
  for (const s of stoklar) {
    const m = /^STK-(\d+)$/.exec(s.id);
    if (m) maxNo = Math.max(maxNo, Number(m[1]));
  }
  const idByAd = new Map(stoklar.map((s) => [s.ad, s.id]));

  let eklenen = 0;
  let guncellenen = 0;
  for (const m of MALZEMELER) {
    const ureticiCariId = cariByAd.get(m.marka.toLowerCase()) ?? null;
    const veri = {
      ad: m.ad,
      cins: m.cins,
      grup: "Hammadde",
      altGrup: m.altGrup,
      stokBirimi: m.birim,
      kalinlik: m.kalinlik,
      bolum: m.bolum,
      marka: m.marka || null,
      ureticiCariId,
      maliyetFiyati: m.maliyet,
      maliyetBirimi: "TL",
      durum: "Aktif",
      rota: "Standart Fabrika Rotası",
    };
    const mevcutId = idByAd.get(m.ad);
    if (mevcutId) {
      await db.stok.update({
        where: { id: mevcutId },
        data: { ...veri, barkod: kodBarkod(mevcutId) },
      });
      guncellenen++;
    } else {
      maxNo++;
      const id = `STK-${maxNo}`;
      await db.stok.create({
        data: { id, ...veri, barkod: kodBarkod(id), stokMiktar: 0 },
      });
      eklenen++;
    }
  }

  console.log(`TAMAM: ${eklenen} eklendi, ${guncellenen} güncellendi.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("HATA:", e);
  await db.$disconnect();
  process.exit(1);
});
