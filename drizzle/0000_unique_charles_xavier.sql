CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_index" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"token_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_role_check" CHECK ("chat_messages"."role" IN ('user', 'assistant', 'system'))
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"model_id" text NOT NULL,
	"system_prompt_version" text NOT NULL,
	"max_turns" smallint DEFAULT 8 NOT NULL,
	"final_score" real,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "chat_sessions_delivery_id_unique" UNIQUE("delivery_id"),
	CONSTRAINT "chat_sessions_status_check" CHECK ("chat_sessions"."status" IN ('in_progress', 'completed', 'abandoned', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "concept_state" (
	"concept_id" uuid PRIMARY KEY NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"interval_days" real DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"introduced_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"engagement_score" real DEFAULT 0.5 NOT NULL,
	"skip_streak" integer DEFAULT 0 NOT NULL,
	"flagged_at" timestamp with time zone,
	"flagged_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concept_state_engagement_check" CHECK ("concept_state"."engagement_score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain" text,
	"intro_priority" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concepts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_item_concepts" (
	"item_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "content_item_concepts_item_id_concept_id_pk" PRIMARY KEY("item_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" smallint DEFAULT 3 NOT NULL,
	"estimated_duration_seconds" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"body" jsonb NOT NULL,
	"imported_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_items_kind_check" CHECK ("content_items"."kind" IN ('quiz', 'adventure')),
	CONSTRAINT "content_items_difficulty_check" CHECK ("content_items"."difficulty" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_date" date NOT NULL,
	"content_item_id" uuid NOT NULL,
	"scheduled_send_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"resend_message_id" text,
	"token_expires_at" timestamp with time zone NOT NULL,
	"selection_debug" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_delivery_date_unique" UNIQUE("delivery_date"),
	CONSTRAINT "deliveries_status_check" CHECK ("deliveries"."status" IN ('scheduled', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "engagement_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_events_type_check" CHECK ("engagement_events"."event_type" IN ('email_sent', 'email_opened', 'link_clicked', 'session_started', 'session_message', 'session_completed', 'session_abandoned'))
);
--> statement-breakpoint
CREATE TABLE "response_concept_outcomes" (
	"response_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"correct" boolean NOT NULL,
	"score" real NOT NULL,
	CONSTRAINT "response_concept_outcomes_response_id_concept_id_pk" PRIMARY KEY("response_id","concept_id"),
	CONSTRAINT "response_concept_outcomes_score_check" CHECK ("response_concept_outcomes"."score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"answer_payload" jsonb NOT NULL,
	"is_correct" boolean,
	"overall_score" real,
	"response_time_ms" integer,
	"abandoned" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "responses_delivery_id_unique" UNIQUE("delivery_id"),
	CONSTRAINT "responses_score_check" CHECK ("responses"."overall_score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_state" ADD CONSTRAINT "concept_state_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item_concepts" ADD CONSTRAINT "content_item_concepts_item_id_content_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item_concepts" ADD CONSTRAINT "content_item_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_concept_outcomes" ADD CONSTRAINT "response_concept_outcomes_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_concept_outcomes" ADD CONSTRAINT "response_concept_outcomes_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_turn" ON "chat_messages" USING btree ("session_id","turn_index");--> statement-breakpoint
CREATE INDEX "concept_state_due" ON "concept_state" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "concept_state_flagged" ON "concept_state" USING btree ("flagged_at") WHERE "concept_state"."flagged_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "concepts_active_priority" ON "concepts" USING btree ("is_active","intro_priority");--> statement-breakpoint
CREATE INDEX "content_item_concepts_concept" ON "content_item_concepts" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "content_items_kind_active" ON "content_items" USING btree ("kind","is_active");--> statement-breakpoint
CREATE INDEX "deliveries_content_item" ON "deliveries" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "engagement_events_delivery" ON "engagement_events" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "engagement_events_type_time" ON "engagement_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "response_concept_outcomes_concept" ON "response_concept_outcomes" USING btree ("concept_id");