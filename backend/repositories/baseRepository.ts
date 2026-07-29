import { persistentDbEngine, PersistentDatabaseEngine, IDatabaseSchema } from '../database/engine.js';

export interface IBaseRepository<T extends { id: string }> {
  findAll(predicate?: (item: T) => boolean): T[];
  findById(id: string): T | undefined;
  create(entity: T): T;
  update(id: string, updates: Partial<T>): T | undefined;
  delete(id: string): boolean;
}

export abstract class BaseRepository<T extends { id: string }> implements IBaseRepository<T> {
  constructor(
    protected collectionName: keyof IDatabaseSchema,
    protected db: PersistentDatabaseEngine = persistentDbEngine
  ) {}

  public findAll(predicate?: (item: T) => boolean): T[] {
    return this.db.find<T>(this.collectionName, predicate);
  }

  public findById(id: string): T | undefined {
    return this.db.findById<T>(this.collectionName, id);
  }

  public create(entity: T): T {
    return this.db.insert<T>(this.collectionName, entity);
  }

  public update(id: string, updates: Partial<T>): T | undefined {
    return this.db.update<T>(this.collectionName, id, updates);
  }

  public delete(id: string): boolean {
    return this.db.delete(this.collectionName, id);
  }
}
