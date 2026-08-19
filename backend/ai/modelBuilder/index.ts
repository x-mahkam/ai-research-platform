import fs from 'fs';
import path from 'path';
import { aiProviderRegistry } from '../providers/index.js';
import { SYSTEM_PROMPT_MODEL_BUILDER } from '../prompts/index.js';
import { comsolScriptRunner, ScriptRunResult } from '../../comsol/ComsolScriptRunner.js';
import { readMph, summarizeTree } from '../../comsol/MphArchive.js';
import { experimentRepository } from '../../repositories/experimentRepository.js';
import { modelRepository } from '../../repositories/modelRepository.js';
import { LoggerService } from '../../logging/logger.js';
import { generateId, getCurrentTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('ModelRebuild');

/**
 * Strip Markdown code fences / stray prose a model might wrap around code, and
 * return just the Java source. Defensive: if no fence is present, trims and
 * returns as-is.
 */
export function extractJavaSource(raw: string): string {
  if (!raw) return '';
  const fence = raw.match(/```(?:java)?\s*([\s\S]*?)```/i);
  let code = fence ? fence[1] : raw;
  // Drop anything before the first import/class if the model added a preamble.
  const start = code.search(/(^|\n)\s*(import\s|public\s+class\s|class\s+Model\b)/);
  if (start > 0) code = code.slice(start);
  return sanitizeJavaSource(code.trim());
}

/**
 * comsolcompile is a plain Java compiler and chokes on non-ASCII bytes (they
 * showed up as replacement characters and broke a string literal). Normalize
 * the few common typographic offenders to ASCII and drop any remaining
 * non-ASCII — valid COMSOL model code is pure ASCII, so this only removes
 * accidental smart quotes / foreign-language comment text.
 */
export function sanitizeJavaSource(code: string): string {
  return code
    .replace(/[‘’‛′]/g, "'") // curly single quotes / prime
    .replace(/[“”‟″]/g, '"') // curly double quotes
    .replace(/[–—−]/g, '-') // en/em dash, minus
    .replace(/…/g, '...') // ellipsis
    .replace(/ /g, ' ') // non-breaking space
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\x7F]/g, ''); // drop anything else non-ASCII
}

/** Heuristic: does the source look complete (balanced braces, ends with })? */
export function looksTruncated(code: string): boolean {
  if (!code) return true;
  const opens = (code.match(/\{/g) || []).length;
  const closes = (code.match(/\}/g) || []).length;
  if (opens !== closes) return true;
  return !/}\s*$/.test(code);
}

/** Build the user-facing generation prompt embedding paths, diagnostics, instruction. */
export function buildGenerationPrompt(input: {
  inputModelPath: string;
  outputModelPath: string;
  instruction: string;
  diagnostics?: string;
  simulator?: string;
  modelTree?: string;
}): string {
  const toForward = (p: string) => p.replace(/\\/g, '/');
  return [
    `INPUT model path (load this): ${toForward(input.inputModelPath)}`,
    `OUTPUT model path (save to this): ${toForward(input.outputModelPath)}`,
    input.simulator ? `Simulator: ${input.simulator}` : '',
    input.modelTree
      ? `\nExisting model tree (use these EXACT tags when referencing existing nodes; create new tags for new nodes):\n${input.modelTree}`
      : '',
    input.diagnostics ? `\nWhat is wrong / solver diagnostics:\n${input.diagnostics}` : '',
    `\nRequested fix / instruction:\n${input.instruction}`,
    `\nGenerate the complete COMSOL Java model file (class Model) that loads the INPUT, applies this fix, solves, and saves to OUTPUT.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface RebuildRun {
  id: string;
  experimentId: string;
  status: 'generating' | 'building' | 'completed' | 'failed';
  instruction: string;
  provider?: string;
  javaSource?: string;
  outputModelPath?: string;
  compileLog?: string;
  runLog?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartRebuildInput {
  experimentId: string;
  instruction: string;
  providers?: string[];
}

export interface RebuildDeps {
  /** Ask a provider to produce the Java model source. */
  generate: (system: string, prompt: string, providers?: string[]) => Promise<{ text: string; provider: string }>;
  /** Compile + run the Java script into a new .mph. */
  runScript: (java: string, workspacePath: string, inputModelPath: string, outputModelPath: string) => Promise<ScriptRunResult>;
}

function defaultGenerate(system: string, prompt: string, providers?: string[]) {
  const selected = aiProviderRegistry.resolveSelection(providers);
  if (!selected.length) {
    return Promise.reject(new Error('No AI provider is configured to generate the model script.'));
  }
  const provider = selected[0];
  // Model-build scripts are long; a small cap truncates them mid-string and
  // the compile fails on an unterminated literal. Give plenty of room.
  return provider.generate({ system, prompt, maxTokens: 16000 }).then((text) => ({ text, provider: provider.id }));
}

async function defaultRunScript(
  java: string,
  workspacePath: string,
  _inputModelPath: string,
  outputModelPath: string
): Promise<ScriptRunResult> {
  fs.mkdirSync(workspacePath, { recursive: true });
  fs.mkdirSync(path.dirname(outputModelPath), { recursive: true });
  // COMSOL requires the public class name to match the file name.
  const javaFilePath = path.join(workspacePath, 'Model.java');
  fs.writeFileSync(javaFilePath, java, 'utf-8');
  return comsolScriptRunner.run({ javaFilePath, workspacePath, outputModelPath });
}

export class ModelRebuildService {
  private runs = new Map<string, RebuildRun>();

  constructor(
    private deps: RebuildDeps = { generate: defaultGenerate, runScript: defaultRunScript }
  ) {}

  public start(input: StartRebuildInput): RebuildRun {
    const exp = experimentRepository.findById(input.experimentId);
    if (!exp) throw new Error(`Experiment "${input.experimentId}" not found.`);
    if (!input.instruction || !input.instruction.trim()) {
      throw new Error('An instruction describing the fix is required.');
    }
    const now = getCurrentTimestamp();
    const run: RebuildRun = {
      id: generateId('rebuild'),
      experimentId: input.experimentId,
      status: 'generating',
      instruction: input.instruction.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.id, run);
    // Bound the store so it can't grow without limit over the process lifetime.
    if (this.runs.size > 100) {
      const oldest = this.runs.keys().next().value;
      if (oldest) this.runs.delete(oldest);
    }
    void this.execute(run.id, input.providers);
    return run;
  }

  public getStatus(id: string): RebuildRun | undefined {
    return this.runs.get(id);
  }

  private touch(run: RebuildRun) {
    run.updatedAt = getCurrentTimestamp();
    this.runs.set(run.id, run);
  }

  private async execute(id: string, providers?: string[]): Promise<void> {
    const run = this.runs.get(id);
    if (!run) return;
    try {
      const exp = experimentRepository.findById(run.experimentId);
      // Resolve the real input .mph from the experiment's linked model.
      const absoluteInput = resolveInputModelPath(run.experimentId);
      if (!absoluteInput) {
        run.status = 'failed';
        run.error = 'Could not locate the experiment’s model (.mph) file on disk.';
        this.touch(run);
        return;
      }
      const workspacePath = path.join(path.dirname(absoluteInput), `rebuild-${run.id}`);
      const outputModelPath = path.join(workspacePath, 'output', 'rebuilt_model.mph');

      const diagnostics = extractDiagnostics(exp);
      // Give the AI the real model tree (physics/feature/study tags) so it
      // targets existing nodes correctly instead of guessing.
      const archive = readMph(absoluteInput);
      const modelTree = archive?.tree ? summarizeTree(archive.tree) : undefined;
      const prompt = buildGenerationPrompt({
        inputModelPath: absoluteInput,
        outputModelPath,
        instruction: run.instruction,
        diagnostics,
        simulator: (exp as { simulator?: string })?.simulator,
        modelTree,
      });

      const gen = await this.deps.generate(SYSTEM_PROMPT_MODEL_BUILDER, prompt, providers);
      run.provider = gen.provider;
      run.javaSource = extractJavaSource(gen.text);
      run.status = 'building';
      this.touch(run);

      if (!run.javaSource || !/class\s+Model\b/.test(run.javaSource)) {
        run.status = 'failed';
        run.error = 'The AI did not return a valid COMSOL Java model (class Model).';
        this.touch(run);
        return;
      }
      if (looksTruncated(run.javaSource)) {
        run.status = 'failed';
        run.error = 'The generated model script looks truncated (unbalanced braces). Try again — the model may need a shorter, more focused instruction.';
        this.touch(run);
        return;
      }

      const result = await this.deps.runScript(run.javaSource, workspacePath, absoluteInput, outputModelPath);
      run.compileLog = result.compileLog;
      run.runLog = result.runLog;
      if (result.success) {
        run.status = 'completed';
        run.outputModelPath = result.outputModelPath;
      } else {
        run.status = 'failed';
        run.error = result.error;
      }
      this.touch(run);
      logger.info(`Model rebuild ${id} finished: ${run.status}`);
    } catch (err) {
      run.status = 'failed';
      run.error = (err as Error).message;
      this.touch(run);
    }
  }
}

/** Find the experiment's model .mph absolute path, if it exists on disk. */
export function resolveInputModelPath(experimentId: string): string | null {
  const exp = experimentRepository.findById(experimentId) as unknown as { modelId?: string } | undefined;
  if (!exp?.modelId) return null;
  try {
    const model = modelRepository.findById(exp.modelId) as { absolutePath?: string } | undefined;
    const p = model?.absolutePath;
    if (p && /\.mph$/i.test(p) && fs.existsSync(p)) return p;
  } catch {
    // ignore
  }
  return null;
}

function extractDiagnostics(exp: unknown): string | undefined {
  const results = (exp as { results?: { diagnostics?: Record<string, unknown>; summary?: string } })?.results;
  if (!results) return undefined;
  const diag = results.diagnostics;
  const parts: string[] = [];
  if (results.summary) parts.push(String(results.summary));
  if (diag?.warnings && Array.isArray(diag.warnings)) parts.push(`Warnings: ${(diag.warnings as string[]).slice(0, 10).join('; ')}`);
  if (diag?.errors && Array.isArray(diag.errors)) parts.push(`Errors: ${(diag.errors as string[]).slice(0, 10).join('; ')}`);
  if (typeof diag?.converged === 'boolean') parts.push(`Converged: ${diag.converged}`);
  return parts.length ? parts.join('\n') : undefined;
}

export const modelRebuildService = new ModelRebuildService();
