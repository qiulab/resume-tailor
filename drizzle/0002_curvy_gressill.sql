ALTER TABLE `analyses` ADD `sessionToken` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `analyses` ADD `atsDisclaimer` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `benchmarkSkills` json;--> statement-breakpoint
ALTER TABLE `analyses` ADD `benchmarkSource` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `projectIdeas` json;--> statement-breakpoint
ALTER TABLE `analyses` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `analyses` DROP COLUMN `sessionId`;