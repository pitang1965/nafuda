CREATE TABLE "pending_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_token" text NOT NULL,
	"issuer_persona_id" uuid NOT NULL,
	"event_id" uuid,
	"event_name" text,
	"venue_name" text,
	"event_date" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_invites_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_issuer_persona_id_personas_id_fk" FOREIGN KEY ("issuer_persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;