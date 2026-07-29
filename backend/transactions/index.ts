import { persistentDbEngine, PersistentDatabaseEngine, IDatabaseSchema } from '../database/engine.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('TransactionManager');

export interface ITransactionContext {
  id: string;
  stageData: Partial<IDatabaseSchema>;
  isCommitted: boolean;
  isRolledBack: boolean;
}

export class TransactionManager {
  private activeTransactions: Map<string, ITransactionContext> = new Map();

  constructor(private engine: PersistentDatabaseEngine = persistentDbEngine) {}

  public beginTransaction(): ITransactionContext {
    const id = `tx-${Math.random().toString(36).substring(7)}-${Date.now()}`;
    const context: ITransactionContext = {
      id,
      stageData: {},
      isCommitted: false,
      isRolledBack: false,
    };
    this.activeTransactions.set(id, context);
    logger.info(`Began transaction scope: ${id}`);
    return context;
  }

  public stageInsert<T extends { id: string }>(
    tx: ITransactionContext,
    collection: keyof IDatabaseSchema,
    item: T
  ): void {
    this.checkActive(tx);
    if (!tx.stageData[collection]) {
      tx.stageData[collection] = {};
    }
    tx.stageData[collection]![item.id] = item;
  }

  public commit(tx: ITransactionContext): void {
    this.checkActive(tx);

    for (const [colName, items] of Object.entries(tx.stageData)) {
      if (items) {
        for (const item of Object.values(items)) {
          this.engine.insert(colName as keyof IDatabaseSchema, item as any);
        }
      }
    }

    tx.isCommitted = true;
    this.activeTransactions.delete(tx.id);
    logger.info(`Committed transaction scope: ${tx.id}`);
  }

  public rollback(tx: ITransactionContext): void {
    this.checkActive(tx);
    tx.stageData = {};
    tx.isRolledBack = true;
    this.activeTransactions.delete(tx.id);
    logger.info(`Rolled back transaction scope: ${tx.id}`);
  }

  private checkActive(tx: ITransactionContext): void {
    if (tx.isCommitted || tx.isRolledBack) {
      throw new Error(`Transaction ${tx.id} has already been finalized.`);
    }
  }
}

export const transactionManager = new TransactionManager();
