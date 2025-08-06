-- Create project environment variables table
CREATE TABLE IF NOT EXISTS "project_environment_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"is_secret" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_environment_variables_project_id_key_unique" UNIQUE("project_id","key")
);

-- Create project integrations table
CREATE TABLE IF NOT EXISTS "project_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"integration_type" text NOT NULL,
	"integration_name" text NOT NULL,
	"config" text DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_integrations_project_id_integration_type_integration_name_unique" UNIQUE("project_id","integration_type","integration_name")
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "project_environment_variables" ADD CONSTRAINT "project_environment_variables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_project_env_vars_project_id" ON "project_environment_variables" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_integrations_project_id" ON "project_integrations" USING btree ("project_id");