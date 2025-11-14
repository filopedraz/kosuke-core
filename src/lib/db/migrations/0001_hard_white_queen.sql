CREATE TYPE "public"."project_status" AS ENUM('requirements', 'in_development', 'active');--> statement-breakpoint
CREATE TABLE "project_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "requirements_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "requirements_completed_by" text;--> statement-breakpoint
ALTER TABLE "project_audit_logs" ADD CONSTRAINT "project_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;