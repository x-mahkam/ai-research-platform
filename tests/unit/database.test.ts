import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PersistentDatabaseEngine } from '../../backend/database/engine.js';

function tempDbPath(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'arp-db-')), 'database.json');
}

const created: PersistentDatabaseEngine[] = [];
function newEngine() {
  const engine = new PersistentDatabaseEngine(tempDbPath());
  created.push(engine);
  return engine;
}

afterEach(() => {
  // Flush synchronously (clears any pending debounce timer) before removing the
  // temp dir, so no late async write targets a deleted directory.
  for (const engine of created.splice(0)) {
    engine.flushSync();
    fs.rmSync(path.dirname((engine as any).dbFilePath), { recursive: true, force: true });
  }
});

describe('PersistentDatabaseEngine', () => {
  it('inserts and reads back a record', () => {
    const db = newEngine();
    const inserted = db.insert('projects', { id: 'p1', title: 'Test' });
    expect(inserted.id).toBe('p1');
    expect(db.findById('projects', 'p1')).toMatchObject({ id: 'p1', title: 'Test' });
  });

  it('rejects prototype-pollution ids', () => {
    const db = newEngine();
    expect(() => db.insert('projects', { id: '__proto__' } as any)).toThrow();
    expect(() => db.insert('projects', { id: 'constructor' } as any)).toThrow();
    // The prototype must remain unpolluted.
    expect(({} as any).polluted).toBeUndefined();
  });

  it('persists to disk asynchronously (debounced flush)', async () => {
    const db = newEngine();
    db.insert('projects', { id: 'p1', title: 'Persisted' });
    // Wait past the debounce window + async write.
    await new Promise((r) => setTimeout(r, 200));
    const reloaded = new PersistentDatabaseEngine((db as any).dbFilePath);
    expect(reloaded.findById('projects', 'p1')).toMatchObject({ id: 'p1' });
  });

  it('flushSync writes immediately', () => {
    const db = newEngine();
    db.insert('projects', { id: 'p2', title: 'SyncFlush' });
    db.flushSync();
    const reloaded = new PersistentDatabaseEngine((db as any).dbFilePath);
    expect(reloaded.findById('projects', 'p2')).toMatchObject({ id: 'p2' });
  });
});
