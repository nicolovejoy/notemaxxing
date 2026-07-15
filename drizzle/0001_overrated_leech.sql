CREATE TABLE "learners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"send_hour_local" smallint DEFAULT 7 NOT NULL,
	"paused_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learners_email_unique" UNIQUE("email"),
	CONSTRAINT "learners_send_hour_check" CHECK ("learners"."send_hour_local" BETWEEN 0 AND 23)
);
--> statement-breakpoint
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_delivery_date_unique";--> statement-breakpoint
DROP INDEX "concept_state_due";--> statement-breakpoint
DROP INDEX "concept_state_flagged";--> statement-breakpoint

-- Hand-edited. drizzle-kit emitted the ADD CONSTRAINT ... PRIMARY KEY before the
-- ADD COLUMN it references, and left the old PK drop commented out (it can't yet
-- resolve the existing constraint name — it's concept_state_pkey). As generated
-- this migration fails. Order below: add the column, drop the old PK, add the new.
-- Safe as a plain NOT NULL add because both tables are empty.
ALTER TABLE "concept_state" ADD COLUMN "learner_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "concept_state" DROP CONSTRAINT "concept_state_pkey";--> statement-breakpoint
ALTER TABLE "concept_state" ADD CONSTRAINT "concept_state_learner_id_concept_id_pk" PRIMARY KEY("learner_id","concept_id");--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "learner_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "learners_active" ON "learners" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "concept_state" ADD CONSTRAINT "concept_state_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_learner_date" ON "deliveries" USING btree ("learner_id","delivery_date");--> statement-breakpoint
CREATE INDEX "deliveries_learner_sent" ON "deliveries" USING btree ("learner_id","sent_at");--> statement-breakpoint
CREATE INDEX "concept_state_due" ON "concept_state" USING btree ("learner_id","due_at");--> statement-breakpoint
CREATE INDEX "concept_state_flagged" ON "concept_state" USING btree ("learner_id","flagged_at") WHERE "concept_state"."flagged_at" IS NOT NULL;
