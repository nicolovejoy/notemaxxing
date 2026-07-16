ALTER TABLE "content_items" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_external_id_unique" UNIQUE("external_id");