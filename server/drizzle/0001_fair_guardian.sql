CREATE TABLE `admin_sessions` (
	`id` varchar(128) NOT NULL,
	`admin_id` int NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`last_active_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`full_name` varchar(150),
	`role` enum('superadmin','editor','translator') DEFAULT 'editor',
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`subject` varchar(200),
	`message` text NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`status` enum('new','read','replied','archived','spam') DEFAULT 'new',
	`created_at` timestamp DEFAULT (now()),
	`read_at` timestamp,
	`replied_at` timestamp,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `content_translations` MODIFY COLUMN `body_searchable` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `content_translations` ADD `pdf_file_path` varchar(255);--> statement-breakpoint
ALTER TABLE `content_translations` ADD `pdf_generated_at` timestamp;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_admins_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_session_admin` ON `admin_sessions` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_contact_status_created` ON `contact_messages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contact_email` ON `contact_messages` (`email`);--> statement-breakpoint
ALTER TABLE `content` DROP COLUMN `pdf_file_path`;--> statement-breakpoint
ALTER TABLE `content` DROP COLUMN `pdf_generated_at`;