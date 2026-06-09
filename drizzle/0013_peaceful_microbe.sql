ALTER TABLE "events" ALTER COLUMN "venue_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "private_memo" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_instant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "gps_coordinates" "point";