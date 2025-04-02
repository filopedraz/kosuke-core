import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  json,
  boolean,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  imageUrl: text('image_url'),
  marketingEmails: boolean('marketing_emails').default(false),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  pipelinePreference: varchar('pipeline_preference', { length: 20 }).default('naive'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  createdBy: integer('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isArchived: boolean('is_archived').default(false),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  modelType: varchar('model_type', { length: 20 }), // 'default' or 'premium'
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const diffs = pgTable('diffs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  chatMessageId: integer('chat_message_id')
    .references(() => chatMessages.id)
    .notNull(),
  filePath: text('file_path').notNull(),
  content: text('content').notNull(), // The diff content
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'applied', 'rejected'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  appliedAt: timestamp('applied_at'),
});

export const subscriptionProducts = pgTable('subscription_products', {
  id: serial('id').primaryKey(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }).notNull().unique(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  tier: varchar('tier', { length: 20 }).notNull(), // 'free', 'premium', 'business', 'enterprise'
  price: integer('price'), // in cents
  features: json('features').$type<string[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  productId: integer('product_id').references(() => subscriptionProducts.id),
  status: varchar('status', { length: 50 }).notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'trialing'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  canceledAt: timestamp('canceled_at'),
});

export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id')
    .references(() => chatMessages.id)
    .notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'create', 'edit', 'delete', 'read', 'search'
  path: text('path').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // 'pending', 'completed', 'error'
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  chatMessages: many(chatMessages),
  diffs: many(diffs),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  diffs: many(diffs),
  actions: many(actions),
}));

export const diffsRelations = relations(diffs, ({ one }) => ({
  project: one(projects, {
    fields: [diffs.projectId],
    references: [projects.id],
  }),
  chatMessage: one(chatMessages, {
    fields: [diffs.chatMessageId],
    references: [chatMessages.id],
  }),
}));

export const subscriptionProductsRelations = relations(subscriptionProducts, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  product: one(subscriptionProducts, {
    fields: [subscriptions.productId],
    references: [subscriptionProducts.id],
  }),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  message: one(chatMessages, {
    fields: [actions.messageId],
    references: [chatMessages.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_PREFERENCES = 'UPDATE_PREFERENCES',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
}

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Diff = typeof diffs.$inferSelect;
export type NewDiff = typeof diffs.$inferInsert;
export type SubscriptionProduct = typeof subscriptionProducts.$inferSelect;
export type NewSubscriptionProduct = typeof subscriptionProducts.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
