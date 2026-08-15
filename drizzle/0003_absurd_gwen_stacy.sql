CREATE TABLE `rate_limit_buckets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectHash` varchar(64) NOT NULL,
	`action` varchar(80) NOT NULL,
	`bucketStartedAt` timestamp NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_buckets_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_buckets_subject_action_bucket_uniq` UNIQUE(`subjectHash`,`action`,`bucketStartedAt`)
);
--> statement-breakpoint
CREATE INDEX `rate_limit_buckets_expiry_idx` ON `rate_limit_buckets` (`expiresAt`);