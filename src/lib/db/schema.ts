import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  date,
  serial,
} from "drizzle-orm/pg-core";

/**
 * MobilyumPro veritabanı şeması (PostgreSQL + Drizzle).
 * Alan adları uygulamadaki domain modeliyle (Türkçe) birebir tutulur.
 * ID'ler şimdilik insan-okunur kodlar (URN-1001, MLZ-1001 ...) — mevcut
 * referans modeliyle uyumlu. İleride seri/uuid PK + kod alanına geçilebilir.
 */

// ── Enum'lar ────────────────────────────────────────────────────────────
export const durumEnum = pgEnum("durum", ["Aktif", "Pasif"]);
export const malzemeTipiEnum = pgEnum("malzeme_tipi", [
  "Hammadde",
  "Yarı Mamul",
  "Yardımcı",
]);
export const receteBilesenTipEnum = pgEnum("recete_bilesen_tip", [
  "malzeme",
  "parca",
]);
export const siparisDurumEnum = pgEnum("siparis_durum", [
  "Beklemede",
  "Hazırlanıyor",
  "Kargoda",
  "Teslim Edildi",
  "İptal",
]);
export const uretimDurumEnum = pgEnum("uretim_durum", [
  "Planlandı",
  "Üretimde",
  "Tamamlandı",
  "İptal",
]);
export const uretimOncelikEnum = pgEnum("uretim_oncelik", [
  "Düşük",
  "Normal",
  "Yüksek",
  "Acil",
]);

const para = (name: string) => numeric(name, { precision: 14, scale: 2 });
const miktarTip = (name: string) => numeric(name, { precision: 14, scale: 3 });

// ── Ürün (model) ────────────────────────────────────────────────────────
export const urun = pgTable("urun", {
  id: text("id").primaryKey(),
  ad: text("ad").notNull(),
  kategori: text("kategori").notNull(),
  fiyat: para("fiyat").notNull().default("0"),
  stok: integer("stok").notNull().default(0),
  durum: durumEnum("durum").notNull().default("Aktif"),
  gorsel: text("gorsel"),
});

// ── Parça (BOM kataloğu) ────────────────────────────────────────────────
export const parca = pgTable("parca", {
  id: text("id").primaryKey(),
  ad: text("ad").notNull(),
  kategori: text("kategori").notNull(),
  aciklama: text("aciklama"),
  durum: durumEnum("durum").notNull().default("Aktif"),
});

// ── Malzeme (hammadde / yarı mamul / yardımcı) ──────────────────────────
export const malzeme = pgTable("malzeme", {
  id: text("id").primaryKey(),
  ad: text("ad").notNull(),
  tip: malzemeTipiEnum("tip").notNull(),
  birim: text("birim").notNull(),
  stok: miktarTip("stok").notNull().default("0"),
  birimFiyat: para("birim_fiyat").notNull().default("0"),
  tedarikci: text("tedarikci"),
  durum: durumEnum("durum").notNull().default("Aktif"),
});

// ── Reçete satırı (parçanın bileşenleri: malzeme veya alt-parça) ────────
export const receteSatiri = pgTable("recete_satiri", {
  id: serial("id").primaryKey(),
  parcaId: text("parca_id")
    .notNull()
    .references(() => parca.id, { onDelete: "cascade" }),
  tip: receteBilesenTipEnum("tip").notNull(),
  malzemeId: text("malzeme_id").references(() => malzeme.id),
  altParcaId: text("alt_parca_id").references(() => parca.id),
  miktar: miktarTip("miktar").notNull(),
});

// ── Ürün-Parça (modelin BOM bağlantısı) ─────────────────────────────────
export const urunParca = pgTable("urun_parca", {
  id: serial("id").primaryKey(),
  urunId: text("urun_id")
    .notNull()
    .references(() => urun.id, { onDelete: "cascade" }),
  parcaId: text("parca_id")
    .notNull()
    .references(() => parca.id),
  miktar: miktarTip("miktar").notNull(),
});

// ── Depo ────────────────────────────────────────────────────────────────
export const depo = pgTable("depo", {
  id: text("id").primaryKey(),
  ad: text("ad").notNull(),
  sehir: text("sehir").notNull(),
  kapasite: integer("kapasite").notNull().default(0),
  doluluk: integer("doluluk").notNull().default(0),
  durum: durumEnum("durum").notNull().default("Aktif"),
});

// ── Müşteri ─────────────────────────────────────────────────────────────
export const musteri = pgTable("musteri", {
  id: text("id").primaryKey(),
  ad: text("ad").notNull(),
  email: text("email"),
  sehir: text("sehir"),
});

// ── Sipariş ─────────────────────────────────────────────────────────────
export const siparis = pgTable("siparis", {
  id: text("id").primaryKey(),
  musteriId: text("musteri_id").references(() => musteri.id),
  musteriAd: text("musteri_ad").notNull(), // anlık ad (görüntü/tarihsel)
  tarih: date("tarih").notNull(),
  tutar: para("tutar").notNull().default("0"),
  durum: siparisDurumEnum("durum").notNull().default("Beklemede"),
  urunAdedi: integer("urun_adedi").notNull().default(1),
});

// ── Üretim emri ─────────────────────────────────────────────────────────
export const uretimEmri = pgTable("uretim_emri", {
  id: text("id").primaryKey(),
  urunId: text("urun_id")
    .notNull()
    .references(() => urun.id),
  urunAd: text("urun_ad").notNull(),
  adet: integer("adet").notNull().default(1),
  durum: uretimDurumEnum("durum").notNull().default("Planlandı"),
  oncelik: uretimOncelikEnum("oncelik").default("Normal"),
  olusturma: date("olusturma").notNull(),
  termin: date("termin"),
  kaynakSiparis: text("kaynak_siparis"),
  musteri: text("musteri"),
  hedefDepo: text("hedef_depo"),
  not: text("not"),
});

// ── Tipler (sorgu sonuçları için) ───────────────────────────────────────
export type UrunRow = typeof urun.$inferSelect;
export type ParcaRow = typeof parca.$inferSelect;
export type MalzemeRow = typeof malzeme.$inferSelect;
export type DepoRow = typeof depo.$inferSelect;
export type MusteriRow = typeof musteri.$inferSelect;
export type SiparisRow = typeof siparis.$inferSelect;
export type UretimEmriRow = typeof uretimEmri.$inferSelect;
