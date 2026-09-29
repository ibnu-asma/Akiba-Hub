DROP INDEX "groups_short_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "groups_short_name_idx" ON "groups" USING btree ("short_name") WHERE "groups"."deleted_at" is null;