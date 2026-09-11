CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" varchar(120) NOT NULL,
	"actor_role" varchar(32) NOT NULL,
	"action" varchar(12) NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" uuid,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(12) NOT NULL,
	"check_in_at" timestamp with time zone,
	"check_out_at" timestamp with time zone,
	"marked_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contest_groups" (
	"contest_id" uuid NOT NULL,
	"group_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contest_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contest_id" uuid NOT NULL,
	"pseudo" varchar(4) NOT NULL,
	"problem_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"number" integer,
	"type" varchar(16) DEFAULT 'standard' NOT NULL,
	"unrated" boolean DEFAULT false NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"standings_link" varchar(500),
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_group_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"date" date NOT NULL,
	"queue_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(32) NOT NULL,
	"min_rating" real NOT NULL,
	"max_rating" real NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"amount" real NOT NULL,
	"currency" varchar(12) DEFAULT 'ETB' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_heads" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"short_name" varchar(16) NOT NULL,
	"description" text,
	"country" varchar(80),
	"super_group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254),
	"role" varchar(32) NOT NULL,
	"group_id" uuid,
	"mass" boolean DEFAULT true NOT NULL,
	"take_over_user_id" uuid,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"votes_up" integer DEFAULT 0 NOT NULL,
	"votes_down" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"difficulty" varchar(8) NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"link" varchar(500) NOT NULL,
	"added_by" uuid NOT NULL,
	"votes_up" integer DEFAULT 0 NOT NULL,
	"votes_down" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_groups" (
	"session_id" uuid NOT NULL,
	"group_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"start_time" varchar(16),
	"end_time" varchar(16),
	"location" varchar(200),
	"resource_link" varchar(500),
	"recording_link" varchar(500),
	"lecturer" varchar(160),
	"fund_id" uuid,
	"calendar_invite" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stipends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"month" varchar(8) NOT NULL,
	"amount" real NOT NULL,
	"mode" varchar(16) DEFAULT 'manual' NOT NULL,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"language" varchar(48) NOT NULL,
	"code" text,
	"time_spent_min" integer DEFAULT 0 NOT NULL,
	"tries" integer DEFAULT 1 NOT NULL,
	"source" varchar(16) DEFAULT 'manual' NOT NULL,
	"contest_problem_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "super_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_group_id" uuid NOT NULL,
	"phase" varchar(24) NOT NULL,
	"name" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" varchar(100) NOT NULL,
	"role" varchar(32) DEFAULT 'student' NOT NULL,
	"avatar_url" varchar(500),
	"country" varchar(80),
	"university" varchar(160),
	"department" varchar(160),
	"instagram" varchar(120),
	"linkedin" varchar(320),
	"student_id" varchar(64),
	"bio" text,
	"rating" real DEFAULT 1200 NOT NULL,
	"group_id" uuid,
	"invited_by_id" uuid,
	"is_removed" boolean DEFAULT false NOT NULL,
	"removed_at" timestamp with time zone,
	"taken_over_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_pk" ON "attendance_records" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "attendance_user_idx" ON "attendance_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contest_groups_pk" ON "contest_groups" USING btree ("contest_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contest_problems_pk" ON "contest_problems" USING btree ("contest_id","pseudo");--> statement-breakpoint
CREATE INDEX "contests_date_idx" ON "contests" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_problems_sg_date_idx" ON "daily_problems" USING btree ("super_group_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_name_idx" ON "divisions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "funds_created_by_idx" ON "funds" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "group_heads_pk" ON "group_heads" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_short_name_idx" ON "groups" USING btree ("short_name");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "post_votes_pk" ON "post_votes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "problems_platform_idx" ON "problems" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "problems_difficulty_idx" ON "problems" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "problems_added_by_idx" ON "problems" USING btree ("added_by");--> statement-breakpoint
CREATE UNIQUE INDEX "session_groups_pk" ON "session_groups" USING btree ("session_id","group_id");--> statement-breakpoint
CREATE INDEX "sessions_date_idx" ON "sessions" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "stipends_pk" ON "stipends" USING btree ("fund_id","user_id","month");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_problem_idx" ON "submissions" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "super_groups_name_idx" ON "super_groups" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "track_problems_pk" ON "track_problems" USING btree ("track_id","problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_sg_phase_idx" ON "tracks" USING btree ("super_group_id","phase");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");