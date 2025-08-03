ALTER TABLE "users" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pipeline_preference" varchar(20) DEFAULT 'claude-code' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_customer_id";