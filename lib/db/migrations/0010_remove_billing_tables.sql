-- Remove billing-related tables and fields
-- Drop subscription tables
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "subscription_products";

-- Remove stripe_customer_id from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";

-- Remove token-related columns from chat_messages if they exist
ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "tokens_input";
ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "tokens_output";
ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "context_tokens";