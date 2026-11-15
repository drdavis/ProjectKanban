ALTER TABLE "mcp_tokens" ADD COLUMN IF NOT EXISTS "can_plan" boolean DEFAULT false NOT NULL;
