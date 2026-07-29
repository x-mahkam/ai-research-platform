export interface IAIMemoryEntry {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningChain?: string[];
  suggestedParameters?: Record<string, unknown>;
  timestamp: string;
}

export class AIMemoryStore {
  private sessionsMap: Map<string, IAIMemoryEntry[]> = new Map();

  public addEntry(sessionId: string, entry: Omit<IAIMemoryEntry, 'id' | 'timestamp'>): IAIMemoryEntry {
    const history = this.sessionsMap.get(sessionId) || [];
    const fullEntry: IAIMemoryEntry = {
      ...entry,
      id: `mem-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
    };

    history.push(fullEntry);
    if (history.length > 50) {
      history.shift(); // keep last 50 messages
    }

    this.sessionsMap.set(sessionId, history);
    return fullEntry;
  }

  public getSessionHistory(sessionId: string): IAIMemoryEntry[] {
    return this.sessionsMap.get(sessionId) || [];
  }

  public clearSession(sessionId: string): void {
    this.sessionsMap.delete(sessionId);
  }
}

export const aiMemoryStore = new AIMemoryStore();
