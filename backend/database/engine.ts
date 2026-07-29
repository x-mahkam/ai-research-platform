import fs from 'fs';
import path from 'path';
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

export class PersistentDatabaseEngine {
  private dbFilePath: string;
  private data: IDatabaseSchema;
  private isSaving = false;
  private dirty = false;
  private pendingAgain = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(customPath?: string) {
    // ARP_DB_PATH lets tests point the store at an isolated temp file.
    this.dbFilePath =
      customPath || process.env.ARP_DB_PATH || path.join(process.cwd(), 'storage', 'database.json');
    this.data = this.createEmptySchema();
    this.initializeStorage();
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

  private initializeStorage(): void {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.createEmptySchema(), ...parsed };
        logger.info(`Loaded persistent database from file: ${this.dbFilePath}`);
      } else {
        this.saveToDiskSync();
        logger.info(`Initialized fresh database storage file: ${this.dbFilePath}`);
      }
    } catch (err: any) {
      logger.error(`Failed to load database file (${err.message}). Initializing fallback in-memory schema.`);
      this.data = this.createEmptySchema();
    }
  }

  private saveToDiskSync(): void {
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err: any) {
      logger.error(`Failed to flush database to disk: ${err.message}`);
    }
  }

  // Async, non-blocking persist. A full-database writeFileSync on every single
  // mutation blocks the event loop — under a running simulation (status
  // transitions + 2s telemetry log appends across multiple jobs) the storm of
  // synchronous full-file rewrites froze the server. Writes are coalesced: a
  // burst of mutations results in a single disk write, and any mutation that
  // arrives mid-write triggers exactly one more write afterwards.
  private async saveToDiskAsync(): Promise<void> {
    if (this.isSaving) {
      this.pendingAgain = true;
      return;
    }
    this.isSaving = true;
    this.dirty = false;
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.promises.rename(tempPath, this.dbFilePath);
    } catch (err: any) {
      logger.error(`Failed to flush database to disk: ${err.message}`);
      this.dirty = true;
    } finally {
      this.isSaving = false;
      if (this.pendingAgain || this.dirty) {
        this.pendingAgain = false;
        void this.saveToDiskAsync();
      }
    }
  }

  public flush(): void {
    // Debounce rapid mutations into a single asynchronous write.
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.saveToDiskAsync();
    }, 50);
    // A pending flush must not, by itself, keep the process alive — the
    // beforeExit/SIGINT handlers flush synchronously on shutdown.
    this.flushTimer.unref?.();
  }

  // Synchronous flush for process shutdown, where the event loop is ending and
  // pending async writes would not complete.
  public flushSync(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.saveToDiskSync();
  }

  public getCollection<T = any>(collectionName: keyof IDatabaseSchema): Record<string, T> {
    if (!this.data[collectionName]) {
      this.data[collectionName] = {};
    }
    return this.data[collectionName] as Record<string, T>;
  }

  public find<T = any>(
    collectionName: keyof IDatabaseSchema,
    predicate?: (item: T) => boolean
  ): T[] {
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
    this.flush();
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
    this.flush();
    return updated;
  }

  public delete(collectionName: keyof IDatabaseSchema, id: string): boolean {
    const col = this.getCollection(collectionName);
    if (col[id]) {
      delete col[id];
      this.flush();
      return true;
    }
    return false;
  }

  public clearCollection(collectionName: keyof IDatabaseSchema): void {
    this.data[collectionName] = {};
    this.flush();
  }
}

export const persistentDbEngine = new PersistentDatabaseEngine();

// Persist any pending in-memory changes synchronously before the process exits.
const flushOnExit = () => {
  try {
    persistentDbEngine.flushSync();
  } catch {
    // best-effort on shutdown
  }
};
process.once('SIGINT', () => {
  flushOnExit();
  process.exit(0);
});
process.once('SIGTERM', () => {
  flushOnExit();
  process.exit(0);
});
process.once('beforeExit', flushOnExit);
