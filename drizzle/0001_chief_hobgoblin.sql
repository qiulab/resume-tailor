CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`linkedinUrl` text,
	`jobUrl` text,
	`jobTitle` text,
	`companyName` text,
	`jobDescription` text,
	`resumeFileKey` text,
	`resumeFileName` text,
	`resumeText` text,
	`atsScore` float,
	`atsBreakdown` json,
	`missingKeywords` json,
	`matchedKeywords` json,
	`skillGaps` json,
	`rewrittenSummary` text,
	`originalSummary` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coverLetters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`content` text NOT NULL,
	`tone` enum('professional','enthusiastic','concise') NOT NULL DEFAULT 'professional',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coverLetters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`section` varchar(128) NOT NULL,
	`originalText` text NOT NULL,
	`suggestedText` text NOT NULL,
	`reason` text,
	`impact` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suggestions_id` PRIMARY KEY(`id`)
);
