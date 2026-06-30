ALTER TYPE "public"."stok_hareket_ref" RENAME VALUE 'urun' TO 'model';--> statement-breakpoint
ALTER TABLE "urun" RENAME TO "model";--> statement-breakpoint
ALTER TABLE "urun_parca" RENAME TO "model_parca";--> statement-breakpoint
ALTER TABLE "model_parca" RENAME COLUMN "urun_id" TO "model_id";--> statement-breakpoint
ALTER TABLE "uretim_emri" RENAME COLUMN "urun_id" TO "model_id";--> statement-breakpoint
ALTER TABLE "uretim_emri" RENAME COLUMN "urun_ad" TO "model_ad";
