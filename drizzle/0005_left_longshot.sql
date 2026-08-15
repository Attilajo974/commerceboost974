CREATE TABLE `account_deletion_markers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_deletion_markers_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_deletion_markers_openId_unique` UNIQUE(`openId`)
);
