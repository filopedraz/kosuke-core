# 📋 Ticket 18: Database Schema for Environment Variables

**Priority:** High  
**Estimated Effort:** 2 hours

## Description

Add database schema to store project-specific environment variables and integration settings. This supports the preview system and project configuration.

## Files to Create/Update

```
lib/db/migrations/XXXX_project_environment.sql
lib/db/schema.ts (update)
```

## Implementation Details

**lib/db/migrations/XXXX_project_environment.sql** - Environment variables schema:

```sql
-- Create project environment variables table
CREATE TABLE project_environment_variables (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, key)
);

-- Create project integrations table
CREATE TABLE project_integrations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL, -- 'clerk', 'polar', 'stripe', 'custom'
    integration_name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, integration_type, integration_name)
);

-- Add indexes for performance
CREATE INDEX idx_project_env_vars_project_id ON project_environment_variables(project_id);
CREATE INDEX idx_project_integrations_project_id ON project_integrations(project_id);
```

**lib/db/schema.ts** - Update schema:

```typescript
// Add to existing schema file
export const projectEnvironmentVariables = pgTable('project_environment_variables', {
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
});

export const projectIntegrations = pgTable('project_integrations', {
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
});
```

## Acceptance Criteria

- [x] Environment variables table created
- [x] Project integrations table created
- [x] Proper indexes and constraints
- [x] Support for secret variables
