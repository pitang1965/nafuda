ALTER TABLE "connections" DROP CONSTRAINT "connections_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "event_checkins" DROP CONSTRAINT "event_checkins_event_id_events_id_fk";
--> statement-breakpoint
DELETE FROM "event_checkins";--> statement-breakpoint
DELETE FROM "events";--> statement-breakpoint
UPDATE "connections" SET "event_id" = NULL, "event_name" = NULL, "venue_name" = NULL, "event_date" = NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "share_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "show_time" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_share_token_unique" UNIQUE("share_token");
