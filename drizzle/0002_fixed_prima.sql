CREATE TYPE "public"."cari_islem_turu" AS ENUM('Tahsilat', 'Ödeme', 'Borç', 'Alacak');--> statement-breakpoint
CREATE TYPE "public"."cari_sinif" AS ENUM('Bireysel', 'Kurumsal');--> statement-breakpoint
CREATE TYPE "public"."cari_tip" AS ENUM('Müşteri', 'Tedarikçi', 'Her İkisi');--> statement-breakpoint
CREATE TYPE "public"."para_birimi" AS ENUM('TL', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."stok_hareket_ref" AS ENUM('urun', 'malzeme');--> statement-breakpoint
CREATE TYPE "public"."stok_hareket_turu" AS ENUM('Giriş', 'Çıkış', 'Transfer');--> statement-breakpoint
CREATE TABLE "cari" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"tip" "cari_tip" NOT NULL,
	"sinif" "cari_sinif" NOT NULL,
	"vergi_no" text,
	"vergi_dairesi" text,
	"telefon" text,
	"email" text,
	"adres" text,
	"sehir" text,
	"bakiye" numeric(14, 2) DEFAULT '0' NOT NULL,
	"para_birimi" "para_birimi" DEFAULT 'TL' NOT NULL,
	"durum" "durum" DEFAULT 'Aktif' NOT NULL,
	"not" text
);
--> statement-breakpoint
CREATE TABLE "cari_islem" (
	"id" text PRIMARY KEY NOT NULL,
	"cari_id" text NOT NULL,
	"tarih" date NOT NULL,
	"tur" "cari_islem_turu" NOT NULL,
	"tutar" numeric(14, 2) NOT NULL,
	"belge" text,
	"aciklama" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stok_hareket" (
	"id" text PRIMARY KEY NOT NULL,
	"tarih" date NOT NULL,
	"tur" "stok_hareket_turu" NOT NULL,
	"ref_tip" "stok_hareket_ref" NOT NULL,
	"ref_id" text NOT NULL,
	"miktar" numeric(14, 3) NOT NULL,
	"birim" text NOT NULL,
	"depo" text NOT NULL,
	"aciklama" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "marka" text;--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "barkod" text;--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "agirlik" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "min_stok" integer;--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "gorseller" text[];--> statement-breakpoint
ALTER TABLE "urun" ADD COLUMN "varyantlar" jsonb;--> statement-breakpoint
ALTER TABLE "cari_islem" ADD CONSTRAINT "cari_islem_cari_id_cari_id_fk" FOREIGN KEY ("cari_id") REFERENCES "public"."cari"("id") ON DELETE cascade ON UPDATE no action;