import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Loads the `.env` file from the current working directory BEFORE anything
 * reads process.env. Two deliberate choices:
 *
 * - `override: true` makes the `.env` file the authoritative source: a value
 *   you set in `.env` wins over a stray ambient/system environment variable of
 *   the same name (a common "why isn't my key being used?" trap on machines
 *   where another tool has already exported e.g. OPENAI_API_KEY).
 * - We record the resolved path and whether it exists so startup can log it —
 *   the quickest way to see *which* `.env` is actually in effect.
 *
 * On hosts with no `.env` file (e.g. Render, where config comes from the
 * dashboard) this is a no-op and the platform-provided env vars are used as-is.
 */
const envPath = path.resolve(process.cwd(), '.env');
export const envInfo = {
  path: envPath,
  exists: fs.existsSync(envPath),
};

dotenv.config({ path: envPath, override: true });
