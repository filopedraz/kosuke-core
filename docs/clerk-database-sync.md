# Clerk-Database Synchronization Guide

## Overview

This document outlines the best practices for maintaining synchronization between Clerk (authentication provider) and your application database.

## Architecture

Our application uses a **hybrid approach** with multiple layers of synchronization:

1. **Primary: Event-driven sync via webhooks** (`/api/webhooks/clerk`)
2. **Fallback: Auto-sync on demand** (profile API)
3. **Recovery: Periodic sync jobs** (`/api/admin/sync-users`)
4. **Emergency: Manual sync scripts** (`scripts/sync-clerk-users.ts`)

## Sync Strategies

### 1. Event-Driven Sync (Primary)

**Location**: `app/api/webhooks/clerk/route.ts`

**How it works**:

- Clerk sends webhooks for `user.created`, `user.updated`, `user.deleted` events
- Immediate synchronization when users change in Clerk
- Most reliable method for real-time sync

**Best practices**:

- ✅ Always verify webhook signatures
- ✅ Handle idempotency (user might already exist)
- ✅ Graceful error handling for database constraints
- ✅ Log all webhook events for debugging
- ✅ Handle soft deletion rather than hard deletion

**Configuration**:

```bash
# Required environment variables
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
CLERK_SECRET_KEY=sk_your_secret_key
```

### 2. Auto-Sync Fallback

**Location**: `app/api/user/profile/route.ts`

**How it works**:

- When user profile is requested but user doesn't exist in database
- Automatically fetch user from Clerk and create database record
- Transparent to the user experience

**Use cases**:

- Webhook delivery failures
- Database was reset/cleared
- New environments or data migrations
- Race conditions during user creation

### 3. Periodic Sync Jobs

**Location**: `app/api/admin/sync-users/route.ts`

**How it works**:

- Comprehensive comparison between Clerk and database
- Identifies and fixes discrepancies
- Can run in dry-run mode for analysis
- Suitable for cron jobs

**Recommended schedule**:

- **Production**: Daily at low-traffic hours
- **Staging**: Every 6 hours
- **Development**: On-demand

**Usage**:

```bash
# Dry run to check for issues
curl -X POST "http://localhost:3000/api/admin/sync-users?dry_run=true" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"

# Force full sync
curl -X POST "http://localhost:3000/api/admin/sync-users?force=true" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

### 4. Emergency Manual Sync

**Location**: `scripts/sync-clerk-users.ts`

**How it works**:

- One-time script to recreate all users from Clerk
- Useful for disaster recovery or major data loss

**Usage**:

```bash
npx tsx scripts/sync-clerk-users.ts
```

## Data Model Considerations

### Primary Key Strategy

We use `clerkUserId` as the primary key in the users table:

```sql
CREATE TABLE users (
  clerk_user_id TEXT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  -- other fields
);
```

**Benefits**:

- ✅ Natural relationship with Clerk
- ✅ No need for foreign key lookups
- ✅ Prevents orphaned records

**Considerations**:

- ⚠️ Clerk user IDs are strings, not integers
- ⚠️ All related tables must use TEXT for foreign keys

### Soft Deletion

Always use soft deletion for users:

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
```

**Why**:

- Users might have related data (projects, messages, etc.)
- Audit trails and data compliance
- Possibility of account restoration

## Error Handling

### Webhook Failures

```typescript
// Webhook handler should always return 200 for processed events
try {
  await handleUserCreated(data);
  return NextResponse.json({ message: 'Webhook processed successfully' });
} catch (error) {
  console.error('Error processing webhook:', error);
  // Return 200 to prevent Clerk from retrying
  return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
}
```

### Email Conflicts

Handle cases where users sign up with same email but different providers:

```typescript
try {
  await db.insert(users).values(userData);
} catch (insertError) {
  if (insertError?.code === '23505' && insertError?.constraint === 'users_email_unique') {
    // Handle email conflict gracefully
    // Option 1: Update existing user with new Clerk ID
    // Option 2: Create user with modified email
    // Option 3: Merge accounts (complex)
  }
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Webhook delivery rate**: Should be near 100%
2. **User count discrepancy**: Clerk vs Database
3. **Auto-sync frequency**: How often fallback is triggered
4. **Sync job duration**: Should complete within reasonable time

### Recommended Alerts

- Webhook delivery failures > 5% in 1 hour
- User count discrepancy > 10 users
- Auto-sync triggered > 50 times in 1 hour
- Sync job failures

### Health Check Endpoint

Consider adding a health check endpoint:

```typescript
// app/api/health/user-sync/route.ts
export async function GET() {
  const clerkCount = await getClerkUserCount();
  const dbCount = await getDatabaseUserCount();
  const discrepancy = Math.abs(clerkCount - dbCount);

  return NextResponse.json({
    status: discrepancy < 10 ? 'healthy' : 'warning',
    clerk_users: clerkCount,
    db_users: dbCount,
    discrepancy,
  });
}
```

## Troubleshooting

### Common Issues

1. **404 errors on user profile**
   - **Cause**: User exists in Clerk but not in database
   - **Solution**: Auto-sync fallback should handle this
   - **Prevention**: Ensure webhooks are properly configured

2. **Duplicate email errors**
   - **Cause**: User created account with same email via different method
   - **Solution**: Update existing user with new Clerk ID
   - **Prevention**: Better email validation and user guidance

3. **Webhook delivery failures**
   - **Cause**: Network issues, server downtime, invalid endpoint
   - **Solution**: Run periodic sync job
   - **Prevention**: Monitor webhook endpoint health

4. **Stale user data**
   - **Cause**: User updated in Clerk but webhook failed
   - **Solution**: Periodic sync will catch and update
   - **Prevention**: Implement retry logic for critical updates

### Debug Tools

1. **Check webhook logs**:

   ```bash
   # Check server logs for webhook events
   grep "📨 Clerk webhook" logs/app.log
   ```

2. **Run sync analysis**:

   ```bash
   curl -X POST "localhost:3000/api/admin/sync-users?dry_run=true"
   ```

3. **Manual user lookup**:
   ```typescript
   // Check if user exists in both systems
   const clerkUser = await clerk.users.getUser(userId);
   const dbUser = await db.select().from(users).where(eq(users.clerkUserId, userId));
   ```

## Security Considerations

1. **Webhook Security**:
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Implement rate limiting

2. **Admin Endpoints**:
   - Protect sync endpoints with API keys
   - Only allow in authorized environments
   - Log all administrative actions

3. **Data Privacy**:
   - Follow GDPR/CCPA for user deletions
   - Implement proper data retention policies
   - Audit data access and modifications

## Recovery Procedures

### Complete Database Loss

1. **Immediate**: Run emergency sync script

   ```bash
   npx tsx scripts/sync-clerk-users.ts
   ```

2. **Verify**: Check user counts match

   ```bash
   curl -X POST "localhost:3000/api/admin/sync-users?dry_run=true"
   ```

3. **Monitor**: Watch for auto-sync fallback triggers

### Partial Data Loss

1. **Identify**: Which users are affected
2. **Sync**: Use periodic sync job with force flag
3. **Validate**: Ensure all user data is restored

### Clerk Service Outage

1. **Graceful degradation**: Cache user data when possible
2. **Fallback**: Use database as source of truth temporarily
3. **Resync**: Run full sync once Clerk is restored

## Environment Setup

### Development

```bash
# .env.local
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
ADMIN_API_KEY=dev_admin_key_123
```

### Production

```bash
# Environment variables
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
ADMIN_API_KEY=secure_random_key
```

### Cron Job Setup

```bash
# Add to crontab for daily sync at 2 AM
0 2 * * * curl -X POST "https://yourapp.com/api/admin/sync-users" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  >> /var/log/user-sync.log 2>&1
```

## Conclusion

This multi-layered approach ensures robust user synchronization between Clerk and your database. The combination of event-driven webhooks, automatic fallbacks, and periodic sync jobs provides redundancy and reliability for your user management system.

Remember to:

- ✅ Monitor webhook delivery
- ✅ Set up periodic sync jobs
- ✅ Handle edge cases gracefully
- ✅ Plan for disaster recovery
- ✅ Test sync procedures regularly
