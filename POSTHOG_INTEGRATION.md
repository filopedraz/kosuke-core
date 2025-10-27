# PostHog Analytics Integration

This document describes the PostHog analytics integration in the Kosuke application.

## Overview

PostHog is integrated for both client-side and server-side analytics tracking, providing:

- **Automatic pageview tracking** - Track page navigation across the app
- **User identification** - Sync Clerk users with PostHog for user analytics
- **Custom event tracking** - Track specific user actions and feature usage
- **Feature flags** - Controlled feature rollouts and A/B testing
- **Server-side tracking** - Track events from API routes and server components

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Required
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key

# Optional (defaults to https://app.posthog.com)
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Get your API key from [PostHog Project Settings](https://app.posthog.com/project/settings).

### 2. Installation

PostHog packages are already installed:

```json
{
  "posthog-js": "^1.281.0", // Client-side tracking
  "posthog-node": "^5.10.4" // Server-side tracking
}
```

### 3. Provider Setup

The `PostHogProvider` is already integrated in `src/app/providers.tsx` and will:

- Initialize PostHog on app mount
- Automatically identify users when they sign in via Clerk
- Track pageviews on route changes

## Usage

### Client-Side Tracking

#### Using the Hook (Recommended)

```typescript
'use client';

import { usePostHog } from '@/hooks/use-posthog';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

export function MyComponent() {
  const { capture } = usePostHog();

  const handleButtonClick = () => {
    capture(ANALYTICS_EVENTS.FEATURE_USED, {
      feature_name: 'export_project',
      feature_location: 'dashboard',
    });
  };

  return <button onClick={handleButtonClick}>Export</button>;
}
```

#### Direct PostHog Access

```typescript
'use client';

import { posthog } from '@/lib/analytics/posthog';

export function MyComponent() {
  const trackEvent = () => {
    posthog?.capture('custom_event', {
      property1: 'value1',
      property2: 'value2',
    });
  };

  return <button onClick={trackEvent}>Track</button>;
}
```

### Server-Side Tracking

Use server-side tracking for API routes, Server Components, and background jobs:

```typescript
import { captureServerEvent } from '@/lib/analytics/server';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

// In an API route
export async function POST(request: Request) {
  const { userId } = auth();

  // Your logic here...

  // Track the event
  await captureServerEvent(ANALYTICS_EVENTS.PROJECT_CREATED, userId, {
    project_name: 'My Project',
    template_used: 'blank',
  });

  return Response.json({ success: true });
}
```

### User Identification

Users are automatically identified when they sign in via Clerk. To manually identify:

```typescript
import { usePostHog } from '@/hooks/use-posthog';

const { identify } = usePostHog();

identify(userId, {
  email: 'user@example.com',
  plan: 'pro',
  createdAt: new Date().toISOString(),
});
```

### Feature Flags

Check if a feature flag is enabled:

```typescript
'use client';

import { usePostHog } from '@/hooks/use-posthog';

export function MyComponent() {
  const { featureEnabled } = usePostHog();

  const showNewFeature = featureEnabled('new-dashboard-layout');

  return showNewFeature ? <NewDashboard /> : <OldDashboard />;
}
```

## Event Definitions

All events are centrally defined in `src/lib/analytics/events.ts` for type safety:

```typescript
import { ANALYTICS_EVENTS } from '@/lib/analytics';

// User events
ANALYTICS_EVENTS.SIGNED_UP;
ANALYTICS_EVENTS.SIGNED_IN;
ANALYTICS_EVENTS.SIGNED_OUT;
ANALYTICS_EVENTS.PROFILE_UPDATED;

// Project events
ANALYTICS_EVENTS.CREATED;
ANALYTICS_EVENTS.DELETED;
ANALYTICS_EVENTS.UPDATED;
ANALYTICS_EVENTS.VIEWED;

// Subscription events
ANALYTICS_EVENTS.STARTED;
ANALYTICS_EVENTS.CANCELLED;
ANALYTICS_EVENTS.UPGRADED;
ANALYTICS_EVENTS.DOWNGRADED;

// Feature events
ANALYTICS_EVENTS.USED;
ANALYTICS_EVENTS.DISCOVERED;
ANALYTICS_EVENTS.COMPLETED;
```

## Best Practices

### 1. Use Centralized Event Names

Always use the constants from `ANALYTICS_EVENTS` instead of hardcoded strings:

```typescript
// ✅ Good
capture(ANALYTICS_EVENTS.PROJECT_CREATED, { name: 'My Project' });

// ❌ Bad
capture('project_created', { name: 'My Project' });
```

### 2. Include Meaningful Properties

Add context to your events with descriptive properties:

```typescript
capture(ANALYTICS_EVENTS.FEATURE_USED, {
  feature_name: 'ai_generation',
  feature_location: 'editor',
  user_tier: 'pro',
  session_duration: 3600,
  success: true,
});
```

### 3. Track User Journey Events

Track key moments in the user journey:

```typescript
// User signs up
capture(ANALYTICS_EVENTS.SIGNED_UP, {
  signup_method: 'google',
  referral_source: 'landing_page',
});

// User creates first project
capture(ANALYTICS_EVENTS.PROJECT_CREATED, {
  is_first_project: true,
  template_used: 'starter',
});

// User upgrades subscription
capture(ANALYTICS_EVENTS.SUBSCRIPTION_UPGRADED, {
  from_tier: 'free',
  to_tier: 'pro',
  billing_interval: 'monthly',
});
```

### 4. Server-Side vs Client-Side

**Use client-side tracking when:**

- Tracking user interactions (clicks, form submissions)
- Tracking page views
- Checking feature flags for UI changes

**Use server-side tracking when:**

- Tracking API calls and webhooks
- Tracking background jobs
- Tracking sensitive operations
- Need guaranteed delivery (server-side is more reliable)

### 5. Privacy Considerations

PostHog is configured with `person_profiles: 'identified_only'` to only create profiles for authenticated users. Anonymous users are tracked but not profiled.

## Debugging

### Development Mode

In development, PostHog runs in debug mode. Open browser console to see:

```
PostHog Debug: Event captured - project_created
PostHog Debug: Properties - { project_name: "My Project" }
```

### Verify Events

1. Go to [PostHog Activity](https://app.posthog.com/activity/explore)
2. Select "Events" tab
3. Filter by event name or user
4. Verify properties are correct

## Common Patterns

### Track Form Submissions

```typescript
'use client';

import { usePostHog } from '@/hooks/use-posthog';

export function ContactForm() {
  const { capture } = usePostHog();

  const handleSubmit = async (data: FormData) => {
    capture('form_submitted', {
      form_name: 'contact',
      form_location: 'landing_page',
    });

    // Submit form...
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Track Errors

```typescript
'use client';

import { usePostHog } from '@/hooks/use-posthog';

export function MyComponent() {
  const { capture } = usePostHog();

  const handleError = (error: Error) => {
    capture('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      component: 'MyComponent',
      severity: 'high',
    });
  };

  return <div>...</div>;
}
```

### Track Time on Page

```typescript
'use client';

import { usePostHog } from '@/hooks/use-posthog';
import { useEffect } from 'react';

export function ArticlePage() {
  const { capture } = usePostHog();

  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = Date.now() - startTime;
      capture('article_read', {
        article_id: 'article-123',
        time_spent_seconds: Math.floor(timeSpent / 1000),
      });
    };
  }, [capture]);

  return <article>...</article>;
}
```

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Next.js Guide](https://posthog.com/docs/libraries/next-js)
- [PostHog Feature Flags](https://posthog.com/docs/feature-flags)
- [PostHog API Reference](https://posthog.com/docs/api)
