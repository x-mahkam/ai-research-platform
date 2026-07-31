import fs from 'fs';
import path from 'path';

/**
 * Structured, human/AI-readable summary distilled from a COMSOL batch run's
 * solver output. comsolbatch writes a lot of text to stdout/stderr; on its own
 * that is opaque to the AI layer, so we parse the parts that matter (convergence,
 * degrees of freedom, solution time, computed values, warnings/errors) into
 * fields the AI context aggregator can hand to the model verbatim.
 */
export interface ComsolExtractedResults {
  /** Flat key→value metrics (DOF, solution time, memory, computed globals). */
  metrics: Record<string, string | number>;
  /** Convergence verdict inferred from the log. */
  converged: boolean | null;
  /** Study / study-step names the solver reported running. */
  studySteps: string[];
  /** Solver warning lines (deduped, capped). */
  warnings: string[];
  /** Solver error lines (deduped, capped). */
  errors: string[];
  /** Named table/probe/global-evaluation values pulled from the log. */
  computedValues: Array<{ name: string; value: string; unit?: string }>;
  /** Tail of the raw solver log, so the AI can read the actual output. */
  logTail: string;
  /** Any result tables COMSOL exported into the workspace (bounded preview). */
  exportedTables: Array<{ file: string; preview: string }>;
}

const MAX_WARNINGS = 40;
const MAX_ERRORS = 40;
const MAX_VALUES = 60;
const MAX_LOG_TAIL_LINES = 120;
const MAX_TABLE_PREVIEW_BYTES = 4000;

function dedupeCap(lines: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= cap) break;
  }
  return out;
}

function lastMatch(text: string, re: RegExp): RegExpMatchArray | null {
  let m: RegExpExecArray | null;
  let last: RegExpMatchArray | null = null;
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = global.exec(text)) !== null) {
    last = m;
    if (m.index === global.lastIndex) global.lastIndex++;
  }
  return last;
}

/**
 * Parse the combined COMSOL solver log (stdout + stderr) into structured fields.
 * Purely defensive: any unparsable input yields empty/neutral fields, never throws.
 */
export function extractFromLog(stdout: string, stderr: string): ComsolExtractedResults {
  const stdoutText = stdout || '';
  const stderrText = stderr || '';
  const combined = `${stdoutText}\n${stderrText}`;
  const lines = combined.split(/\r?\n/);

  const metrics: Record<string, string | number> = {};
  const computedValues: Array<{ name: string; value: string; unit?: string }> = [];

  // --- Degrees of freedom ---
  const dof = lastMatch(combined, /Number of degrees of freedom solved for:\s*([\d,]+)/i);
  if (dof) metrics['Degrees of freedom'] = Number(dof[1].replace(/,/g, '')) || dof[1];

  // --- Solution time (COMSOL prints "Solution time: 42 s") ---
  const solTimes: number[] = [];
  const solRe = /Solution time(?:\s*\(.*?\))?:\s*([\d.]+)\s*s/gi;
  let sm: RegExpExecArray | null;
  while ((sm = solRe.exec(combined)) !== null) {
    const v = Number(sm[1]);
    if (!Number.isNaN(v)) solTimes.push(v);
  }
  if (solTimes.length) {
    metrics['Solver solution time (s)'] = solTimes.reduce((a, b) => a + b, 0);
  }

  // --- Peak memory ---
  const mem = lastMatch(combined, /(?:Physical|Peak) memory:\s*([\d.]+)\s*(MB|GB)/i);
  if (mem) metrics['Peak memory'] = `${mem[1]} ${mem[2]}`;

  // --- Study / study steps ---
  const studySteps = dedupeCap(
    lines
      .filter((l) => /^\s*Running:?\s+/i.test(l) || /Compil\w+ equations/i.test(l) || /^\s*Study\s+\d+/i.test(l))
      .map((l) => l.trim()),
    20
  );

  // --- Convergence verdict ---
  const notConverged = /did not converge|failed to converge|no convergence|solver failed/i.test(combined);
  const converged = /solution converged|converged\b/i.test(combined) && !notConverged
    ? true
    : notConverged
    ? false
    : null;
  if (converged !== null) metrics['Converged'] = converged ? 'yes' : 'no';

  // --- Global evaluation / derived-value table lines ---
  // COMSOL global evaluations often print as "  name (unit)  value" or "name = value unit".
  const valRe = /^\s*([A-Za-z][\w.()/%\- ]{0,40}?)\s*[=:]\s*([-+]?[\d.eE]+)\s*([A-Za-z°%/^*·]+)?\s*$/;
  for (const l of lines) {
    const m = l.match(valRe);
    if (m && /[\d]/.test(m[2])) {
      const name = m[1].trim();
      // Skip obvious log-noise keys.
      if (/^(exit code|duration|arguments?|executable|time|memory)$/i.test(name)) continue;
      computedValues.push({ name, value: m[2].trim(), unit: m[3]?.trim() });
      if (computedValues.length >= MAX_VALUES) break;
    }
  }

  // --- Warnings & errors ---
  const warnings = dedupeCap(
    lines.filter((l) => /\bwarning\b/i.test(l)),
    MAX_WARNINGS
  );
  const errors = dedupeCap(
    [
      ...lines.filter((l) => /\berror\b|\bexception\b|\bfailed\b/i.test(l)),
      ...stderrText.split(/\r?\n/).filter((l) => l.trim()),
    ],
    MAX_ERRORS
  );

  // --- Log tail ---
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const logTail = nonEmpty.slice(-MAX_LOG_TAIL_LINES).join('\n');

  return {
    metrics,
    converged,
    studySteps,
    warnings,
    errors,
    computedValues,
    logTail,
    exportedTables: [],
  };
}

/**
 * Look for tabular result files COMSOL may have exported into the workspace
 * (output/reports dirs) and attach a bounded text preview of each. These hold
 * the actual computed physics (probe tables, global evaluations exported to
 * .txt/.csv/.dat), which is the data the user wants the AI to read.
 */
export function collectExportedTables(workspacePath: string): Array<{ file: string; preview: string }> {
  const out: Array<{ file: string; preview: string }> = [];
  const dirs = [path.join(workspacePath, 'output'), path.join(workspacePath, 'reports')];
  const tableExt = new Set(['.txt', '.csv', '.dat', '.tsv']);

  for (const dir of dirs) {
    let entries: string[];
    try {
      if (!fs.existsSync(dir)) continue;
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const ext = path.extname(name).toLowerCase();
      if (!tableExt.has(ext)) continue;
      const full = path.join(dir, name);
      try {
        const stat = fs.statSync(full);
        if (!stat.isFile() || stat.size === 0) continue;
        const fd = fs.openSync(full, 'r');
        const buf = Buffer.alloc(Math.min(MAX_TABLE_PREVIEW_BYTES, stat.size));
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        let preview = buf.toString('utf-8');
        if (stat.size > buf.length) preview += `\n... (truncated, ${stat.size} bytes total)`;
        out.push({ file: name, preview });
      } catch {
        // ignore unreadable file
      }
      if (out.length >= 10) return out;
    }
  }
  return out;
}
