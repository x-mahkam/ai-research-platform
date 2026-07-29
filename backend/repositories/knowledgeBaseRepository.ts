import { BaseRepository } from './baseRepository.js';
import { KnowledgeBaseEntity } from '../entities/index.js';

export interface IKnowledgeBaseRepository {
  findAll(): KnowledgeBaseEntity[];
  findById(id: string): KnowledgeBaseEntity | undefined;
  search(keyword: string): KnowledgeBaseEntity[];
  create(kb: KnowledgeBaseEntity): KnowledgeBaseEntity;
}

export class KnowledgeBaseRepository extends BaseRepository<KnowledgeBaseEntity> implements IKnowledgeBaseRepository {
  constructor() {
    super('knowledgeBase');
  }

  public search(keyword: string): KnowledgeBaseEntity[] {
    const term = keyword.toLowerCase();
    return this.findAll(
      (k) =>
        k.title.toLowerCase().includes(term) ||
        k.description.toLowerCase().includes(term) ||
        k.category.toLowerCase().includes(term)
    );
  }
}

export const knowledgeBaseRepository = new KnowledgeBaseRepository();
