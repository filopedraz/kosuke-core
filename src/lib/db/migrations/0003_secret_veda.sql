ALTER TABLE "chat_sessions" DROP CONSTRAINT "chat_sessions_session_id_unique";--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_last_activity_at" ON "chat_sessions" USING btree ("last_activity_at");--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_project_session_unique" UNIQUE("project_id","session_id");