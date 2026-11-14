CREATE TABLE "product_members" (
	"product_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "product_members_product_id_user_id_pk" PRIMARY KEY("product_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "product_members_user" ON "product_members" USING btree ("user_id");