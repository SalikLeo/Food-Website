/**
 * Salik Fast Food - Central Database Module
 * Powered by SQLite (better-sqlite3) with WAL mode for ACID compliance,
 * zero latency, concurrent transaction safety, and crash resilience.
 *
 * The legacy JSON implementation has been backed up in server/db.json-legacy.js.
 */
export { sqliteDb as db } from './sqlite.js';
