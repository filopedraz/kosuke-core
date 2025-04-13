ALTER TABLE "chat_messages" ADD COLUMN "tokens_input" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "tokens_output" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "context_tokens" integer;