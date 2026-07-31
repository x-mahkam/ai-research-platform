import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ComsolLocator } from '../../backend/comsol/ComsolLocator.js';

// A user may set either the comsolbatch file or the folder that contains it
// (e.g. their custom D:\...\win64). The locator must always resolve to the
// actual executable FILE, never hand back a directory (which would fail to run).
describe('ComsolLocator manual path resolution', () => {
  afterEach(() => {
    ComsolLocator.setManualPath(null);
    delete process.env.COMSOL_EXECUTABLE;
  });

  it('resolves a folder to the comsolbatch executable inside it', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comsol-'));
    const win64 = path.join(dir, 'bin', 'win64');
    fs.mkdirSync(win64, { recursive: true });
    const exe = path.join(win64, 'comsolbatch.exe');
    fs.writeFileSync(exe, 'x');

    ComsolLocator.setManualPath(dir);
    expect(ComsolLocator.findExecutable()).toBe(exe);
  });

  it('accepts a direct executable file path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comsol-'));
    const exe = path.join(dir, 'comsolbatch');
    fs.writeFileSync(exe, 'x');

    ComsolLocator.setManualPath(exe);
    expect(ComsolLocator.findExecutable()).toBe(exe);
  });

  it('returns null for a folder that does not contain comsolbatch', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comsol-empty-'));
    ComsolLocator.setManualPath(dir);
    expect(ComsolLocator.findExecutable()).toBeNull();
  });
});
