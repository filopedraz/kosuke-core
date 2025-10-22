ALTER TABLE "chat_sessions" ADD COLUMN "is_requirements_session" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" varchar(20) DEFAULT 'requirements' NOT NULL;