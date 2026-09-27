DROP INDEX "sessions_date_idx";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "start_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "end_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sessions_start_at_idx" ON "sessions" USING btree ("start_at");