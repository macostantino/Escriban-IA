CREATE TABLE `dossiers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dossiers_owner` ON `dossiers` (`owner`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`group_id` text NOT NULL,
	`created` text NOT NULL,
	`data` text NOT NULL,
	`pdf_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_owner_group` ON `reports` (`owner`,`group_id`);