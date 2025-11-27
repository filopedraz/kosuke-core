/**
 * BullMQ Dashboard Server
 * Standalone Express server for monitoring job queues with basic auth
 * Run: npx tsx src/dashboard.ts
 * Access: http://localhost:3001 (with basic auth)
 *
 * Features:
 * - Real-time job queue monitoring
 * - Job history and statistics
 * - Basic auth protection
 * - Pause/resume/retry job operations
 */

import { previewQueue } from '@/lib/queue/queues/previews';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';

const app = express();
const port = parseInt(process.env.BULLMQ_DASHBOARD_PORT || '3001', 10);

/**
 * Basic auth middleware
 */
function basicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Unauthorized');
  }

  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const [rawUsername, ...passwordParts] = decoded.split(':');
    const username = rawUsername;
    const password = passwordParts.join(':');

    if (
      username === process.env.BULLMQ_ADMIN_USERNAME &&
      password === process.env.BULLMQ_ADMIN_PASSWORD
    ) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Unauthorized');
  } catch {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Unauthorized');
  }
}

/**
 * Health endpoint, no auth
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Setup BullMQ dashboard
 */
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: [new BullMQAdapter(previewQueue)],
  serverAdapter,
});

/**
 * Mount with auth
 */
app.use(basicAuth);
app.use(serverAdapter.getRouter());

/**
 * Start server
 */
const server = app.listen(port, () => {
  console.log(`[DASHBOARD] 🎛️  BullMQ Dashboard running on http://localhost:${port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[DASHBOARD] ❌ Port ${port} is already in use`);
  } else {
    console.error(`[DASHBOARD] ❌ Server error:`, err);
  }
  process.exit(1);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('[DASHBOARD] 📛 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[DASHBOARD] 📛 Shutting down gracefully...');
  process.exit(0);
});
