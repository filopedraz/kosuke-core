# 📋 Ticket 7: Remove Old Preview Logic from Next.js

**Priority:** Medium  
**Estimated Effort:** 1 hour

## Description

Clean up the old preview logic from Next.js `lib/preview/` directory since it's now handled by the Python agent.

## Files to Delete/Update

```
lib/preview/ (entire directory - DELETE)
Update any imports that reference the old preview logic
```

## Implementation Details

**Files to delete:**

- `lib/preview/baseRunner.ts`
- `lib/preview/dockerRunner.ts`
- `lib/preview/k8sRunner.ts`
- `lib/preview/preview.ts`
- `lib/preview/index.ts`

**Search and update imports:** Look for any remaining imports of `@/lib/preview` and remove them.

## Acceptance Criteria

- [x] Old preview directory completely removed
- [x] No broken imports remain
- [x] Build passes without preview logic
- [x] All preview functionality works through agent

---

## Phase 2: GitHub Integration
