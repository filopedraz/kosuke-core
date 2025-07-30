import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  json,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const waitlistEntries = pgTable('waitlist_entries', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'invited', 'registered'
  invitedAt: timestamp('invited_at'),
  registeredAt: timestamp('registered_at'),
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
  githubRepoUrl: text('github_repo_url'),
  githubOwner: text('github_owner'),
  githubRepoName: text('github_repo_name'),
  githubBranch: text('github_branch').default('main'),
  autoCommit: boolean('auto_commit').default(true),
  lastGithubSync: timestamp('last_github_sync'),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text('content'), // For user messages (nullable for assistant messages)
  blocks: jsonb('blocks'), // For assistant message blocks (text, thinking, tools)
  modelType: varchar('model_type', { length: 20 }), // 'default' or 'premium'
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  tokensInput: integer('tokens_input'), // Number of tokens sent to the model
  tokensOutput: integer('tokens_output'), // Number of tokens received from the model
  contextTokens: integer('context_tokens'), // Current context window size in tokens
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

export const userGithubTokens = pgTable('user_github_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  githubToken: text('github_token').notNull(),
  githubUsername: text('github_username'),
  tokenScope: text('token_scope').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectCommits = pgTable('project_commits', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  commitSha: text('commit_sha').notNull(),
  commitMessage: text('commit_message').notNull(),
  commitUrl: text('commit_url'),
  filesChanged: integer('files_changed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const githubSyncSessions = pgTable('github_sync_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  commitSha: text('commit_sha'),
  filesChanged: integer('files_changed').default(0),
  status: text('status').default('active'), // active, completed, failed
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  githubTokens: many(userGithubTokens),
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
  commits: many(projectCommits),
  githubSyncSessions: many(githubSyncSessions),
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

export const userGithubTokensRelations = relations(userGithubTokens, ({ one }) => ({
  user: one(users, {
    fields: [userGithubTokens.userId],
    references: [users.id],
  }),
}));

export const projectCommitsRelations = relations(projectCommits, ({ one }) => ({
  project: one(projects, {
    fields: [projectCommits.projectId],
    references: [projects.id],
  }),
}));

export const githubSyncSessionsRelations = relations(githubSyncSessions, ({ one }) => ({
  project: one(projects, {
    fields: [githubSyncSessions.projectId],
    references: [projects.id],
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

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type NewWaitlistEntry = typeof waitlistEntries.$inferInsert;

export type UserGithubToken = typeof userGithubTokens.$inferSelect;
export type NewUserGithubToken = typeof userGithubTokens.$inferInsert;
export type ProjectCommit = typeof projectCommits.$inferSelect;
export type NewProjectCommit = typeof projectCommits.$inferInsert;
export type GithubSyncSession = typeof githubSyncSessions.$inferSelect;
export type NewGithubSyncSession = typeof githubSyncSessions.$inferInsert;
