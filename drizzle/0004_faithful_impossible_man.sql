CREATE TABLE `stripe_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`businessId` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `stripe_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_webhook_events_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `trialEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelAtPeriodEnd` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePriceId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`);--> statement-breakpoint
ALTER TABLE `stripe_webhook_events` ADD CONSTRAINT `stripe_webhook_events_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stripe_webhook_events_business_received_idx` ON `stripe_webhook_events` (`businessId`,`receivedAt`);