CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"display_currency" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
