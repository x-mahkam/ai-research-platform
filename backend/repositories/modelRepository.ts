import { ModelFile } from '../shared/types.js';
import { dbStore, PersistentDataStoreAdapter } from '../database/dataStore.js';

export interface IModelRepository {
  findByProjectId(projectId: string): ModelFile[];
  findById(id: string): ModelFile | undefined;
  create(model: ModelFile): ModelFile;
  update(id: string, updates: Partial<ModelFile>): ModelFile | undefined;
  delete(id: string): boolean;
}

export class ModelRepository implements IModelRepository {
  constructor(private store: PersistentDataStoreAdapter = dbStore) {}

  public findByProjectId(projectId: string): ModelFile[] {
    return this.store.getModels(projectId);
  }

  public findById(id: string): ModelFile | undefined {
    return this.store.getModelById(id);
  }

  public create(model: ModelFile): ModelFile {
    return this.store.addModel(model);
  }

  public update(id: string, updates: Partial<ModelFile>): ModelFile | undefined {
    return this.store.updateModel(id, updates);
  }

  public delete(id: string): boolean {
    return this.store.deleteModel(id);
  }
}

export const modelRepository = new ModelRepository();
