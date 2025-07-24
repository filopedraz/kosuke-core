# 📋 Ticket 21: Database Schema for Custom Domains

**Priority:** High  
**Estimated Effort:** 2 hours

## Description

Add database schema to support custom subdomains for projects in production. Each project can have a custom subdomain that routes to its preview container.

## Files to Create/Update

```
lib/db/migrations/XXXX_custom_domains.sql
lib/db/schema.ts (update)
```

## Implementation Details

**lib/db/migrations/XXXX_custom_domains.sql** - Custom domains schema:

```sql
-- Create project domains table
CREATE TABLE project_domains (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    subdomain TEXT NOT NULL UNIQUE, -- e.g., 'open-idealista'
    full_domain TEXT NOT NULL UNIQUE, -- e.g., 'open-idealista.kosuke.ai'
    is_active BOOLEAN DEFAULT true,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_cert_path TEXT,
    container_port INTEGER, -- Internal container port
    last_deployed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create domain routing cache table (for fast lookups)
CREATE TABLE domain_routing_cache (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    project_id INTEGER NOT NULL,
    container_name TEXT,
    internal_port INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_project_domains_project_id ON project_domains(project_id);
CREATE INDEX idx_project_domains_subdomain ON project_domains(subdomain);
CREATE INDEX idx_project_domains_full_domain ON project_domains(full_domain);
CREATE INDEX idx_domain_routing_cache_domain ON domain_routing_cache(domain);

-- Add domain field to projects table
ALTER TABLE projects ADD COLUMN custom_subdomain TEXT UNIQUE;
```

**lib/db/schema.ts** - Update schema:

```typescript
// Add to existing schema file
export const projectDomains = pgTable('project_domains', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  subdomain: text('subdomain').notNull().unique(),
  fullDomain: text('full_domain').notNull().unique(),
  isActive: boolean('is_active').default(true),
  sslEnabled: boolean('ssl_enabled').default(false),
  sslCertPath: text('ssl_cert_path'),
  containerPort: integer('container_port'),
  lastDeployed: timestamp('last_deployed'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const domainRoutingCache = pgTable('domain_routing_cache', {
  id: serial('id').primaryKey(),
  domain: text('domain').notNull().unique(),
  projectId: integer('project_id').notNull(),
  containerName: text('container_name'),
  internalPort: integer('internal_port'),
  isActive: boolean('is_active').default(true),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Update projects table
export const projects = pgTable('projects', {
  // ... existing fields
  customSubdomain: text('custom_subdomain').unique(),
});
```

## Acceptance Criteria

- [x] Custom domains table created
- [x] Domain routing cache for performance
- [x] SSL certificate tracking
- [x] Projects linked to custom subdomains
