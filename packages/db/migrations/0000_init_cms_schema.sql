CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_token_hash_unique` ON `api_keys` (`token_hash`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer,
	`purpose` text,
	`owner_type` text,
	`owner_slug` text,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_r2_key_unique` ON `media` (`r2_key`);--> statement-breakpoint
CREATE INDEX `idx_media_owner` ON `media` (`owner_type`,`owner_slug`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`date` text NOT NULL,
	`tag` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`meta_description` text NOT NULL,
	`meta_keywords` text,
	`og_image_key` text,
	`body_html` text NOT NULL,
	`related_seminar_slug` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "news_status_check" CHECK("news"."status" IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_slug_unique` ON `news` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_news_status_date` ON `news` (`status`,`date`);--> statement-breakpoint
CREATE TABLE `seminars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`detail_page` integer DEFAULT 1 NOT NULL,
	`event_date` text NOT NULL,
	`event_date_display` text,
	`seminar_type` text NOT NULL,
	`title` text NOT NULL,
	`catch_line` text,
	`hero_sub` text,
	`description` text NOT NULL,
	`price_display` text,
	`price_note` text,
	`capacity` integer,
	`seats_left` integer,
	`hero_image_key` text,
	`card_image_key` text,
	`venue_summary` text,
	`sections_json` text NOT NULL,
	`google_form_url` text,
	`google_form_fields_json` text,
	`gas_configured` integer DEFAULT 0 NOT NULL,
	`meta_description` text NOT NULL,
	`meta_keywords` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "seminars_status_check" CHECK("seminars"."status" IN ('draft', 'before_registration', 'open', 'closed')),
	CONSTRAINT "seminars_detail_page_check" CHECK("seminars"."detail_page" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seminars_slug_unique` ON `seminars` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_seminars_event_date` ON `seminars` (`event_date`);--> statement-breakpoint
CREATE INDEX `idx_seminars_status` ON `seminars` (`status`);