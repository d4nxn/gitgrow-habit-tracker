CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_checkins_user_habit_date` ON `checkins` (`user_id`,`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_checkins_user_date` ON `checkins` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_habits_user` ON `habits` (`user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`age` text DEFAULT '' NOT NULL,
	`weight` text DEFAULT '' NOT NULL,
	`height` text DEFAULT '' NOT NULL,
	`goal` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text,
	`content_type` text,
	`size` integer,
	`latitude` text,
	`longitude` text,
	`accuracy` text,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_proofs_user_created` ON `proofs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `quest_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quest_id` text NOT NULL,
	`kind` text NOT NULL,
	`local_date` text NOT NULL,
	`status` text DEFAULT 'offered' NOT NULL,
	`accepted_at` text,
	`deadline_at` text,
	`completed_at` text,
	`proof_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_quest_assignment` ON `quest_assignments` (`user_id`,`quest_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `idx_quests_user_status` ON `quest_assignments` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`preferences` text DEFAULT '[]' NOT NULL,
	`xp_balance` integer DEFAULT 0 NOT NULL,
	`lifetime_xp` integer DEFAULT 0 NOT NULL,
	`import_completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xp_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_xp_awards_source` ON `xp_awards` (`user_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_xp_events_user_created` ON `xp_events` (`user_id`,`created_at`);