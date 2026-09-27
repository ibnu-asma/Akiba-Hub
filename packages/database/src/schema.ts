import { pgTable, uuid, varchar, text, integer, real, boolean, timestamp, jsonb, index, uniqueIndex, date } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

/**
 * A2SV Hub schema — source of truth for the persistent model.
 * Each table maps to a section of SPEC.md §10. Keep this file aligned
 * with the spec as features evolve; migrate via `pnpm db:generate`.
 */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    passwordHash: varchar('password_hash', { length: 100 }).notNull(),
    role: varchar('role', { length: 32 }).notNull().default('student'),
    avatarUrl: text('avatar_url'),
    country: varchar('country', { length: 80 }),
    university: varchar('university', { length: 160 }),
    department: varchar('department', { length: 160 }),
    instagram: varchar('instagram', { length: 120 }),
    linkedin: varchar('linkedin', { length: 320 }),
    github: varchar('github', { length: 120 }),
    githubPat: text('github_pat'),
    telegram: varchar('telegram', { length: 120 }),
    leetcode: varchar('leetcode', { length: 120 }),
    codeforces: varchar('codeforces', { length: 120 }),
    studentId: varchar('student_id', { length: 64 }),
    bio: text('bio'),
    rating: real('rating').notNull().default(1200),
    groupId: uuid('group_id'), // FK groups — nullable for HoA
    invitedById: uuid('invited_by_id'), // HoA who invited (users.id)
    isRemoved: boolean('is_removed').notNull().default(false),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    takenOverById: uuid('taken_over_by_id'), // invitation take-over target
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const superGroups = pgTable(
  'super_groups',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 120 }).notNull(),
    createdBy: uuid('created_by').notNull(), // users.id
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex('super_groups_name_idx').on(t.name)],
);

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 120 }).notNull(),
    shortName: varchar('short_name', { length: 16 }).notNull(),
    description: text('description'),
    country: varchar('country', { length: 80 }),
    superGroupId: uuid('super_group_id'), // FK super_groups.id
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('groups_short_name_idx').on(t.shortName)],
);

/** M2M: which heads (users with role head_of_education|head_of_academy) lead a group. */
export const groupHeads = pgTable(
  'group_heads',
  {
    groupId: uuid('group_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex('group_heads_pk').on(t.groupId, t.userId)],
);

/** Curriculum phases per SuperGroup (SPEC §10 Track). */
export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    superGroupId: uuid('super_group_id').notNull(), // FK super_groups.id
    phase: varchar('phase', { length: 24 }).notNull(), // PYTHON | PHASE_I | CAMP_I | PHASE_II | CAMP_II
    name: varchar('name', { length: 160 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('tracks_sg_phase_idx').on(t.superGroupId, t.phase).where(sql`${t.deletedAt} is null`)],
);

export const trackProblems = pgTable(
  'track_problems',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    trackId: uuid('track_id').notNull(), // FK tracks.id
    problemId: uuid('problem_id').notNull(), // FK problems.id
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('track_problems_pk').on(t.trackId, t.problemId)],
);

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 200 }).notNull(),
    platform: varchar('platform', { length: 32 }).notNull(), // leetcode | codeforces | hackerrank | other
    difficulty: varchar('difficulty', { length: 8 }).notNull(), // easy | medium | hard
    tags: jsonb('tags').notNull().default(sql`'[]'`), // string[]
    link: varchar('link', { length: 500 }).notNull(),
    addedBy: uuid('added_by').notNull(), // users.id (HoE/HoA)
    votesUp: integer('votes_up').notNull().default(0),
    votesDown: integer('votes_down').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('problems_platform_idx').on(t.platform), index('problems_difficulty_idx').on(t.difficulty), index('problems_added_by_idx').on(t.addedBy)],
);

/** Daily problem queue per SuperGroup (SPEC §7.9) — one active per date. */
export const dailyProblems = pgTable(
  'daily_problems',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    superGroupId: uuid('super_group_id').notNull(),
    problemId: uuid('problem_id').notNull(),
    date: date('date').notNull(),
    queueOrder: integer('queue_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('daily_problems_sg_date_idx').on(t.superGroupId, t.date)],
);

export const contests = pgTable(
  'contests',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 200 }).notNull(),
    number: integer('number'),
    type: varchar('type', { length: 16 }).notNull().default('standard'), // standard | super
    unrated: boolean('unrated').notNull().default(false),
    date: timestamp('date', { withTimezone: true }).notNull(),
    standingsLink: varchar('standings_link', { length: 500 }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('contests_date_idx').on(t.date)],
);

/** M2M: which groups participate in a contest. */
export const contestGroups = pgTable(
  'contest_groups',
  {
    contestId: uuid('contest_id').notNull(),
    groupId: uuid('group_id').notNull(),
  },
  (t) => [uniqueIndex('contest_groups_pk').on(t.contestId, t.groupId)],
);

export const contestProblems = pgTable(
  'contest_problems',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    contestId: uuid('contest_id').notNull(),
    pseudo: varchar('pseudo', { length: 4 }).notNull(), // A | B | C ...
    problemId: uuid('problem_id').notNull(),
  },
  (t) => [uniqueIndex('contest_problems_pk').on(t.contestId, t.pseudo)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    date: date('date').notNull(),
    startTime: varchar('start_time', { length: 16 }), // e.g. "8:00 PM"
    endTime: varchar('end_time', { length: 16 }), // e.g. "11:00 PM"
    location: varchar('location', { length: 200 }),
    resourceLink: varchar('resource_link', { length: 500 }),
    recordingLink: varchar('recording_link', { length: 500 }),
    lecturer: varchar('lecturer', { length: 160 }),
    fundId: uuid('fund_id'), // FK funds.id
    calendarInvite: boolean('calendar_invite').notNull().default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('sessions_date_idx').on(t.date)],
);

/** M2M: sessions span multiple groups (SPEC §7.3 multi-select). */
export const sessionGroups = pgTable(
  'session_groups',
  {
    sessionId: uuid('session_id').notNull(),
    groupId: uuid('group_id').notNull(),
  },
  (t) => [uniqueIndex('session_groups_pk').on(t.sessionId, t.groupId)],
);

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid('session_id').notNull(),
    userId: uuid('user_id').notNull(),
    status: varchar('status', { length: 12 }).notNull(), // present | absent | late | excused
    checkInAt: timestamp('check_in_at', { withTimezone: true }),
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    markedBy: uuid('marked_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex('attendance_pk').on(t.sessionId, t.userId), index('attendance_user_idx').on(t.userId)],
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    problemId: uuid('problem_id').notNull(),
    language: varchar('language', { length: 48 }).notNull(),
    code: text('code'),
    timeSpentMin: integer('time_spent_min').notNull().default(0),
    tries: integer('tries').notNull().default(1),
    source: varchar('source', { length: 16 }).notNull().default('manual'), // manual | extension
    contestProblemId: uuid('contest_problem_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('submissions_user_idx').on(t.userId), index('submissions_problem_idx').on(t.problemId), index('submissions_created_idx').on(t.createdAt)],
);

export const funds = pgTable(
  'funds',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    amount: real('amount').notNull(),
    currency: varchar('currency', { length: 12 }).notNull().default('ETB'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('funds_created_by_idx').on(t.createdBy)],
);

export const stipends = pgTable(
  'stipends',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    fundId: uuid('fund_id').notNull(),
    userId: uuid('user_id').notNull(),
    month: varchar('month', { length: 8 }).notNull(), // e.g. "2024-10"
    amount: real('amount').notNull(),
    mode: varchar('mode', { length: 16 }).notNull().default('manual'), // manual | attendance
    status: varchar('status', { length: 12 }).notNull().default('pending'), // pending | paid
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex('stipends_pk').on(t.fundId, t.userId, t.month)],
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 254 }), // generated org login email (mass) | null (take-over)
    firstName: varchar('first_name', { length: 80 }),
    lastName: varchar('last_name', { length: 80 }),
    personalEmail: varchar('personal_email', { length: 254 }),
    role: varchar('role', { length: 32 }).notNull(),
    groupId: uuid('group_id'),
    mass: boolean('mass').notNull().default(true),
    takeOverUserId: uuid('take_over_user_id'), // users.id for take-over invites
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('invitations_email_idx').on(t.email), index('invitations_token_idx').on(t.tokenHash)],
);

/** Audit log — Recent Actions (SPEC §8.8). Every admin write appends one row. */
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    actorId: uuid('actor_id').notNull(),
    actorName: varchar('actor_name', { length: 120 }).notNull(),
    actorRole: varchar('actor_role', { length: 32 }).notNull(),
    action: varchar('action', { length: 12 }).notNull(), // CREATE | UPDATE | DELETE
    entityType: varchar('entity_type', { length: 32 }).notNull(), // session | problem | contest | track | group | ...
    entityId: uuid('entity_id'),
    description: text('description').notNull(), // human sentence, e.g. "created an event called '...'"
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('activity_logs_created_idx').on(t.createdAt), index('activity_logs_actor_idx').on(t.actorId)],
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    body: text('body').notNull(),
    votesUp: integer('votes_up').notNull().default(0),
    votesDown: integer('votes_down').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('posts_created_idx').on(t.createdAt)],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    postId: uuid('post_id').notNull(),
    userId: uuid('user_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('comments_post_idx').on(t.postId)],
);

export const postVotes = pgTable(
  'post_votes',
  {
    postId: uuid('post_id').notNull(),
    userId: uuid('user_id').notNull(),
    value: integer('value').notNull(), // 1 | -1
  },
  (t) => [uniqueIndex('post_votes_pk').on(t.postId, t.userId)],
);

/** Competitive tier config (SPEC §7.10 Divisions) — computed from ratings. */
export const divisions = pgTable(
  'divisions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 32 }).notNull(), // "Div 1", "Div 2", ...
    minRating: real('min_rating').notNull(),
    maxRating: real('max_rating').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('divisions_name_idx').on(t.name)],
);

// ---------------------------------------------------------------------------
// Relations — used by the repository layer for joins.
// ---------------------------------------------------------------------------

export const usersRelations = relations(
  users,
  ({ one, many }) => ({
    group: one(groups, { fields: [users.groupId], references: [groups.id] }),
    submissions: many(submissions),
  }),
);

export const groupsRelations = relations(
  groups,
  ({ one, many }) => ({
    superGroup: one(superGroups, { fields: [groups.superGroupId], references: [superGroups.id] }),
    heads: many(groupHeads),
  }),
);

export const sessionsRelations = relations(
  sessions,
  ({ many }) => ({
    sessionGroups: many(sessionGroups),
  }),
);
export const roadmaps = pgTable('roadmaps', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const roadmapSections = pgTable('roadmap_sections', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  roadmapId: uuid('roadmap_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('roadmap_sections_roadmap_idx').on(t.roadmapId)]);

export const roadmapItems = pgTable('roadmap_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sectionId: uuid('section_id').notNull(),
  type: varchar('type', { length: 32 }).notNull(), // video | reading | problem
  title: varchar('title', { length: 500 }).notNull(),
  link: varchar('link', { length: 2000 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('roadmap_items_section_idx').on(t.sectionId)]);

export const roadmapProgress = pgTable('roadmap_progress', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  itemId: uuid('item_id').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => [uniqueIndex('roadmap_progress_user_item_idx').on(t.userId, t.itemId)]);
