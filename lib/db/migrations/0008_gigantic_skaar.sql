CREATE TABLE "github_sync_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"commit_sha" text,
	"files_changed" integer DEFAULT 0,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "project_commits" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"commit_sha" text NOT NULL,
	"commit_message" text NOT NULL,
	"commit_url" text,
	"files_changed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_github_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"github_token" text NOT NULL,
	"github_username" text,
	"token_scope" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "blocks" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_repo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_owner" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_repo_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_branch" text DEFAULT 'main';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "auto_commit" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_github_sync" timestamp;--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD CONSTRAINT "github_sync_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_commits" ADD CONSTRAINT "project_commits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_github_tokens" ADD CONSTRAINT "user_github_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;