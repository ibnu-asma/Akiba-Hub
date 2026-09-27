UPDATE "sessions"
SET 
  "start_at" = ("date"::text || ' ' || COALESCE("start_time", '00:00'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa',
  "end_at" = ("date"::text || ' ' || COALESCE("end_time", '23:59'))::timestamp AT TIME ZONE 'Africa/Addis_Ababa'
WHERE "start_time" IS NOT NULL OR "end_time" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "start_time";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "end_time";