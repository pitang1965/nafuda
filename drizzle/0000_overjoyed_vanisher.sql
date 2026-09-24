CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `connection_qr_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`from_persona_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connection_qr_tokens_token_unique` ON `connection_qr_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`from_persona_id` text NOT NULL,
	`to_persona_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`event_id` text,
	`event_name` text,
	`venue_name` text,
	`event_date` integer,
	`private_memo` text,
	`connected_at` integer NOT NULL,
	FOREIGN KEY (`from_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_from_persona_id_to_persona_id_unique` ON `connections` (`from_persona_id`,`to_persona_id`);--> statement-breakpoint
CREATE TABLE `event_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`persona_id` text NOT NULL,
	`user_id` text NOT NULL,
	`gps_coordinates` text,
	`checked_in_at` integer NOT NULL,
	`checked_out_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`share_token` text NOT NULL,
	`name` text NOT NULL,
	`venue_name` text,
	`event_date` integer NOT NULL,
	`event_end_date` integer,
	`show_time` integer DEFAULT false NOT NULL,
	`description` text,
	`is_instant` integer DEFAULT false NOT NULL,
	`gps_coordinates` text,
	`host_user_id` text,
	`host_persona_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_share_token_unique` ON `events` (`share_token`);--> statement-breakpoint
CREATE TABLE `favorite_personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_persona_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_personas_user_id_target_persona_id_unique` ON `favorite_personas` (`user_id`,`target_persona_id`);--> statement-breakpoint
CREATE TABLE `gallery_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`image_url` text NOT NULL,
	`caption` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `nafuda_links` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`target_persona_id` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nafuda_links_persona_id_target_persona_id_unique` ON `nafuda_links` (`persona_id`,`target_persona_id`);--> statement-breakpoint
CREATE TABLE `pending_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_token` text NOT NULL,
	`issuer_persona_id` text NOT NULL,
	`event_id` text,
	`event_name` text,
	`venue_name` text,
	`event_date` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`issuer_persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_invites_invite_token_unique` ON `pending_invites` (`invite_token`);--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`share_token` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`avatar_url` text,
	`bio` text,
	`label` text,
	`purpose` text,
	`oshi_tags` text DEFAULT '[]' NOT NULL,
	`dojin_reject` integer DEFAULT false NOT NULL,
	`field_visibility` text DEFAULT '{}' NOT NULL,
	`style_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personas_share_token_unique` ON `personas` (`share_token`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `sns_links` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `url_ids` (
	`url_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `url_ids_user_id_unique` ON `url_ids` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
