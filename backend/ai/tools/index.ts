import { resultManager } from '../../results/index.js';
import { workspaceManager } from '../../workspace/index.js';
import { pluginRegistry } from '../../plugins/index.js';
import { physicsKnowledgeBase } from '../knowledge/index.js';

export interface IAITool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class InspectResultsTool implements IAITool {
  public name = 'inspect_unified_results';
  public description = 'Fetches unified ARP results (metrics and vector curves) for a simulation job.';

  public async execute(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const jobId = args.jobId as string;
    if (!jobId) return { error: 'jobId is required' };

    const results = resultManager.getResultsByJob(jobId);
    if (!results) return { error: `No results found for job ${jobId}` };

    return { results };
  }
}

export class InspectWorkspaceMetricsTool implements IAITool {
  public name = 'inspect_workspace_storage';
  public description = 'Inspects workspace isolated storage metrics (size, file counts) for an experiment run.';

  public async execute(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const experimentId = args.experimentId as string;
    const runId = args.runId as string;
    if (!experimentId || !runId) return { error: 'experimentId and runId are required' };

    try {
      const metrics = workspaceManager.getStorageMetrics(experimentId, runId);
      return { metrics };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}

export class InspectPluginMetadataTool implements IAITool {
  public name = 'inspect_plugin_metadata';
  public description = 'Retrieves manifest, supported formats, and capabilities of a simulator plugin.';

  public async execute(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const pluginId = args.pluginId as string;
    if (!pluginId) return { error: 'pluginId is required' };

    try {
      const p = pluginRegistry.get(pluginId);
      return { metadata: p.metadata, status: p.status };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}

export class QueryPhysicsKnowledgeTool implements IAITool {
  public name = 'query_physics_knowledge';
  public description = 'Queries physical domain knowledge, formulas, and typical parameter values for TCAD/Quantum/Multiphysics.';

  public async execute(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const query = (args.query as string) || '';
    const results = physicsKnowledgeBase.searchKnowledge(query);
    return { topics: results };
  }
}

export class AIToolRegistry {
  private tools: Map<string, IAITool> = new Map();

  constructor() {
    this.register(new InspectResultsTool());
    this.register(new InspectWorkspaceMetricsTool());
    this.register(new InspectPluginMetadataTool());
    this.register(new QueryPhysicsKnowledgeTool());
  }

  public register(tool: IAITool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): IAITool | undefined {
    return this.tools.get(name);
  }

  public listTools(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }
}

export const aiToolRegistry = new AIToolRegistry();
