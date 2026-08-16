CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name_en` varchar(150) NOT NULL,
	`name_am` varchar(150),
	`name_om` varchar(150),
	`name_ti` varchar(150),
	`description` text,
	`sort_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int NOT NULL,
	`author_name` varchar(150),
	`cover_image` varchar(255),
	`status` enum('draft','published','archived') DEFAULT 'draft',
	`pdf_enabled` tinyint DEFAULT 0,
	`pdf_file_path` varchar(255),
	`pdf_generated_at` timestamp,
	`view_count` int DEFAULT 0,
	`published_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int NOT NULL,
	`media_kind` enum('video','audio') NOT NULL,
	`platform` varchar(50) NOT NULL,
	`embed_id` varchar(255) NOT NULL,
	`caption` varchar(255),
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `content_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_tags` (
	`content_id` int NOT NULL,
	`tag_id` int NOT NULL,
	CONSTRAINT `content_tags_content_id_tag_id_pk` PRIMARY KEY(`content_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `content_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int NOT NULL,
	`lang_code` varchar(5) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`summary` text,
	`body` mediumtext NOT NULL,
	`body_searchable` text NOT NULL,
	CONSTRAINT `content_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_content_lang` UNIQUE(`content_id`,`lang_code`),
	CONSTRAINT `uniq_slug_lang` UNIQUE(`slug`,`lang_code`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `content` ADD CONSTRAINT `content_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_media` ADD CONSTRAINT `content_media_content_id_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_tags` ADD CONSTRAINT `content_tags_content_id_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_tags` ADD CONSTRAINT `content_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_translations` ADD CONSTRAINT `content_translations_content_id_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_category` ON `content` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_status_published` ON `content` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_content` ON `content_media` (`content_id`);--> statement-breakpoint
CREATE INDEX `idx_search_title` ON `content_translations` (`title`);