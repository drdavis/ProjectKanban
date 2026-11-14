ALTER TABLE "cards" ADD COLUMN "responsible" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "roadmap_assignment" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "releases" jsonb DEFAULT '[]'::jsonb NOT NULL;