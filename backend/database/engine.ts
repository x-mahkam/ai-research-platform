import fs from 'fs';
import path from 'path';
import { createClient, type Client } from '@libsql/client';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('PersistentDatabaseEngine');

export interface IDatabaseSchema {
  projects: Record<string, any>;
  models: Record<string, any>;
  experiments: Record<string, any>;
  simulations: Record<string, any>;
  jobs: Record<string, any>;
  plugins: Record<string, any>;
  results: Record<string, any>;
  reports: Record<string, any>;
  users: Record<string, any>;
  notifications: Record<string, any>;
  aiSessions: Record<string, any>;
  knowledgeBase: Record<string, any>;
  migrations: Record<string, any>;
}

type DirtyOp = 'upsert' | 'delete';

/**
 * SQLite-backed data store (via libSQL). Records are kept in memory for fast,
 * synchronous reads (the whole app reads collections synchronously); mutations
 * are written through to SQLite as individual rows, coalesced on a short
 * debounce. This survives restarts and — pointed at a libSQL/Turso URL via
 * DATABASE_URL — survives ephemeral hosts (e.g. Render's free tier) where a
 * local file would be wiped on each deploy.
 *
 * Storage schema is a single key/value table: kv(collection, id, data JSON).
 */
export class PersistentDatabaseEngine {
  private data: IDatabaseSchema;
  private client: Client | null = null;
  private readonly url: string;
  private readonly authToken?: string;
  private initialized = false;

  private dirty = new Map<string, DirtyOp>(); // "collection::id" -> op
  private isSaving = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(customUrl?: string) {
    // Resolution order: explicit arg -> DATABASE_URL (remote/Turso or file:) ->
    // ARP_DB_PATH (a filesystem path, used by tests) -> local storage/arp.db.
    const envUrl = process.env.DATABASE_URL;
    const dbPath = process.env.ARP_DB_PATH;
    this.url =
      customUrl ||
      envUrl ||
      (dbPath ? `file:${path.resolve(dbPath)}` : `file:${path.join(process.cwd(), 'storage', 'arp.db')}`);
    this.authToken = process.env.DATABASE_AUTH_TOKEN;
    this.data = this.createEmptySchema();
  }

  private createEmptySchema(): IDatabaseSchema {
    return {
      projects: {},
      models: {},
      experiments: {},
      simulations: {},
      jobs: {},
      plugins: {},
      results: {},
      reports: {},
      users: {},
      notifications: {},
      aiSessions: {},
      knowledgeBase: {},
      migrations: {},
    };
  }

  /**
   * Connects, ensures the schema exists, and loads all rows into memory.
   * Must be awaited before the app serves requests. Idempotent.
   */
  public async init(opts?: { seedJsonPath?: string }): Promise<void> {
    if (this.initialized) return;

    // Ensure the parent directory exists for local file URLs.
    if (this.url.startsWith('file:')) {
      const filePath = this.url.slice('file:'.length);
      const dir = path.dirname(filePath);
      if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    this.client = createClient({ url: this.url, authToken: this.authToken });
    await this.client.execute(
      'CREATE TABLE IF NOT EXISTS kv (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id))'
    );

    await this.loadAll();

    // One-time seed: if the store is empty and a JSON seed file exists, import
    // it so fresh installs / fresh remote databases start with baseline data.
    if (this.isEmpty() && opts?.seedJsonPath && fs.existsSync(opts.seedJsonPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(opts.seedJsonPath, 'utf-8'));
        this.data = { ...this.createEmptySchema(), ...parsed };
        for (const collection of Object.keys(this.data) as (keyof IDatabaseSchema)[]) {
          for (const id of Object.keys(this.data[collection] || {})) {
            this.dirty.set(`${String(collection)}::${id}`, 'upsert');
          }
        }
        await this.flushPending();
        logger.info(`Seeded database from ${opts.seedJsonPath}`);
      } catch (err: any) {
        logger.error(`Failed to seed from ${opts.seedJsonPath}: ${err.message}`);
      }
    }

    this.initialized = true;
    logger.info(`Database ready (${this.url.startsWith('file:') ? 'local file' : 'remote'} store).`);
  }

  private async loadAll(): Promise<void> {
    if (!this.client) return;
    this.data = this.createEmptySchema();
    const res = await this.client.execute('SELECT collection, id, data FROM kv');
    for (const row of res.rows) {
      const collection = String(row.collection) as keyof IDatabaseSchema;
      const id = String(row.id);
      if (!this.data[collection]) (this.data as any)[collection] = {};
      try {
        this.data[collection][id] = JSON.parse(String(row.data));
      } catch {
        // skip corrupt row rather than fail the whole load
      }
    }
  }

  private isEmpty(): boolean {
    return Object.values(this.data).every((col) => Object.keys(col).length === 0);
  }

  private markDirty(collection: keyof IDatabaseSchema, id: string, op: DirtyOp): void {
    this.dirty.set(`${String(collection)}::${id}`, op);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushPending();
    }, 50);
    // A pending flush must not, by itself, keep the process alive.
    this.flushTimer.unref?.();
  }

  /**
   * Writes all pending row changes to SQLite in a single batch. Coalesces:
   * mutations that arrive during a write are captured for the next batch.
   */
  public async flushPending(): Promise<void> {
    if (!this.client || this.isSaving || this.dirty.size === 0) return;
    this.isSaving = true;

    const batch = [...this.dirty.entries()];
    this.dirty.clear();

    const statements = batch.map(([key, op]) => {
      const sep = key.indexOf('::');
      const collection = key.slice(0, sep);
      const id = key.slice(sep + 2);
      if (op === 'delete') {
        return { sql: 'DELETE FROM kv WHERE collection = ? AND id = ?', args: [collection, id] };
      }
      const record = (this.data as any)[collection]?.[id];
      return {
        sql: 'INSERT OR REPLACE INTO kv (collection, id, data) VALUES (?, ?, ?)',
        args: [collection, id, JSON.stringify(record ?? null)],
      };
    });

    try {
      await this.client.batch(statements, 'write');
    } catch (err: any) {
      logger.error(`Failed to persist database batch: ${err.message}`);
      // Re-queue this batch so the changes are retried on the next flush.
      for (const [key, op] of batch) if (!this.dirty.has(key)) this.dirty.set(key, op);
    } finally {
      this.isSaving = false;
      if (this.dirty.size > 0) this.scheduleFlush();
    }
  }

  public getCollection<T = any>(collectionName: keyof IDatabaseSchema): Record<string, T> {
    if (!this.data[collectionName]) {
      this.data[collectionName] = {};
    }
    return this.data[collectionName] as Record<string, T>;
  }

  public find<T = any>(collectionName: keyof IDatabaseSchema, predicate?: (item: T) => boolean): T[] {
    const col = this.getCollection<T>(collectionName);
    const items = Object.values(col);
    if (!predicate) return items;
    return items.filter(predicate);
  }

  public findById<T = any>(collectionName: keyof IDatabaseSchema, id: string): T | undefined {
    const col = this.getCollection<T>(collectionName);
    return col[id];
  }

  public insert<T extends { id: string }>(collectionName: keyof IDatabaseSchema, item: T): T {
    // Collections are plain objects keyed by id — special keys would mutate the
    // object prototype instead of storing a record.
    if (typeof item.id !== 'string' || item.id === '__proto__' || item.id === 'constructor' || item.id === 'prototype') {
      throw new Error(`Invalid record id: "${item.id}"`);
    }
    const col = this.getCollection<T>(collectionName);
    const now = new Date().toISOString();
    const enriched = {
      ...item,
      createdAt: (item as any).createdAt || now,
      updatedAt: now,
    };
    col[item.id] = enriched;
    this.markDirty(collectionName, item.id, 'upsert');
    return enriched;
  }

  public update<T extends { id: string }>(
    collectionName: keyof IDatabaseSchema,
    id: string,
    updates: Partial<T>
  ): T | undefined {
    const col = this.getCollection<T>(collectionName);
    const existing = col[id];
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    col[id] = updated;
    this.markDirty(collectionName, id, 'upsert');
    return updated;
  }

  public delete(collectionName: keyof IDatabaseSchema, id: string): boolean {
    const col = this.getCollection(collectionName);
    if (col[id]) {
      delete col[id];
      this.markDirty(collectionName, id, 'delete');
      return true;
    }
    return false;
  }

  public clearCollection(collectionName: keyof IDatabaseSchema): void {
    const col = this.getCollection(collectionName);
    for (const id of Object.keys(col)) {
      this.markDirty(collectionName, id, 'delete');
    }
    this.data[collectionName] = {};
  }
}

export const persistentDbEngine = new PersistentDatabaseEngine();

// Persist any pending in-memory changes before the process exits.
let exiting = false;
const flushOnExit = async () => {
  if (exiting) return;
  exiting = true;
  try {
    await persistentDbEngine.flushPending();
  } catch {
    // best-effort on shutdown
  }
};
process.once('SIGINT', async () => {
  await flushOnExit();
  process.exit(0);
});
process.once('SIGTERM', async () => {
  await flushOnExit();
  process.exit(0);
});
process.once('beforeExit', () => {
  void flushOnExit();
});
