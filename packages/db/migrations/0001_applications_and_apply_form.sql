ALTER TABLE `seminars` DROP COLUMN `google_form_url`;
--> statement-breakpoint
ALTER TABLE `seminars` DROP COLUMN `google_form_fields_json`;
--> statement-breakpoint
ALTER TABLE `seminars` DROP COLUMN `gas_configured`;
--> statement-breakpoint
ALTER TABLE `seminars` ADD `apply_form_json` text;
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seminar_id` integer NOT NULL,
	`seminar_slug` text NOT NULL,
	`answers_json` text NOT NULL,
	`applicant_name` text,
	`applicant_email` text,
	`status` text DEFAULT 'received' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`seminar_id`) REFERENCES `seminars`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "applications_status_check" CHECK("applications"."status" IN ('received', 'confirmed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `idx_applications_seminar_submitted` ON `applications` (`seminar_slug`,`submitted_at`);
