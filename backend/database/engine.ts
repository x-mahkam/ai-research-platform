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

  constructor(customPath?: string) {
    this.dbFilePath = customPath || path.join(process.cwd(), 'storage', 'database.json');
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

  public flush(): void {
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
