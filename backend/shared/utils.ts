export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function formatLogTimestamp(): string {
  return new Date().toLocaleTimeString();
}
