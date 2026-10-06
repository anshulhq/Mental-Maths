import { boolean, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const attempts = pgTable(
  'attempts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').notNull(),
    mode: text('mode').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    correctCount: integer('correct_count').notNull(),
    durationMs: integer('duration_ms').notNull(),
    completed: boolean('completed').notNull().default(true),
    localDate: text('local_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('attempts_user_date_idx').on(t.userId, t.localDate),
    index('attempts_user_category_idx').on(t.userId, t.categoryId),
  ],
)

export const answers = pgTable(
  'answers',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    attemptId: integer('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').notNull(),
    item: text('item').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    timeMs: integer('time_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('answers_user_category_item_idx').on(t.userId, t.categoryId, t.item),
    index('answers_attempt_idx').on(t.attemptId),
  ],
)
