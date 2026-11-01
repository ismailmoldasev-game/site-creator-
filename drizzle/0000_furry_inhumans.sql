CREATE TABLE `studio_credentials` (
	`provider` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`created_at` text NOT NULL,
	`commit` text,
	`url` text,
	`kind` text DEFAULT 'snapshot' NOT NULL
);
