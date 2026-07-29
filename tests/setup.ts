import fs from 'fs';
import os from 'os';
import path from 'path';

// Point the database at an isolated temp file so the test suite never touches
// the repo's storage/database.json. Set before any backend module is imported.
if (!process.env.ARP_DB_PATH) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arp-test-'));
  process.env.ARP_DB_PATH = path.join(dir, 'database.json');
}
