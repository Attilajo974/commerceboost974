import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Global platform identities. Business-scoped permissions live in memberships,
 * never on the client or in a business-owned session claim.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Minimal marker preventing OAuth from silently recreating an account erased at the user's request. */
export const accountDeletionMarkers = mysqlTable("account_deletion_markers", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  deletedAt: timestamp("deletedAt").defaultNow().notNull(),
});

export const businesses = mysqlTable(
  "businesses",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    activityType: varchar("activityType", { length: 96 }),
    description: text("description"),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 32 }),
    address: text("address"),
    city: varchar("city", { length: 96 }).default("La Réunion"),
    postalCode: varchar("postalCode", { length: 16 }),
    businessHours: json("businessHours").$type<Record<string, string> | null>(),
    logoUrl: text("logoUrl"),
    accentColor: varchar("accentColor", { length: 12 }).default("#0F766E"),
    status: mysqlEnum("status", ["draft", "active", "suspended"]).default("draft").notNull(),
    onboardingStep: int("onboardingStep").default(1).notNull(),
    onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
    isPublished: boolean("isPublished").default(false).notNull(),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("businesses_status_idx").on(table.status)]
);

export const memberships = mysqlTable(
  "memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "manager", "staff"]).default("staff").notNull(),
    status: mysqlEnum("status", ["active", "invited", "disabled"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("memberships_business_user_uniq").on(table.businessId, table.userId),
    index("memberships_user_idx").on(table.userId),
    index("memberships_business_status_idx").on(table.businessId, table.status),
  ]
);

export const businessSettings = mysqlTable("business_settings", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  locale: varchar("locale", { length: 16 }).default("fr-FR").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Indian/Reunion").notNull(),
  orderNotificationEmail: varchar("orderNotificationEmail", { length: 320 }),
  legalNoticeUrl: text("legalNoticeUrl"),
  privacyUrl: text("privacyUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("categories_business_slug_uniq").on(table.businessId, table.slug),
    index("categories_business_active_idx").on(table.businessId, table.isActive),
  ]
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    shortDescription: varchar("shortDescription", { length: 320 }),
    sku: varchar("sku", { length: 80 }),
    priceCents: int("priceCents").notNull(),
    compareAtPriceCents: int("compareAtPriceCents"),
    imageUrl: text("imageUrl"),
    imageUrls: json("imageUrls").$type<string[] | null>(),
    status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
    isAvailable: boolean("isAvailable").default(true).notNull(),
    trackInventory: boolean("trackInventory").default(false).notNull(),
    stockQuantity: int("stockQuantity"),
    metadata: json("metadata").$type<Record<string, string | number | boolean> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("products_business_slug_uniq").on(table.businessId, table.slug),
    index("products_business_status_idx").on(table.businessId, table.status),
    index("products_business_category_idx").on(table.businessId, table.categoryId),
  ]
);

export const promotions = mysqlTable(
  "promotions",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 64 }),
    discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
    discountValue: int("discountValue").notNull(),
    minimumOrderCents: int("minimumOrderCents"),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    isActive: boolean("isActive").default(true).notNull(),
    appliesToAll: boolean("appliesToAll").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("promotions_business_code_uniq").on(table.businessId, table.code),
    index("promotions_business_active_idx").on(table.businessId, table.isActive),
  ]
);

export const promotionProducts = mysqlTable(
  "promotion_products",
  {
    id: int("id").autoincrement().primaryKey(),
    promotionId: int("promotionId")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  table => [uniqueIndex("promotion_products_uniq").on(table.promotionId, table.productId)]
);

export const customers = mysqlTable(
  "customers",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    firstName: varchar("firstName", { length: 100 }).notNull(),
    lastName: varchar("lastName", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    notes: text("notes"),
    orderCount: int("orderCount").default(0).notNull(),
    lifetimeValueCents: int("lifetimeValueCents").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("customers_business_email_uniq").on(table.businessId, table.email),
    index("customers_business_created_idx").on(table.businessId, table.createdAt),
  ]
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: int("customerId")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
    status: mysqlEnum("status", ["new", "confirmed", "preparing", "ready", "completed", "cancelled"])
      .default("new")
      .notNull(),
    subtotalCents: int("subtotalCents").notNull(),
    discountCents: int("discountCents").default(0).notNull(),
    totalCents: int("totalCents").notNull(),
    customerNote: text("customerNote"),
    source: mysqlEnum("source", ["public_shop", "dashboard"]).default("public_shop").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("orders_business_status_idx").on(table.businessId, table.status),
    index("orders_business_created_idx").on(table.businessId, table.createdAt),
    index("orders_customer_idx").on(table.customerId),
  ]
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("productId").references(() => products.id, { onDelete: "set null" }),
    productName: varchar("productName", { length: 180 }).notNull(),
    unitPriceCents: int("unitPriceCents").notNull(),
    quantity: int("quantity").notNull(),
    lineTotalCents: int("lineTotalCents").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("order_items_order_idx").on(table.orderId)]
);

export const orderStatusHistory = mysqlTable(
  "order_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: varchar("fromStatus", { length: 24 }),
    toStatus: varchar("toStatus", { length: 24 }).notNull(),
    changedByUserId: int("changedByUserId").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("order_history_order_idx").on(table.orderId)]
);

export const aiGenerations = mysqlTable(
  "ai_generations",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    feature: mysqlEnum("feature", ["product_copy", "promotion_copy", "business_insight", "natural_language_query"])
      .notNull(),
    model: varchar("model", { length: 100 }),
    inputSummary: text("inputSummary"),
    output: text("output"),
    status: mysqlEnum("status", ["success", "failed", "blocked"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ai_generations_business_created_idx").on(table.businessId, table.createdAt)]
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").references(() => businesses.id, { onDelete: "cascade" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 64 }),
    metadata: json("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("audit_logs_business_created_idx").on(table.businessId, table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
  ]
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    recipientUserId: int("recipientUserId").references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body"),
    actionUrl: text("actionUrl"),
    isRead: boolean("isRead").default(false).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("notifications_business_read_created_idx").on(table.businessId, table.isRead, table.createdAt),
    index("notifications_recipient_read_idx").on(table.recipientUserId, table.isRead),
  ]
);

export const rateLimitBuckets = mysqlTable(
  "rate_limit_buckets",
  {
    id: int("id").autoincrement().primaryKey(),
    subjectHash: varchar("subjectHash", { length: 64 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    bucketStartedAt: timestamp("bucketStartedAt").notNull(),
    count: int("count").default(0).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("rate_limit_buckets_subject_action_bucket_uniq").on(table.subjectHash, table.action, table.bucketStartedAt),
    index("rate_limit_buckets_expiry_idx").on(table.expiresAt),
  ]
);

export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  monthlyPriceCents: int("monthlyPriceCents").default(0).notNull(),
  limits: json("limits").$type<Record<string, number> | null>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .unique()
      .references(() => businesses.id, { onDelete: "cascade" }),
    planId: int("planId").references(() => subscriptionPlans.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["trial", "active", "past_due", "cancelled"]).default("trial").notNull(),
    currentPeriodEndsAt: timestamp("currentPeriodEndsAt"),
    trialEndsAt: timestamp("trialEndsAt"),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
    stripePriceId: varchar("stripePriceId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscriptions_status_idx").on(table.status)]
);

/** Idempotency record only: Stripe payloads and payment instruments are never persisted. */
export const stripeWebhookEvents = mysqlTable(
  "stripe_webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: varchar("eventId", { length: 255 }).notNull().unique(),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    businessId: int("businessId").references(() => businesses.id, { onDelete: "set null" }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  table => [index("stripe_webhook_events_business_received_idx").on(table.businessId, table.receivedAt)]
);

export const automationRules = mysqlTable(
  "automation_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    triggerType: mysqlEnum("triggerType", ["scheduled", "event"]).notNull(),
    triggerConfig: json("triggerConfig").$type<Record<string, unknown>>().notNull(),
    actionType: varchar("actionType", { length: 80 }).notNull(),
    actionConfig: json("actionConfig").$type<Record<string, unknown>>().notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    isEnabled: boolean("isEnabled").default(false).notNull(),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("automation_rules_business_enabled_idx").on(table.businessId, table.isEnabled),
    index("automation_rules_task_uid_idx").on(table.scheduleCronTaskUid),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
