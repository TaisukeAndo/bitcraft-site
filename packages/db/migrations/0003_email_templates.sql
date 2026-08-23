CREATE TABLE `application_email_sends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`email_template_id` integer NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`email_template_id`) REFERENCES `email_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_email_sends_unique` ON `application_email_sends` (`application_id`,`email_template_id`);--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seminar_id` integer NOT NULL,
	`seminar_slug` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`trigger_type` text NOT NULL,
	`trigger_offset_days` integer,
	`trigger_time_jst` text,
	`trigger_at` text,
	`from_name` text NOT NULL,
	`from_email` text NOT NULL,
	`subject` text NOT NULL,
	`body_text` text NOT NULL,
	`body_html` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`seminar_id`) REFERENCES `seminars`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "email_templates_trigger_type_check" CHECK("email_templates"."trigger_type" IN ('on_submit', 'relative_to_event', 'absolute'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_templates_seminar_key_unique` ON `email_templates` (`seminar_id`,`key`);--> statement-breakpoint
CREATE INDEX `idx_email_templates_seminar` ON `email_templates` (`seminar_slug`);