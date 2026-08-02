import fs from 'fs';
import zlib from 'zlib';

/**
 * COMSOL 6.x .mph files are ZIP archives whose model definition lives in
 * model.xml / dmodel.xml as readable XML. This module reads those entries with
 * a tiny built-in ZIP reader (no external unzip, works in the packaged app) and
 * parses the two things the platform needs: the real Global Parameters, and a
 * summary of the model tree (physics interfaces, their feature tags, studies,
 * components) so the AI can generate LiveLink code that targets real tags.
 *
 * Everything is defensive: any malformed input yields null / empty, never throws.
 */

export interface MphParam {
  key: string;
  name: string;
  value: number | string;
  unit?: string;
  description?: string;
  group: string;
}

export interface MphTree {
  components: string[];
  physics: Array<{ op: string; tag: string }>;
  physicsFeatures: string[];
  studies: Array<{ op: string; tag: string }>;
}

const ZIP_EOCD_SIG = 0x06054b50;
const ZIP_CDH_SIG = 0x02014b50;

/** Read a single named entry from an in-memory ZIP buffer, or null. */
export function readMphEntry(buf: Buffer, entryName: string): Buffer | null {
  try {
    // Locate End Of Central Directory (scan backwards; comment is usually empty).
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65536; i--) {
      if (buf.readUInt32LE(i) === ZIP_EOCD_SIG) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) return null;
    const cdOffset = buf.readUInt32LE(eocd + 16);
    const cdCount = buf.readUInt16LE(eocd + 10);

    let p = cdOffset;
    for (let n = 0; n < cdCount; n++) {
      if (p + 46 > buf.length || buf.readUInt32LE(p) !== ZIP_CDH_SIG) break;
      const method = buf.readUInt16LE(p + 10);
      const compSize = buf.readUInt32LE(p + 20);
      const nameLen = buf.readUInt16LE(p + 28);
      const extraLen = buf.readUInt16LE(p + 30);
      const commentLen = buf.readUInt16LE(p + 32);
      const localHeaderOffset = buf.readUInt32LE(p + 42);
      const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

      if (name === entryName) {
        const lh = localHeaderOffset;
        const lNameLen = buf.readUInt16LE(lh + 26);
        const lExtraLen = buf.readUInt16LE(lh + 28);
        const start = lh + 30 + lNameLen + lExtraLen;
        const data = buf.subarray(start, start + compSize);
        if (method === 0) return Buffer.from(data);
        if (method === 8) return zlib.inflateRawSync(data);
        return null; // unsupported compression
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
  } catch {
    return null;
  }
  return null;
}

/** Combined model.xml + dmodel.xml text of an .mph buffer, or null if not a zip. */
export function readMphModelXml(buf: Buffer): string | null {
  if (buf.length < 4 || buf.readUInt16LE(0) !== 0x4b50) return null; // not "PK"
  const parts: string[] = [];
  for (const entry of ['model.xml', 'dmodel.xml']) {
    const data = readMphEntry(buf, entry);
    if (data) parts.push(data.toString('utf8'));
  }
  return parts.length ? parts.join('\n') : null;
}

/** Split a COMSOL expression like "10 [nm]" into a numeric value and unit. */
function splitExpr(expr: string): { value: number | string; unit?: string } {
  const m = expr.match(/^\s*([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*\[([^\]]+)\]\s*$/);
  if (m) {
    const v = Number(m[1]);
    return { value: Number.isFinite(v) ? v : m[1], unit: m[2] };
  }
  const num = Number(expr.trim());
  if (Number.isFinite(num) && expr.trim() !== '') return { value: num };
  return { value: expr.trim() }; // an expression / reference (e.g. "tg")
}

/** Parse COMSOL Global Parameters stored as <expressions name= expr= descr=>. */
export function parseExpressions(xml: string): MphParam[] {
  const out: MphParam[] = [];
  const seen = new Set<string>();
  const re = /<expressions\b[^>]*\bname="([^"]+)"[^>]*\bexpr="([^"]*)"(?:[^>]*\bdescr="([^"]*)")?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    const { value, unit } = splitExpr(m[2] || '');
    out.push({
      key: `mph_${name}`,
      name,
      value,
      unit,
      description: m[3] || undefined,
      group: 'Model Parameters',
    });
    if (out.length >= 64) break;
  }
  return out;
}

/** Parse a compact model-tree summary (physics, features, studies, components). */
export function parseModelTree(xml: string): MphTree {
  const uniq = (arr: string[]) => Array.from(new Set(arr));
  const physics: Array<{ op: string; tag: string }> = [];
  const studies: Array<{ op: string; tag: string }> = [];

  const physRe = /<Physics\b[^>]*\bop="([^"]+)"[^>]*\btag="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = physRe.exec(xml)) !== null) physics.push({ op: m[1], tag: m[2] });

  const studyRe = /<StudyFeature\b[^>]*\bop="([^"]+)"[^>]*\btag="([^"]+)"/g;
  while ((m = studyRe.exec(xml)) !== null) studies.push({ op: m[1], tag: m[2] });

  const featRe = /<PhysicsFeature\b[^>]*\btag="([^"]+)"/g;
  const physicsFeatures: string[] = [];
  while ((m = featRe.exec(xml)) !== null) physicsFeatures.push(m[1]);

  const compRe = /\btag="(comp\d+)"/g;
  const components: string[] = [];
  while ((m = compRe.exec(xml)) !== null) components.push(m[1]);

  return {
    components: uniq(components),
    physics,
    physicsFeatures: uniq(physicsFeatures).slice(0, 40),
    studies,
  };
}

/** Render the tree as a compact text block for an AI prompt. */
export function summarizeTree(tree: MphTree): string {
  const lines: string[] = [];
  if (tree.components.length) lines.push(`Components: ${tree.components.join(', ')}`);
  if (tree.physics.length)
    lines.push(`Physics interfaces: ${tree.physics.map((p) => `${p.op} (tag "${p.tag}")`).join(', ')}`);
  if (tree.physicsFeatures.length) lines.push(`Physics feature tags: ${tree.physicsFeatures.join(', ')}`);
  if (tree.studies.length)
    lines.push(`Studies: ${tree.studies.map((s) => `${s.op} (tag "${s.tag}")`).join(', ')}`);
  return lines.join('\n');
}

export interface MphReadResult {
  params: MphParam[];
  tree: MphTree | null;
  isZip: boolean;
}

/** Read parameters + model tree from an .mph file on disk. */
export function readMph(filePath: string): MphReadResult | null {
  try {
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    const buf = fs.readFileSync(filePath);
    const xml = readMphModelXml(buf);
    if (!xml) return { params: [], tree: null, isZip: false };
    return { params: parseExpressions(xml), tree: parseModelTree(xml), isZip: true };
  } catch {
    return null;
  }
}
