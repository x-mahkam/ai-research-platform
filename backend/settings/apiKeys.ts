import fs from 'fs';
import { envInfo } from '../env.js';
import { PROVIDER_ENV_KEYS } from '../configuration/index.js';
import { aiProviderRegistry } from '../ai/providers/index.js';
import { ComsolLocator } from '../comsol/ComsolLocator.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ApiKeySettings');

/** Insert or replace `KEY="value"` lines in a .env file, preserving the rest. */
function upsertEnvFile(filePath: string, entries: Record<string, string>): void {
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    content = '';
  }
  const lines = content.length ? content.split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(entries)) {
    const assignment = `${key}="${value}"`;
    const re = new RegExp(`^\\s*#?\\s*${key}\\s*=`);
    const idx = lines.findIndex((l) => re.test(l));
    if (idx >= 0) lines[idx] = assignment;
    else lines.push(assignment);
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

/**
 * Set provider API keys at runtime: update process.env, persist to the .env
 * file in effect, and rebuild the provider registry so the change takes effect
 * immediately (no restart). Empty values are ignored (won't wipe a key).
 */
export function updateProviderKeys(keys: Record<string, string>): void {
  const entries: Record<string, string> = {};
  for (const [providerId, rawValue] of Object.entries(keys)) {
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!value) continue;
    const envVar = PROVIDER_ENV_KEYS[providerId];
    if (!envVar) continue;
    process.env[envVar] = value;
    entries[envVar] = value;
  }

  if (Object.keys(entries).length === 0) return;

  try {
    upsertEnvFile(envInfo.path, entries);
    logger.info(`Saved ${Object.keys(entries).length} provider key(s) to ${envInfo.path}`);
  } catch (err: any) {
    // Even if the file write fails (read-only disk, etc.), the in-memory keys
    // are already set for this session.
    logger.error(`Could not persist keys to ${envInfo.path}: ${err.message}`);
  }

  aiProviderRegistry.reload();
}

/** Whether a COMSOL executable is currently resolvable, and its path. */
export function getComsolStatus(): { configured: boolean; path?: string } {
  try {
    const p = ComsolLocator.findExecutable();
    return { configured: Boolean(p), path: p || undefined };
  } catch {
    return { configured: false };
  }
}

/**
 * Point the platform at comsolbatch (a file or its folder). Applies live
 * (ComsolLocator reads COMSOL_EXECUTABLE each time it resolves) and persists to
 * the .env in effect. COMSOL itself does NOT need to be open — the platform
 * launches comsolbatch headlessly.
 */
export function updateComsolPath(execPath: string): { configured: boolean; path?: string } {
  const value = typeof execPath === 'string' ? execPath.trim() : '';
  if (value) {
    process.env.COMSOL_EXECUTABLE = value;
    ComsolLocator.setManualPath(value);
    try {
      upsertEnvFile(envInfo.path, { COMSOL_EXECUTABLE: value });
      logger.info(`Saved COMSOL_EXECUTABLE to ${envInfo.path}`);
    } catch (err: any) {
      logger.error(`Could not persist COMSOL path to ${envInfo.path}: ${err.message}`);
    }
  }
  return getComsolStatus();
}
