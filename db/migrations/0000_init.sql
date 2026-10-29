CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text,
	`title` text NOT NULL,
	`kind` text DEFAULT 'normal' NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`charge_to_pct` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start`);--> statement-breakpoint
CREATE INDEX `events_place_idx` ON `events` (`place_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`neighborhood` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`default_duration_min` integer,
	`hours_text` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `travel_legs` (
	`from_place_id` text NOT NULL,
	`to_place_id` text NOT NULL,
	`minutes` integer NOT NULL,
	`miles` real NOT NULL,
	`source` text NOT NULL,
	`computed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`from_place_id`, `to_place_id`)
);
