import { describe, it, expect } from 'vitest';
import {
  parseExpressions,
  parseModelTree,
  summarizeTree,
  readMphEntry,
  readMphModelXml,
} from '../../backend/comsol/MphArchive.js';

const SAMPLE_XML = `
<expressions T="31" name="Lg" expr="10 [nm]" descr="Gate length"></expressions>
<expressions T="31" name="Tsi" expr="9 [nm]" descr="Channel thickness"></expressions>
<expressions T="31" name="Wg" expr="tg" descr="Gate width"></expressions>
<Physics op="Semiconductor" tag="semi" name="Semiconductor" created="1">
<PhysicsFeature op="InsulatorContact" tag="ins1"></PhysicsFeature>
<PhysicsFeature op="Continuity" tag="cont1"></PhysicsFeature>
<StudyFeature op="Stationary" tag="stat" name="Stationary"></StudyFeature>
<x tag="comp1"></x>
`;

describe('parseExpressions', () => {
  it('parses name/value/unit/description and resolves references', () => {
    const params = parseExpressions(SAMPLE_XML);
    const by = Object.fromEntries(params.map((p) => [p.name, p]));
    expect(by.Lg.value).toBe(10);
    expect(by.Lg.unit).toBe('nm');
    expect(by.Lg.description).toBe('Gate length');
    // A reference expression (tg) has no unit and stays as a string.
    expect(by.Wg.value).toBe('tg');
    expect(by.Wg.unit).toBeUndefined();
  });
});

describe('parseModelTree / summarizeTree', () => {
  it('captures components, physics, feature tags and studies', () => {
    const tree = parseModelTree(SAMPLE_XML);
    expect(tree.components).toEqual(['comp1']);
    expect(tree.physics).toEqual([{ op: 'Semiconductor', tag: 'semi' }]);
    expect(tree.physicsFeatures).toContain('ins1');
    expect(tree.studies).toEqual([{ op: 'Stationary', tag: 'stat' }]);
    const text = summarizeTree(tree);
    expect(text).toMatch(/Semiconductor \(tag "semi"\)/);
    expect(text).toMatch(/Stationary \(tag "stat"\)/);
  });
});

/** Build a minimal single-entry ZIP (stored, no compression) for the reader. */
function makeStoredZip(name: string, content: string): Buffer {
  const nameBuf = Buffer.from(name, 'utf8');
  const data = Buffer.from(content, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(0, 8); // method: store
  local.writeUInt32LE(data.length, 18); // compSize
  local.writeUInt32LE(data.length, 22); // uncompSize
  local.writeUInt16LE(nameBuf.length, 26);
  const localFull = Buffer.concat([local, nameBuf, data]);

  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(0, 10); // method
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt32LE(0, 42); // local header offset
  const cdFull = Buffer.concat([cd, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8); // entries on disk
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(cdFull.length, 12); // cd size
  eocd.writeUInt32LE(localFull.length, 16); // cd offset

  return Buffer.concat([localFull, cdFull, eocd]);
}

describe('readMphEntry / readMphModelXml', () => {
  it('reads a stored zip entry by name', () => {
    const zip = makeStoredZip('dmodel.xml', SAMPLE_XML);
    const entry = readMphEntry(zip, 'dmodel.xml');
    expect(entry?.toString('utf8')).toContain('Semiconductor');
    expect(readMphEntry(zip, 'missing.xml')).toBeNull();
  });

  it('returns null for a non-zip buffer', () => {
    expect(readMphModelXml(Buffer.from('not a zip'))).toBeNull();
  });

  it('reads the model xml from a zip that has dmodel.xml', () => {
    const zip = makeStoredZip('dmodel.xml', SAMPLE_XML);
    const xml = readMphModelXml(zip);
    expect(xml).toContain('Lg');
    expect(parseExpressions(xml || '').length).toBe(3);
  });
});
