ALTER TABLE "projects" ADD COLUMN "estimate_complexity" varchar(20);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "estimate_amount" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "estimate_reasoning" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "estimate_generated_at" timestamp;