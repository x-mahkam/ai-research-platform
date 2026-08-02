import fs from 'fs';
import { readMph } from './MphArchive.js';

/**
 * A COMSOL Global Parameter recovered from a model file, in the shape the
 * experiment UI expects.
 */
export interface ExtractedModelParam {
  key: string;
  name: string;
  value: number | string;
  unit: string;
  group: string;
  description?: string;
}

const MAX_READ_BYTES = 64 * 1024 * 1024; // cap memory on very large .mph files
const MAX_PARAMS = 32;

// COMSOL stores parameter expressions with an explicit unit in square brackets,
// e.g. "0.7[V]", "300[K]", "1.5[um]", "25[degC]". That "<number>[<unit>]" shape
// is highly COMSOL-specific and rarely occurs by chance in binary noise, so we
// key off it and take the identifier that immediately precedes it as the name.
// Requiring the unit bracket keeps false positives low at the cost of missing
// dimensionless parameters — we prefer to miss a parameter than to invent one.
const PARAM_RE =
  /([A-Za-z][A-Za-z0-9_]{1,31})[\x00-\x20\x7f"'=:>]{0,12}(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\[([A-Za-z°%µ/^*.\d_-]{1,16})\]/g;

// COMSOL internal tag prefixes that are not user parameters; if the captured
// "name" is exactly one of these (optionally with a trailing index) skip it.
const INTERNAL_TAG = /^(comp|mod|sol|dset|pg|geom|mesh|std|tag|var|func|mat|phys|param|root|save)\d*$/i;

/**
 * Best-effort recovery of COMSOL Global Parameters from a raw .mph buffer.
 * Conservative by design: returns [] when nothing confidently matches, so the
 * caller can fall back to an empty (honest) parameter list rather than fake
 * defaults. Never throws.
 */
export function extractParametersFromMphBuffer(buf: Buffer): ExtractedModelParam[] {
  // Decode 1:1 (latin1) so byte offsets are preserved and embedded text is
  // readable whether the section is stored raw or as UTF-8.
  const text = buf.toString('latin1');
  const seen = new Set<string>();
  const out: ExtractedModelParam[] = [];

  let m: RegExpExecArray | null;
  PARAM_RE.lastIndex = 0;
  while ((m = PARAM_RE.exec(text)) !== null) {
    const name = m[1];
    const rawValue = m[2];
    const unit = m[3];
    if (INTERNAL_TAG.test(name)) continue;
    if (seen.has(name)) continue;
    // Guard against obviously implausible units (all digits, etc.).
    if (!/[A-Za-z°%µ]/.test(unit)) continue;
    seen.add(name);
    const num = Number(rawValue);
    out.push({
      key: `mph_${name}`,
      name,
      value: Number.isFinite(num) ? num : rawValue,
      unit,
      group: 'Model Parameters',
    });
    if (out.length >= MAX_PARAMS) break;
  }

  return out;
}

/**
 * Read a .mph file from disk and recover its parameters. Returns [] if the file
 * is missing, unreadable, or yields no confident matches.
 */
export function extractParametersFromMph(filePath: string): ExtractedModelParam[] {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) return [];

    // Preferred path: COMSOL 6.x .mph is a ZIP whose model XML lists the real
    // Global Parameters (<expressions name= expr= descr=>). Parse those.
    const archive = readMph(filePath);
    if (archive && archive.params.length) {
      return archive.params.map((p) => ({
        key: p.key,
        name: p.name,
        value: p.value,
        unit: p.unit || '',
        group: p.group,
        description: p.description,
      }));
    }

    // Fallback for older/binary .mph: conservative raw byte-scan.
    const size = Math.min(stat.size, MAX_READ_BYTES);
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, 0);
      return extractParametersFromMphBuffer(buf);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}
