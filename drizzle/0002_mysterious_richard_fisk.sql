CREATE INDEX `connections_to_persona_id_idx` ON `connections` (`to_persona_id`);--> statement-breakpoint
CREATE INDEX `event_checkins_event_id_idx` ON `event_checkins` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_checkins_persona_id_idx` ON `event_checkins` (`persona_id`);--> statement-breakpoint
CREATE INDEX `event_checkins_user_id_idx` ON `event_checkins` (`user_id`);--> statement-breakpoint
CREATE INDEX `gallery_photos_persona_id_idx` ON `gallery_photos` (`persona_id`);--> statement-breakpoint
CREATE INDEX `personas_user_id_idx` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `sns_links_persona_id_idx` ON `sns_links` (`persona_id`);