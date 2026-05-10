ALTER TABLE `analyses` ADD `atsStrengths` json;--> statement-breakpoint
ALTER TABLE `analyses` ADD `atsWeaknesses` json;--> statement-breakpoint
ALTER TABLE `analyses` ADD `linkedinData` json;--> statement-breakpoint
ALTER TABLE `analyses` ADD `linkedinEnriched` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `analyses` ADD `jobRecommendations` json;--> statement-breakpoint
ALTER TABLE `analyses` ADD `generatedResume` text;