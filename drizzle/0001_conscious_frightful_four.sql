CREATE TABLE `studio_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_accounts_project_id_unique` ON `studio_accounts` (`project_id`);--> statement-breakpoint
ALTER TABLE `studio_versions` ADD `project_id` text DEFAULT 'main' NOT NULL;--> statement-breakpoint
CREATE INDEX `studio_versions_project_created` ON `studio_versions` (`project_id`,`created_at`);