DROP INDEX "tracks_sg_phase_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "avatar_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contests" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "first_name" varchar(80);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "last_name" varchar(80);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "personal_email" varchar(254);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github" varchar(120);--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_sg_phase_idx" ON "tracks" USING btree ("super_group_id","phase") WHERE "tracks"."deleted_at" is null;