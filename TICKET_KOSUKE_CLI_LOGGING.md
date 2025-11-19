# Ticket: Implement CLI Logging for kosuke-cli

## Overview

Implement comprehensive command execution logging in kosuke-cli to track usage, performance, costs, and errors. This will enable better analytics, cost monitoring, and debugging capabilities through the kosuke-core dashboard.

## Background

kosuke-core has implemented a complete CLI logging system including:

- API endpoint for receiving CLI logs (`POST /api/cli-logs`)
- Database schema with comprehensive tracking fields
- Admin dashboard for viewing logs, statistics, and history
- BullMQ job queue for async log processing
- Cost alerting system for project monitoring

**This ticket focuses on implementing the CLI-side logging logic to send data to kosuke-core.**

---

## API Endpoint Details

### Endpoint

```
POST https://{kosuke-core-domain}/api/cli-logs
```

### Authentication

```http
x-cli-api-key: {KOSUKE_CLI_API_KEY}
```

The API key must be included in request headers. The endpoint validates this key against the `KOSUKE_CLI_API_KEY` environment variable configured in kosuke-core.

### Request Schema

```typescript
interface CliLogRequest {
  // Project context (required - only log if within kosuke-core project)
  projectId: string; // UUID - required
  orgId?: string; // Clerk org ID - optional
  userId?: string; // Clerk user ID - optional

  // Command details
  command: 'ship' | 'test' | 'review' | 'getcode' | 'tickets'; // required
  commandArgs?: Record<string, unknown>; // Command-specific arguments

  // Execution status
  status: 'success' | 'error' | 'cancelled'; // required
  errorMessage?: string; // Only for 'error' status

  // Token usage (required fields)
  tokensInput: number; // Non-negative integer
  tokensOutput: number; // Non-negative integer
  tokensCacheCreation?: number; // Non-negative integer
  tokensCacheRead?: number; // Non-negative integer
  cost: string; // Decimal as string (e.g., "0.0025")

  // Performance (required)
  executionTimeMs: number; // Total command execution time
  inferenceTimeMs?: number; // Time spent on LLM inference

  // Command-specific results (all optional)
  fixesApplied?: number; // For 'ship' and 'test' commands
  testsRun?: number; // For 'test' command
  testsPassed?: number; // For 'test' command
  testsFailed?: number; // For 'test' command
  iterations?: number; // For iterative commands
  filesModified?: string[]; // List of modified file paths

  // Metadata
  cliVersion?: string; // kosuke-cli version
  metadata?: Record<string, unknown>; // Additional context

  // Timestamps (ISO 8601 format)
  startedAt: string; // Command start time
  completedAt: string; // Command completion time
}
```

### Response

**Success (202 Accepted):**

```json
{
  "success": true,
  "jobId": "string"
}
```

**Error (400 Bad Request - validation error):**

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "path": ["field"],
      "message": "error message"
    }
  ]
}
```

**Error (403 Forbidden - invalid API key):**

```json
{
  "error": "Invalid API key"
}
```

**Error (500 Internal Server Error):**

```json
{
  "error": "Failed to queue log request",
  "details": "error details"
}
```

---

## Implementation Requirements

### 1. Configuration

**Environment Variables Required:**

```bash
KOSUKE_CORE_URL=https://your-kosuke-core.com
KOSUKE_CLI_API_KEY=your-secret-api-key
```

**Configuration Loading:**

- Load from `.env` file in project root
- Support both `.env` and `.env.local`
- Validate required variables on CLI startup
- Provide helpful error messages if missing

### 2. Logger Module

Create a centralized logging module (`logger.ts` or similar) with:

**Key Functions:**

```typescript
/**
 * Initialize logger with configuration
 * - Load environment variables
 * - Validate API key
 * - Set up HTTP client
 */
function initLogger(): void;

/**
 * Log a command execution
 * - Only logs if within a kosuke-core project (projectId exists)
 * - Non-blocking: fire-and-forget
 * - Handle errors gracefully without interrupting CLI flow
 */
async function logCommand(data: CliLogData): Promise<void>;

/**
 * Helper to calculate cost from token usage
 * Based on Claude pricing tiers
 */
function calculateCost(
  tokensInput: number,
  tokensOutput: number,
  tokensCacheCreation?: number,
  tokensCacheRead?: number
): string;

/**
 * Helper to detect project context
 * - Check for .kosuke directory or config file
 * - Extract projectId from project metadata
 */
function getProjectContext(): { projectId?: string; orgId?: string; userId?: string };
```

**Error Handling:**

- All logging operations must be non-blocking
- Failed log submissions should NOT interrupt CLI commands
- Log errors to local debug file for troubleshooting
- Implement retry logic with exponential backoff (max 2 retries)
- Timeout after 5 seconds

**Privacy Considerations:**

- NEVER log sensitive data (API keys, tokens, passwords)
- Sanitize command arguments to remove sensitive values
- Only log file paths, not file contents
- Redact error messages that might contain sensitive data

### 3. Command Integration

**For Each Command (ship, test, review, getcode, tickets):**

1. **Before Execution:**

   ```typescript
   const startTime = Date.now();
   const startedAt = new Date().toISOString();
   ```

2. **Track Token Usage:**
   - Capture all LLM API calls
   - Sum up token counts (input, output, cache creation, cache reads)
   - Track inference time separately from total execution time

3. **After Execution:**

   ```typescript
   const completedAt = new Date().toISOString();
   const executionTimeMs = Date.now() - startTime;

   await logCommand({
     projectId: context.projectId,
     command: 'ship', // or 'test', 'review', etc.
     status: 'success', // or 'error', 'cancelled'
     tokensInput: totalInputTokens,
     tokensOutput: totalOutputTokens,
     cost: calculateCost(totalInputTokens, totalOutputTokens),
     executionTimeMs,
     startedAt,
     completedAt,
     // ... command-specific fields
   });
   ```

4. **Error Handling:**

   ```typescript
   catch (error) {
     await logCommand({
       // ... same fields as success
       status: 'error',
       errorMessage: error.message,
     });
     throw error; // Re-throw to maintain CLI behavior
   }
   ```

5. **Cancellation Handling:**
   ```typescript
   process.on('SIGINT', async () => {
     await logCommand({
       // ... same fields
       status: 'cancelled',
     });
     process.exit(0);
   });
   ```

### 4. Command-Specific Metrics

**ship command:**

```typescript
{
  fixesApplied: number,        // Number of code fixes applied
  filesModified: string[],     // List of modified file paths
  iterations: number,          // Number of fix iterations
}
```

**test command:**

```typescript
{
  testsRun: number,           // Total number of tests executed
  testsPassed: number,        // Number of passing tests
  testsFailed: number,        // Number of failing tests
  fixesApplied: number,       // Number of fixes applied to make tests pass
  iterations: number,         // Number of fix iterations
  filesModified: string[],    // Files modified during test fixes
}
```

**review command:**

```typescript
{
  filesModified: string[],    // Files reviewed
}
```

**getcode command:**

```typescript
{
  filesModified: string[],    // Files created or modified
}
```

**tickets command:**

```typescript
{
  // Basic metrics only (tokens, cost, execution time)
}
```

### 5. Cost Calculation

Implement Claude API pricing (as of current rates):

```typescript
function calculateCost(
  tokensInput: number,
  tokensOutput: number,
  tokensCacheCreation: number = 0,
  tokensCacheRead: number = 0
): string {
  // Claude 3.5 Sonnet pricing (update as needed)
  const INPUT_COST = 3.0 / 1_000_000; // $3.00 per million tokens
  const OUTPUT_COST = 15.0 / 1_000_000; // $15.00 per million tokens
  const CACHE_WRITE_COST = 3.75 / 1_000_000; // $3.75 per million tokens
  const CACHE_READ_COST = 0.3 / 1_000_000; // $0.30 per million tokens

  const cost =
    tokensInput * INPUT_COST +
    tokensOutput * OUTPUT_COST +
    tokensCacheCreation * CACHE_WRITE_COST +
    tokensCacheRead * CACHE_READ_COST;

  return cost.toFixed(6); // Return as string with 6 decimal places
}
```

**Note:** These rates should be configurable via environment variables or a config file for easy updates.

### 6. Testing

**Unit Tests:**

- Test cost calculation with various token combinations
- Test project context detection
- Test error handling and non-blocking behavior
- Test data sanitization and privacy measures

**Integration Tests:**

- Mock the kosuke-core API endpoint
- Test successful log submission
- Test API key validation
- Test network failure handling
- Test timeout behavior

**Manual Testing Checklist:**

- [ ] Run each command and verify logs appear in kosuke-core dashboard
- [ ] Verify token counts are accurate
- [ ] Verify cost calculations match expected values
- [ ] Test with missing API key (should gracefully degrade)
- [ ] Test with invalid API key (should log error but continue)
- [ ] Test command cancellation (CTRL+C) - should log cancelled status
- [ ] Test error scenarios - should log error status with message
- [ ] Verify no sensitive data in logs
- [ ] Verify non-blocking behavior (command works even if logging fails)

---

## Implementation Phases

### Phase 1: Core Infrastructure (Priority: High)

- [ ] Create logger module with HTTP client
- [ ] Implement environment variable loading
- [ ] Implement project context detection
- [ ] Implement cost calculation function
- [ ] Add basic error handling and logging

### Phase 2: Command Integration (Priority: High)

- [ ] Add logging to `ship` command
- [ ] Add logging to `test` command
- [ ] Add logging to `review` command
- [ ] Add logging to `getcode` command
- [ ] Add logging to `tickets` command

### Phase 3: Advanced Features (Priority: Medium)

- [ ] Implement retry logic with exponential backoff
- [ ] Add local debug logging for troubleshooting
- [ ] Implement data sanitization for privacy
- [ ] Add command cancellation handling

### Phase 4: Testing & Documentation (Priority: High)

- [ ] Write unit tests for logger module
- [ ] Write integration tests for API communication
- [ ] Add inline code documentation
- [ ] Update CLI user documentation
- [ ] Add troubleshooting guide for logging issues

### Phase 5: Optimization (Priority: Low)

- [ ] Implement log batching for multiple rapid commands
- [ ] Add offline queue for when kosuke-core is unreachable
- [ ] Implement log compression for large payloads
- [ ] Add telemetry opt-out flag for privacy-conscious users

---

## Example Implementation

```typescript
// logger.ts
import fetch from 'node-fetch';

interface CliLogData {
  projectId: string;
  orgId?: string;
  userId?: string;
  command: 'ship' | 'test' | 'review' | 'getcode' | 'tickets';
  commandArgs?: Record<string, unknown>;
  status: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
  tokensInput: number;
  tokensOutput: number;
  tokensCacheCreation?: number;
  tokensCacheRead?: number;
  cost: string;
  executionTimeMs: number;
  inferenceTimeMs?: number;
  fixesApplied?: number;
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  iterations?: number;
  filesModified?: string[];
  cliVersion?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
}

class Logger {
  private apiUrl: string;
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.apiUrl = process.env.KOSUKE_CORE_URL || '';
    this.apiKey = process.env.KOSUKE_CLI_API_KEY || '';
    this.enabled = !!(this.apiUrl && this.apiKey);

    if (!this.enabled) {
      console.warn('[CLI Logger] Logging disabled - missing KOSUKE_CORE_URL or KOSUKE_CLI_API_KEY');
    }
  }

  async logCommand(data: CliLogData): Promise<void> {
    if (!this.enabled) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.apiUrl}/api/cli-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cli-api-key': this.apiKey,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        console.error('[CLI Logger] Failed to log command:', error);
      } else {
        const result = await response.json();
        console.debug('[CLI Logger] Command logged successfully:', result.jobId);
      }
    } catch (error) {
      // Non-blocking: log error but don't throw
      console.error('[CLI Logger] Error logging command:', error.message);
    }
  }

  calculateCost(
    tokensInput: number,
    tokensOutput: number,
    tokensCacheCreation: number = 0,
    tokensCacheRead: number = 0
  ): string {
    const INPUT_COST = 3.0 / 1_000_000;
    const OUTPUT_COST = 15.0 / 1_000_000;
    const CACHE_WRITE_COST = 3.75 / 1_000_000;
    const CACHE_READ_COST = 0.3 / 1_000_000;

    const cost =
      tokensInput * INPUT_COST +
      tokensOutput * OUTPUT_COST +
      tokensCacheCreation * CACHE_WRITE_COST +
      tokensCacheRead * CACHE_READ_COST;

    return cost.toFixed(6);
  }

  getProjectContext(): { projectId?: string; orgId?: string; userId?: string } {
    // TODO: Implement project context detection
    // - Check for .kosuke directory or config file
    // - Extract projectId, orgId, userId from project metadata
    return {
      projectId: undefined,
      orgId: undefined,
      userId: undefined,
    };
  }
}

export const logger = new Logger();
```

```typescript
// Example usage in ship command
import { logger } from './logger';
import { version } from '../package.json';

async function shipCommand(args: ShipArgs) {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const context = logger.getProjectContext();

  if (!context.projectId) {
    console.log('Not in a kosuke-core project - skipping logging');
    return;
  }

  let tokensInput = 0;
  let tokensOutput = 0;
  let inferenceStartTime = 0;
  let inferenceTimeMs = 0;
  let fixesApplied = 0;
  let filesModified: string[] = [];

  try {
    // Execute command logic
    inferenceStartTime = Date.now();
    const result = await callClaudeAPI(/* ... */);
    inferenceTimeMs += Date.now() - inferenceStartTime;

    tokensInput += result.usage.input_tokens;
    tokensOutput += result.usage.output_tokens;

    // Apply fixes
    fixesApplied = result.fixes.length;
    filesModified = result.modifiedFiles;

    // Success - log it
    await logger.logCommand({
      ...context,
      command: 'ship',
      commandArgs: sanitizeArgs(args),
      status: 'success',
      tokensInput,
      tokensOutput,
      cost: logger.calculateCost(tokensInput, tokensOutput),
      executionTimeMs: Date.now() - startTime,
      inferenceTimeMs,
      fixesApplied,
      filesModified,
      cliVersion: version,
      startedAt,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Error - log it
    await logger.logCommand({
      ...context,
      command: 'ship',
      commandArgs: sanitizeArgs(args),
      status: 'error',
      errorMessage: error.message,
      tokensInput,
      tokensOutput,
      cost: logger.calculateCost(tokensInput, tokensOutput),
      executionTimeMs: Date.now() - startTime,
      inferenceTimeMs,
      fixesApplied,
      filesModified,
      cliVersion: version,
      startedAt,
      completedAt: new Date().toISOString(),
    });

    throw error; // Re-throw to maintain CLI behavior
  }
}

function sanitizeArgs(args: any): Record<string, unknown> {
  // Remove sensitive data from args
  const sanitized = { ...args };
  delete sanitized.apiKey;
  delete sanitized.token;
  delete sanitized.password;
  return sanitized;
}
```

---

## Success Criteria

- [ ] All CLI commands successfully log execution data to kosuke-core
- [ ] Logs appear in the kosuke-core admin dashboard
- [ ] Token counts and costs are accurate
- [ ] Logging is non-blocking and doesn't affect CLI performance
- [ ] Failed logging doesn't interrupt CLI commands
- [ ] No sensitive data is logged
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests pass against kosuke-core staging environment
- [ ] Documentation is complete and accurate

---

## Dependencies

- kosuke-core API endpoint: `POST /api/cli-logs`
- Environment variables: `KOSUKE_CORE_URL`, `KOSUKE_CLI_API_KEY`
- HTTP client library (e.g., `node-fetch`, `axios`)
- Date/time utilities for ISO 8601 formatting

---

## Related Files in kosuke-core

Reference these files for implementation details:

- `/src/app/api/cli-logs/route.ts` - API endpoint implementation
- `/src/lib/types/cli-logs.ts` - TypeScript type definitions
- `/src/lib/cli-logs/index.ts` - CLI logs utilities
- `/src/lib/cli-logs/cost-alerts.ts` - Cost alerting logic
- `/src/lib/db/schema.ts` - Database schema for `cli_logs` table
- `/src/lib/queue/jobs/process-cli-log.ts` - Background job processing

---

## Notes

1. **Performance:** Logging must be non-blocking and should not add more than 100ms to command execution time
2. **Privacy:** Adhere to strict privacy standards - never log sensitive user data
3. **Reliability:** Implement graceful degradation - CLI must work even if logging fails
4. **Security:** API key should be stored securely and never logged or exposed
5. **Flexibility:** Make cost calculation rates configurable for easy updates
6. **Monitoring:** Add debug mode flag for verbose logging during development

---

## Questions for Review

1. Should we implement a telemetry opt-out flag for users who don't want logging?
2. Should we add offline queuing for logs when kosuke-core is unreachable?
3. Should we implement log batching for better performance with rapid commands?
4. What should the behavior be if projectId is not found? (Currently: skip logging)
5. Should we support custom cost rates per organization/project?

---

## Timeline Estimate

- Phase 1 (Core Infrastructure): 2-3 days
- Phase 2 (Command Integration): 3-4 days
- Phase 3 (Advanced Features): 2-3 days
- Phase 4 (Testing & Documentation): 2-3 days
- Phase 5 (Optimization): 2-3 days (optional)

**Total Estimate: 9-13 days (excluding Phase 5)**

---

**Created:** 2025-11-19
**Priority:** High
**Status:** Ready for Implementation
