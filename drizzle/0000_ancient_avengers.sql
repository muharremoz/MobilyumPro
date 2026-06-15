CREATE TYPE "public"."durum" AS ENUM('Aktif', 'Pasif');--> statement-breakpoint
CREATE TYPE "public"."malzeme_tipi" AS ENUM('Hammadde', 'Yarı Mamul', 'Yardımcı');--> statement-breakpoint
CREATE TYPE "public"."recete_bilesen_tip" AS ENUM('malzeme', 'parca');--> statement-breakpoint
CREATE TYPE "public"."siparis_durum" AS ENUM('Beklemede', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal');--> statement-breakpoint
CREATE TYPE "public"."uretim_durum" AS ENUM('Planlandı', 'Üretimde', 'Tamamlandı', 'İptal');--> statement-breakpoint
CREATE TYPE "public"."uretim_oncelik" AS ENUM('Düşük', 'Normal', 'Yüksek', 'Acil');--> statement-breakpoint
CREATE TABLE "depo" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"sehir" text NOT NULL,
	"durum" "durum" DEFAULT 'Aktif' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "malzeme" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"tip" "malzeme_tipi" NOT NULL,
	"birim" text NOT NULL,
	"stok" numeric(14, 3) DEFAULT '0' NOT NULL,
	"birim_fiyat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tedarikci" text,
	"durum" "durum" DEFAULT 'Aktif' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musteri" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"email" text,
	"sehir" text
);
--> statement-breakpoint
CREATE TABLE "parca" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"kategori" text NOT NULL,
	"aciklama" text,
	"durum" "durum" DEFAULT 'Aktif' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recete_satiri" (
	"id" serial PRIMARY KEY NOT NULL,
	"parca_id" text NOT NULL,
	"tip" "recete_bilesen_tip" NOT NULL,
	"malzeme_id" text,
	"alt_parca_id" text,
	"miktar" numeric(14, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siparis" (
	"id" text PRIMARY KEY NOT NULL,
	"musteri_id" text,
	"musteri_ad" text NOT NULL,
	"tarih" date NOT NULL,
	"tutar" numeric(14, 2) DEFAULT '0' NOT NULL,
	"durum" "siparis_durum" DEFAULT 'Beklemede' NOT NULL,
	"urun_adedi" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uretim_emri" (
	"id" text PRIMARY KEY NOT NULL,
	"urun_id" text NOT NULL,
	"urun_ad" text NOT NULL,
	"adet" integer DEFAULT 1 NOT NULL,
	"durum" "uretim_durum" DEFAULT 'Planlandı' NOT NULL,
	"oncelik" "uretim_oncelik" DEFAULT 'Normal',
	"olusturma" date NOT NULL,
	"termin" date,
	"kaynak_siparis" text,
	"musteri" text,
	"hedef_depo" text,
	"not" text
);
--> statement-breakpoint
CREATE TABLE "urun" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"kategori" text NOT NULL,
	"fiyat" numeric(14, 2) DEFAULT '0' NOT NULL,
	"stok" integer DEFAULT 0 NOT NULL,
	"durum" "durum" DEFAULT 'Aktif' NOT NULL,
	"gorsel" text
);
--> statement-breakpoint
CREATE TABLE "urun_parca" (
	"id" serial PRIMARY KEY NOT NULL,
	"urun_id" text NOT NULL,
	"parca_id" text NOT NULL,
	"miktar" numeric(14, 3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recete_satiri" ADD CONSTRAINT "recete_satiri_parca_id_parca_id_fk" FOREIGN KEY ("parca_id") REFERENCES "public"."parca"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recete_satiri" ADD CONSTRAINT "recete_satiri_malzeme_id_malzeme_id_fk" FOREIGN KEY ("malzeme_id") REFERENCES "public"."malzeme"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recete_satiri" ADD CONSTRAINT "recete_satiri_alt_parca_id_parca_id_fk" FOREIGN KEY ("alt_parca_id") REFERENCES "public"."parca"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparis" ADD CONSTRAINT "siparis_musteri_id_musteri_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uretim_emri" ADD CONSTRAINT "uretim_emri_urun_id_urun_id_fk" FOREIGN KEY ("urun_id") REFERENCES "public"."urun"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_parca" ADD CONSTRAINT "urun_parca_urun_id_urun_id_fk" FOREIGN KEY ("urun_id") REFERENCES "public"."urun"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_parca" ADD CONSTRAINT "urun_parca_parca_id_parca_id_fk" FOREIGN KEY ("parca_id") REFERENCES "public"."parca"("id") ON DELETE no action ON UPDATE no action;