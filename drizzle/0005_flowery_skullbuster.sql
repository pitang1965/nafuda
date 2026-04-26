CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_persona_id" uuid NOT NULL,
	"to_persona_id" uuid NOT NULL,
	"from_user_id" text NOT NULL,
	"event_id" uuid,
	"event_name" text,
	"venue_name" text,
	"event_date" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connections_from_persona_id_to_persona_id_unique" UNIQUE("from_persona_id","to_persona_id")
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_from_persona_id_personas_id_fk" FOREIGN KEY ("from_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_to_persona_id_personas_id_fk" FOREIGN KEY ("to_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;