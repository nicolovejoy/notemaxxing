/**
 * Daily Learning Companion — Postgres schema (Neon in prod, PGlite in tests).
 *
 * Two learners (Max and Nico) share ONE content bank but have entirely separate
 * mastery state. Only `concept_state` and `deliveries` carry a learner_id —
 * everything else (responses, outcomes, engagement, chat) hangs off a delivery
 * and inherits its learner through that FK. Don't add redundant learner_id
 * columns downstream; they'd be a denormalization waiting to disagree.
 *
 * There is still no session/password anywhere: identity for the daily loop comes
 * from the signed link in the email, which names the delivery, which names the
 * learner.
 */
import { sql } from 'drizzle-orm'
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * A person receiving the daily prompt. Expected N is 2.
 *
 * Scheduling settings live here rather than in app_config because they're
 * genuinely per-person: Max and Nico can be in different timezones and want
 * mail at different hours, and either can pause without affecting the other.
 */
export const learners = pgTable(
  'learners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** ALWAYS stored lowercased + trimmed — enforced in code, never by the DB. */
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    /** IANA zone. The cron runs on UTC and gates on this — see lib/learning/send-window.ts. */
    timezone: text('timezone').notNull().default('America/Los_Angeles'),
    sendHourLocal: smallint('send_hour_local').notNull().default(7),
    /** Suppresses sending until this instant. Finals week, travel. */
    pausedUntil: timestamp('paused_until', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('learners_send_hour_check', sql`${t.sendHourLocal} BETWEEN 0 AND 23`),
    index('learners_active').on(t.isActive),
  ]
)

/** A single learnable idea, e.g. "SSRIs — mechanism of action". Shared by all learners. */
export const concepts = pgTable(
  'concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    /** Coarse grouping, e.g. 'neuroscience/cellular'. Display only. */
    domain: text('domain'),
    /**
     * Cold-start ordering hint. Lower goes first, so prerequisites can be
     * introduced before what depends on them (action potentials before
     * synaptic plasticity) without modelling a full prerequisite graph.
     */
    introPriority: integer('intro_priority'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('concepts_active_priority').on(t.isActive, t.introPriority)]
)

/**
 * A quiz question or an adventure scenario.
 *
 * One table, not two. Shared metadata the selector filters on gets real
 * columns; the kind-specific payload lives in `body` because selection never
 * looks inside it — only the render layer and the grading call do.
 */
export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    difficulty: smallint('difficulty').notNull().default(3),
    estimatedDurationSeconds: integer('estimated_duration_seconds'),
    isActive: boolean('is_active').notNull().default(true),
    /**
     * quiz:      { prompt, options[], correct_index, explanation }
     * adventure: { opening_scenario, grading_rubric, max_turns }
     */
    body: jsonb('body').notNull(),
    /** Traceability back to the authoring batch it was imported from. */
    importedBatchId: text('imported_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('content_items_kind_check', sql`${t.kind} IN ('quiz', 'adventure')`),
    check('content_items_difficulty_check', sql`${t.difficulty} BETWEEN 1 AND 5`),
    index('content_items_kind_active').on(t.kind, t.isActive),
  ]
)

/** Which concepts an item exercises. Adventures tag several. */
export const contentItemConcepts = pgTable(
  'content_item_concepts',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'restrict' }),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.conceptId] }),
    index('content_item_concepts_concept').on(t.conceptId),
  ]
)

/**
 * Everything the selector needs about a concept FOR ONE LEARNER, in one row:
 * SM-2 scheduling state, engagement, and the skip/flag counters.
 *
 * Keyed on (learner_id, concept_id) — Max being fluent in action potentials
 * says nothing about whether Nico is.
 */
export const conceptState = pgTable(
  'concept_state',
  {
    learnerId: uuid('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    // --- SM-2 ---
    easeFactor: real('ease_factor').notNull().default(2.5),
    intervalDays: real('interval_days').notNull().default(0),
    repetitions: integer('repetitions').notNull().default(0),
    /** NULL until the concept has been introduced. */
    dueAt: timestamp('due_at', { withTimezone: true }),
    introducedAt: timestamp('introduced_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    // --- engagement ---
    /** EWMA in [0,1]. Defaults to a neutral 0.5 prior: a never-shown concept
     *  must not look identical to one Max keeps ignoring. */
    engagementScore: real('engagement_score').notNull().default(0.5),
    skipStreak: integer('skip_streak').notNull().default(0),
    /** Set at skip_streak >= 3; cleared by any completed response. */
    flaggedAt: timestamp('flagged_at', { withTimezone: true }),
    flaggedReason: text('flagged_reason'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.learnerId, t.conceptId] }),
    check('concept_state_engagement_check', sql`${t.engagementScore} BETWEEN 0 AND 1`),
    index('concept_state_due').on(t.learnerId, t.dueAt),
    index('concept_state_flagged')
      .on(t.learnerId, t.flaggedAt)
      .where(sql`${t.flaggedAt} IS NOT NULL`),
  ]
)

/**
 * One row per learner per calendar day: what got sent.
 *
 * (learner_id, delivery_date) is UNIQUE — that's the idempotency anchor. Vercel
 * Cron can double-fire, so the insert is ON CONFLICT DO NOTHING before Resend
 * is called. It's a composite now, not delivery_date alone: Max and Nico both
 * get mail on the same day, and a bare date UNIQUE would let whoever's cron
 * fired first silently starve the other.
 */
export const deliveries = pgTable(
  'deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: uuid('learner_id')
      .notNull()
      .references(() => learners.id, { onDelete: 'cascade' }),
    /** The learner's LOCAL calendar day, not UTC. */
    deliveryDate: date('delivery_date').notNull(),
    contentItemId: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id),
    scheduledSendAt: timestamp('scheduled_send_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: text('status').notNull().default('scheduled'),
    resendMessageId: text('resend_message_id'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
    /** The scoring trace. Observability only — never read back by the selector. */
    selectionDebug: jsonb('selection_debug'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'deliveries_status_check',
      sql`${t.status} IN ('scheduled', 'sent', 'failed', 'skipped')`
    ),
    // The real guard against a double send.
    uniqueIndex('deliveries_learner_date').on(t.learnerId, t.deliveryDate),
    index('deliveries_content_item').on(t.contentItemId),
    index('deliveries_learner_sent').on(t.learnerId, t.sentAt),
  ]
)

/** The answer. UNIQUE on deliveryId, so a re-clicked link can't double-score. */
export const responses = pgTable(
  'responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .unique()
      .references(() => deliveries.id, { onDelete: 'cascade' }),
    answerPayload: jsonb('answer_payload').notNull(),
    /** Convenience denormalization for single-concept quizzes only.
     *  The scheduler reads responseConceptOutcomes, never this. */
    isCorrect: boolean('is_correct'),
    overallScore: real('overall_score'),
    responseTimeMs: integer('response_time_ms'),
    abandoned: boolean('abandoned').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('responses_score_check', sql`${t.overallScore} BETWEEN 0 AND 1`)]
)

/**
 * Per-concept outcome of a response — the source of truth the SM-2 updater
 * reads. Always populated, even for a single-concept quiz, because one
 * adventure can score three tagged concepts differently.
 */
export const responseConceptOutcomes = pgTable(
  'response_concept_outcomes',
  {
    responseId: uuid('response_id')
      .notNull()
      .references(() => responses.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id')
      .notNull()
      .references(() => concepts.id, { onDelete: 'cascade' }),
    correct: boolean('correct').notNull(),
    score: real('score').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.responseId, t.conceptId] }),
    check('response_concept_outcomes_score_check', sql`${t.score} BETWEEN 0 AND 1`),
    index('response_concept_outcomes_concept').on(t.conceptId),
  ]
)

/** Append-only telemetry. Deliberately schema-light. */
export const engagementEvents = pgTable(
  'engagement_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => deliveries.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'engagement_events_type_check',
      sql`${t.eventType} IN ('email_sent', 'email_opened', 'link_clicked', 'session_started', 'session_message', 'session_completed', 'session_abandoned')`
    ),
    index('engagement_events_delivery').on(t.deliveryId),
    index('engagement_events_type_time').on(t.eventType, t.occurredAt),
  ]
)

/** One live adventure conversation. */
export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .unique()
      .references(() => deliveries.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('in_progress'),
    modelId: text('model_id').notNull(),
    systemPromptVersion: text('system_prompt_version').notNull(),
    /** Turn cap — the API cost control. */
    maxTurns: smallint('max_turns').notNull().default(8),
    finalScore: real('final_score'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    check(
      'chat_sessions_status_check',
      sql`${t.status} IN ('in_progress', 'completed', 'abandoned', 'expired')`
    ),
  ]
)

/**
 * Transcript turns, normalized rather than a JSONB array on chatSessions:
 * each turn is an independent insert, so a retried request can't lose a
 * read-modify-write race on a growing blob.
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    turnIndex: integer('turn_index').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokenUsage: jsonb('token_usage'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('chat_messages_role_check', sql`${t.role} IN ('user', 'assistant', 'system')`),
    uniqueIndex('chat_messages_session_turn').on(t.sessionId, t.turnIndex),
  ]
)

/**
 * Global config only. Per-learner scheduling (timezone, send hour, pause) lives
 * on `learners` — it's per-person, not per-app.
 */
export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
