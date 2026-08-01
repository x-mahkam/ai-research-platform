import fs from 'fs';
import path from 'path';
import { aiProviderRegistry } from '../providers/index.js';
import { SYSTEM_PROMPT_MODEL_BUILDER } from '../prompts/index.js';
import { comsolScriptRunner, ScriptRunResult } from '../../comsol/ComsolScriptRunner.js';
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
  return code.trim();
}

/** Build the user-facing generation prompt embedding paths, diagnostics, instruction. */
export function buildGenerationPrompt(input: {
  inputModelPath: string;
  outputModelPath: string;
  instruction: string;
  diagnostics?: string;
  simulator?: string;
}): string {
  const toForward = (p: string) => p.replace(/\\/g, '/');
  return [
    `INPUT model path (load this): ${toForward(input.inputModelPath)}`,
    `OUTPUT model path (save to this): ${toForward(input.outputModelPath)}`,
    input.simulator ? `Simulator: ${input.simulator}` : '',
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
  return provider.generate({ system, prompt, maxTokens: 8000 }).then((text) => ({ text, provider: provider.id }));
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
      const prompt = buildGenerationPrompt({
        inputModelPath: absoluteInput,
        outputModelPath,
        instruction: run.instruction,
        diagnostics,
        simulator: (exp as { simulator?: string })?.simulator,
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
