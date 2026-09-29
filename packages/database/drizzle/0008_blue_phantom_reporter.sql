CREATE INDEX "session_groups_group_id_idx" ON "session_groups" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "users_group_id_idx" ON "users" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");