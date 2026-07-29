import { BaseRepository } from './baseRepository.js';
import { AISessionEntity } from '../entities/index.js';

export interface IAISessionRepository {
  findAll(): AISessionEntity[];
  findById(id: string): AISessionEntity | undefined;
  findBySessionId(sessionId: string): AISessionEntity | undefined;
  create(session: AISessionEntity): AISessionEntity;
  appendMessage(sessionId: string, message: { role: string; content: string; timestamp: string }): AISessionEntity;
}

export class AISessionRepository extends BaseRepository<AISessionEntity> implements IAISessionRepository {
  constructor() {
    super('aiSessions');
  }

  public findBySessionId(sessionId: string): AISessionEntity | undefined {
    return this.findAll((s) => s.sessionId === sessionId)[0];
  }

  public appendMessage(
    sessionId: string,
    message: { role: string; content: string; timestamp: string }
  ): AISessionEntity {
    let session = this.findBySessionId(sessionId);
    if (!session) {
      session = this.create({
        id: `aisess-${sessionId}`,
        sessionId,
        history: [message],
        lastActive: new Date().toISOString(),
      });
    } else {
      const history = [...(session.history || []), message];
      session = this.update(session.id, {
        history,
        lastActive: new Date().toISOString(),
      })!;
    }
    return session;
  }
}

export const aiSessionRepository = new AISessionRepository();
