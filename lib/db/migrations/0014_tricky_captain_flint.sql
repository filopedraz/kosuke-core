ALTER TABLE "chat_sessions" ADD COLUMN "branch_merged_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "branch_merged_by" varchar(100);--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "merge_commit_sha" varchar(40);--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "pull_request_number" integer;