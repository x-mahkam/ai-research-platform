import { randomBytes } from 'crypto';

export function generateId(prefix: string): string {
  // Date.now() alone collides when two entities are created in the same
  // millisecond; the random suffix makes IDs collision-safe.
  return `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function formatLogTimestamp(): string {
  return new Date().toLocaleTimeString();
}
