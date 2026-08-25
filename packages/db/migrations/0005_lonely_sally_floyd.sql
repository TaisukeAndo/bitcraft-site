CREATE TABLE `contact_email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`from_name` text NOT NULL,
	`from_email` text NOT NULL,
	`subject` text NOT NULL,
	`body_text` text NOT NULL,
	`body_html` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "contact_email_templates_key_check" CHECK("contact_email_templates"."key" IN ('notification', 'confirmation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_email_templates_key_unique` ON `contact_email_templates` (`key`);