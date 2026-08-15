ALTER TABLE `ai_generations` ADD CONSTRAINT `ai_generations_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ai_generations` ADD CONSTRAINT `ai_generations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `business_settings` ADD CONSTRAINT `business_settings_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `promotion_products` ADD CONSTRAINT `promotion_products_promotionId_promotions_id_fk` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `promotion_products` ADD CONSTRAINT `promotion_products_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_subscription_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `ai_generations_business_created_idx` ON `ai_generations` (`businessId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `audit_logs_business_created_idx` ON `audit_logs` (`businessId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_idx` ON `audit_logs` (`actorUserId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `automation_rules_business_enabled_idx` ON `automation_rules` (`businessId`,`isEnabled`);
--> statement-breakpoint
CREATE INDEX `automation_rules_task_uid_idx` ON `automation_rules` (`scheduleCronTaskUid`);
--> statement-breakpoint
CREATE INDEX `businesses_status_idx` ON `businesses` (`status`);
--> statement-breakpoint
CREATE INDEX `categories_business_active_idx` ON `categories` (`businessId`,`isActive`);
--> statement-breakpoint
CREATE INDEX `customers_business_created_idx` ON `customers` (`businessId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`userId`);
--> statement-breakpoint
CREATE INDEX `memberships_business_status_idx` ON `memberships` (`businessId`,`status`);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`orderId`);
--> statement-breakpoint
CREATE INDEX `order_history_order_idx` ON `order_status_history` (`orderId`);
--> statement-breakpoint
CREATE INDEX `orders_business_status_idx` ON `orders` (`businessId`,`status`);
--> statement-breakpoint
CREATE INDEX `orders_business_created_idx` ON `orders` (`businessId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customerId`);
--> statement-breakpoint
CREATE INDEX `products_business_status_idx` ON `products` (`businessId`,`status`);
--> statement-breakpoint
CREATE INDEX `products_business_category_idx` ON `products` (`businessId`,`categoryId`);
--> statement-breakpoint
CREATE INDEX `promotions_business_active_idx` ON `promotions` (`businessId`,`isActive`);
--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);
