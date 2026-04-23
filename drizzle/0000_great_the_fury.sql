CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"share_token" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"oshi_tags" text[] DEFAULT '{}' NOT NULL,
	"dojin_reject" boolean DEFAULT false NOT NULL,
	"field_visibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "personas_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "sns_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_ids" (
	"url_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "url_ids_user_id_unique" UNIQUE("user_id")
);
