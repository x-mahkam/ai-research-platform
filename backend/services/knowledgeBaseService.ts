import { knowledgeBaseRepository, IKnowledgeBaseRepository } from '../repositories/knowledgeBaseRepository.js';
import { KnowledgeBaseEntity } from '../entities/index.js';
import { generateId } from '../shared/utils.js';

export class KnowledgeBaseService {
  constructor(private repo: IKnowledgeBaseRepository = knowledgeBaseRepository) {}

  public getAll(): KnowledgeBaseEntity[] {
    return this.repo.findAll();
  }

  public search(query: string): KnowledgeBaseEntity[] {
    if (!query) return this.getAll();
    return this.repo.search(query);
  }

  public addArticle(data: Omit<KnowledgeBaseEntity, 'id'>): KnowledgeBaseEntity {
    const kb: KnowledgeBaseEntity = {
      id: generateId('kb'),
      ...data,
      createdAt: new Date().toISOString(),
    };
    return this.repo.create(kb);
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
