CREATE TABLE "connection_qr_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"from_persona_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connection_qr_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "connection_qr_tokens" ADD CONSTRAINT "connection_qr_tokens_from_persona_id_personas_id_fk" FOREIGN KEY ("from_persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;