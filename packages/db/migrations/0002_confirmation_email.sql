ALTER TABLE `seminars` ADD `confirmation_email_json` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `confirmation_email_status` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `confirmation_email_error` text;