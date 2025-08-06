CREATE TABLE "project_environment_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"is_secret" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_env_vars_unique_key" UNIQUE("project_id","key")
);
--> statement-breakpoint
CREATE TABLE "project_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"integration_type" text NOT NULL,
	"integration_name" text NOT NULL,
	"config" text DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_integrations_unique_key" UNIQUE("project_id","integration_type","integration_name")
);
--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ALTER COLUMN "status" SET DEFAULT 'running';--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD COLUMN "trigger_type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD COLUMN "changes" jsonb;--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD COLUMN "started_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "github_sync_sessions" ADD COLUMN "logs" text;--> statement-breakpoint
ALTER TABLE "project_environment_variables" ADD CONSTRAINT "project_environment_variables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_sessions" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "github_sync_sessions" DROP COLUMN "start_time";--> statement-breakpoint
ALTER TABLE "github_sync_sessions" DROP COLUMN "end_time";--> statement-breakpoint
ALTER TABLE "github_sync_sessions" DROP COLUMN "commit_sha";--> statement-breakpoint
ALTER TABLE "github_sync_sessions" DROP COLUMN "files_changed";