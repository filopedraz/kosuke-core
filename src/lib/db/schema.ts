import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  clerkUserId: text('clerk_user_id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  imageUrl: text('image_url'),
  marketingEmails: boolean('marketing_emails').default(false),
  pipelinePreference: varchar('pipeline_preference', { length: 20 })
    .notNull()
    .default('claude-code'), // 'kosuke' | 'claude-code'
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerkUserId),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  userId: text('user_id')
    .references(() => users.clerkUserId)
    .notNull(),
  createdBy: text('created_by')
    .references(() => users.clerkUserId)
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
  defaultBranch: varchar('default_branch', { length: 100 }).default('main'),
  status: varchar('status', { length: 20 }).notNull().default('requirements'), // 'requirements' | 'ready' | 'active'
  // Project Estimate fields
  estimateComplexity: varchar('estimate_complexity', { length: 20 }), // 'simple' | 'medium' | 'complex'
  estimateAmount: integer('estimate_amount'), // Dollar amount
  estimateReasoning: text('estimate_reasoning'), // LLM reasoning for the estimate
  estimateGeneratedAt: timestamp('estimate_generated_at'),
});

export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.clerkUserId)
    .notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  sessionId: varchar('session_id', { length: 50 }).unique().notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, archived, completed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  messageCount: integer('message_count').default(0),
  isDefault: boolean('is_default').default(false),
  isRequirementsSession: boolean('is_requirements_session').default(false),
  // GitHub merge status
  branchMergedAt: timestamp('branch_merged_at'),
  branchMergedBy: varchar('branch_merged_by', { length: 100 }),
  mergeCommitSha: varchar('merge_commit_sha', { length: 40 }),
  pullRequestNumber: integer('pull_request_number'),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  chatSessionId: integer('chat_session_id')
    .references(() => chatSessions.id, { onDelete: 'cascade' })
    .notNull(), // Make this NOT NULL - all messages must be tied to a session
  userId: text('user_id').references(() => users.clerkUserId),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text('content'), // For user messages (nullable for assistant messages)
  blocks: jsonb('blocks'), // For assistant message blocks (text, thinking, tools)
  modelType: varchar('model_type', { length: 20 }), // 'default' or 'premium'
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  tokensInput: integer('tokens_input'), // Number of tokens sent to the model
  tokensOutput: integer('tokens_output'), // Number of tokens received from the model
  contextTokens: integer('context_tokens'), // Current context window size in tokens
  commitSha: text('commit_sha'), // NEW: Git commit SHA for revert functionality
  metadata: jsonb('metadata'), // NEW: System message metadata (e.g., revert info)
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

export const userGithubTokens = pgTable('user_github_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.clerkUserId, { onDelete: 'cascade' }),
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
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'manual', 'webhook', 'cron'
  status: varchar('status', { length: 20 }).default('running'), // 'running', 'completed', 'failed'
  changes: jsonb('changes'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  logs: text('logs'),
});

export const projectEnvironmentVariables = pgTable(
  'project_environment_variables',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    isSecret: boolean('is_secret').default(false),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    uniqueProjectKey: unique('project_env_vars_unique_key').on(table.projectId, table.key),
  })
);

export const projectIntegrations = pgTable(
  'project_integrations',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    integrationType: text('integration_type').notNull(), // 'clerk', 'polar', 'stripe', 'custom'
    integrationName: text('integration_name').notNull(),
    config: text('config').notNull().default('{}'), // JSON string
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    uniqueProjectIntegration: unique('project_integrations_unique_key').on(
      table.projectId,
      table.integrationType,
      table.integrationName
    ),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  githubTokens: many(userGithubTokens),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.clerkUserId],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.clerkUserId],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.clerkUserId],
  }),
  chatMessages: many(chatMessages),
  chatSessions: many(chatSessions),
  diffs: many(diffs),
  commits: many(projectCommits),
  githubSyncSessions: many(githubSyncSessions),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatSessions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.clerkUserId],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
  chatSession: one(chatSessions, {
    fields: [chatMessages.chatSessionId],
    references: [chatSessions.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.clerkUserId],
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

export const userGithubTokensRelations = relations(userGithubTokens, ({ one }) => ({
  user: one(users, {
    fields: [userGithubTokens.userId],
    references: [users.clerkUserId],
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

export const projectEnvironmentVariablesRelations = relations(
  projectEnvironmentVariables,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectEnvironmentVariables.projectId],
      references: [projects.id],
    }),
  })
);

export const projectIntegrationsRelations = relations(projectIntegrations, ({ one }) => ({
  project: one(projects, {
    fields: [projectIntegrations.projectId],
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
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Diff = typeof diffs.$inferSelect;
export type NewDiff = typeof diffs.$inferInsert;

export type UserGithubToken = typeof userGithubTokens.$inferSelect;
export type NewUserGithubToken = typeof userGithubTokens.$inferInsert;
export type ProjectCommit = typeof projectCommits.$inferSelect;
export type NewProjectCommit = typeof projectCommits.$inferInsert;
export type GithubSyncSession = typeof githubSyncSessions.$inferSelect;
export type NewGithubSyncSession = typeof githubSyncSessions.$inferInsert;
export type ProjectEnvironmentVariable = typeof projectEnvironmentVariables.$inferSelect;
export type NewProjectEnvironmentVariable = typeof projectEnvironmentVariables.$inferInsert;
export type ProjectIntegration = typeof projectIntegrations.$inferSelect;
export type NewProjectIntegration = typeof projectIntegrations.$inferInsert;
