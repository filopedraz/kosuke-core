/**
 * BullMQ Dashboard Server
 * Standalone Express server for monitoring job queues with basic auth
 * Run: npx tsx src/dashboard.ts
 * Access: http://localhost:3001 (default admin/admin)
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
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Authentication required');
  }

  try {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const expectedUsername = process.env.BULLMQ_ADMIN_USERNAME;
    const expectedPassword = process.env.BULLMQ_ADMIN_PASSWORD;

    if (username !== expectedUsername || password !== expectedPassword) {
      res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
      return res.status(401).send('Invalid credentials');
    }

    next();
  } catch (_error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    return res.status(401).send('Authentication failed');
  }
}

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
 * Health check endpoint (no auth required)
 */
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
