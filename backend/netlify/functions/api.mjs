import serverless from 'serverless-http';
import app from '../../src/app.js';
import { migrate } from '../../src/db/migrate.js';

const handle = serverless(app);

// Migrations are idempotent; run them once per cold start, and retry on the next request if the database was unreachable.
let ready;
const ensureMigrated = () => (ready ??= migrate().catch((err) => { ready = undefined; throw err; }));

// Netlify may report either the original /api/... path or the rewritten function path.
const FUNCTION_PREFIX = '/.netlify/functions/api';

export const handler = async (event, context) => {
  await ensureMigrated();
  const path = event.path.startsWith(FUNCTION_PREFIX) ? `/api${event.path.slice(FUNCTION_PREFIX.length)}` : event.path;
  // Netlify reports the caller in this header; X-Forwarded-For is never trusted. The rate limiter keys on req.ip.
  const sourceIp = event.headers['x-nf-client-connection-ip'] ?? 'unknown';
  return handle({ ...event, path, requestContext: { identity: { sourceIp } } }, context);
};
