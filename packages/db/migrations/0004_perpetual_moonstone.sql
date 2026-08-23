CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`affiliation` text NOT NULL,
	`inquiry_type` text NOT NULL,
	`message` text NOT NULL,
	`privacy_consent` integer NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`notification_email_status` text,
	`notification_email_error` text,
	`confirmation_email_status` text,
	`confirmation_email_error` text,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "contacts_status_check" CHECK("contacts"."status" IN ('received', 'replied', 'closed'))
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_submitted` ON `contacts` (`submitted_at`);