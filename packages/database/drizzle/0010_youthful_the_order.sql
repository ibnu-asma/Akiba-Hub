CREATE INDEX IF NOT EXISTS "contest_groups_group_idx" ON "contest_groups" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contest_problems_problem_idx" ON "contest_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_heads_user_idx" ON "group_heads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groups_super_group_idx" ON "groups" USING btree ("super_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_contest_problem_idx" ON "submissions" USING btree ("contest_problem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "track_problems_problem_idx" ON "track_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_group_id_idx" ON "users" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX IF NOT EXISTS "track_problems_problem_idx" ON "track_problems" USING btree ("problem_id");