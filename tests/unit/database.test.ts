import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PersistentDatabaseEngine } from '../../backend/database/engine.js';

const dirs: string[] = [];
function tempFileUrl(): { url: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arp-db-'));
  dirs.push(dir);
  const file = path.join(dir, 'test.db');
  return { url: `file:${file}`, file };
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('PersistentDatabaseEngine (SQLite/libSQL)', () => {
  it('inserts and reads back a record', async () => {
    const { url } = tempFileUrl();
    const db = new PersistentDatabaseEngine(url);
    await db.init();
    const inserted = db.insert('projects', { id: 'p1', title: 'Test' });
    expect(inserted.id).toBe('p1');
    expect(db.findById('projects', 'p1')).toMatchObject({ id: 'p1', title: 'Test' });
  });

  it('rejects prototype-pollution ids', async () => {
    const { url } = tempFileUrl();
    const db = new PersistentDatabaseEngine(url);
    await db.init();
    expect(() => db.insert('projects', { id: '__proto__' } as any)).toThrow();
    expect(() => db.insert('projects', { id: 'constructor' } as any)).toThrow();
    expect(({} as any).polluted).toBeUndefined();
  });

  it('persists across reopen (survives a restart)', async () => {
    const { url } = tempFileUrl();
    const db = new PersistentDatabaseEngine(url);
    await db.init();
    db.insert('projects', { id: 'p1', title: 'Persisted' });
    db.insert('experiments', { id: 'e1', title: 'Exp' });
    await db.flushPending();

    const reopened = new PersistentDatabaseEngine(url);
    await reopened.init();
    expect(reopened.findById('projects', 'p1')).toMatchObject({ id: 'p1', title: 'Persisted' });
    expect(reopened.findById('experiments', 'e1')).toMatchObject({ id: 'e1' });
  });

  it('deletes rows and the deletion persists', async () => {
    const { url } = tempFileUrl();
    const db = new PersistentDatabaseEngine(url);
    await db.init();
    db.insert('projects', { id: 'p1', title: 'ToDelete' });
    await db.flushPending();
    expect(db.delete('projects', 'p1')).toBe(true);
    await db.flushPending();

    const reopened = new PersistentDatabaseEngine(url);
    await reopened.init();
    expect(reopened.findById('projects', 'p1')).toBeUndefined();
  });

  it('seeds from a JSON baseline when the store is empty', async () => {
    const { url } = tempFileUrl();
    const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arp-seed-'));
    dirs.push(seedDir);
    const seedPath = path.join(seedDir, 'seed.json');
    fs.writeFileSync(seedPath, JSON.stringify({ projects: { 'seed-1': { id: 'seed-1', title: 'Seeded' } } }));

    const db = new PersistentDatabaseEngine(url);
    await db.init({ seedJsonPath: seedPath });
    expect(db.findById('projects', 'seed-1')).toMatchObject({ id: 'seed-1', title: 'Seeded' });

    // A second engine on the same store should NOT re-seed (store is non-empty),
    // and the seeded row is durably present.
    const reopened = new PersistentDatabaseEngine(url);
    await reopened.init({ seedJsonPath: seedPath });
    expect(reopened.find('projects').length).toBe(1);
  });
});
