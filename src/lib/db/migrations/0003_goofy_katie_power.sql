CREATE TYPE "public"."cli_log_command" AS ENUM('ship', 'test', 'review', 'getcode', 'tickets');--> statement-breakpoint
CREATE TYPE "public"."cli_log_status" AS ENUM('success', 'error', 'cancelled');--> statement-breakpoint
CREATE TABLE "cli_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" text,
	"user_id" text,
	"command" "cli_log_command" NOT NULL,
	"command_args" jsonb,
	"status" "cli_log_status" NOT NULL,
	"error_message" text,
	"tokens_input" integer NOT NULL,
	"tokens_output" integer NOT NULL,
	"tokens_cache_creation" integer DEFAULT 0,
	"tokens_cache_read" integer DEFAULT 0,
	"cost" varchar(20) NOT NULL,
	"execution_time_ms" integer NOT NULL,
	"inference_time_ms" integer,
	"fixes_applied" integer,
	"tests_run" integer,
	"tests_passed" integer,
	"tests_failed" integer,
	"iterations" integer,
	"files_modified" jsonb,
	"cli_version" varchar(50),
	"metadata" jsonb,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cli_logs" ADD CONSTRAINT "cli_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;