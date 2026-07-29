import { LoggerService } from '../logging/logger.js';
import { ExecutionNode } from './ExecutionNode.js';
import { nodeRegistry, NodeRegistry } from './NodeRegistry.js';
import { IDistributedJob, IExecutionRequest } from './types.js';

const logger = new LoggerService('ResourceScheduler');

export interface ISchedulingDecision {
  selectedNode: ExecutionNode | null;
  score: number;
  candidateCount: number;
  rejectionReasons: Record<string, string>;
}

export class ResourceScheduler {
  private registry: NodeRegistry;

  constructor(registry: NodeRegistry = nodeRegistry) {
    this.registry = registry;
  }

  /**
   * Selects the best execution node for a given request or distributed job.
   */
  public selectBestNode(request: IExecutionRequest): ISchedulingDecision {
    const requiredCores = request.requiredCores ?? 1;
    const requiredMemoryMb = request.requiredMemoryMb ?? 1024;
    const requiredGpuCount = request.requiredGpuCount ?? 0;
    const softwareType = request.softwareType;
    const pluginId = request.pluginName;
    const requiredLicenses = request.requiredLicenses;

    const allNodes = this.registry.getAllNodes();
    const rejectionReasons: Record<string, string> = {};
    const candidates: Array<{ node: ExecutionNode; score: number }> = [];

    for (const node of allNodes) {
      // Hard Constraints Verification
      if (node.state === 'Offline' || node.state === 'Maintenance' || node.state === 'Unreachable') {
        rejectionReasons[node.id] = `Node state is [${node.state}]`;
        continue;
      }

      if (node.runningJobIds.size >= node.maxConcurrentJobs) {
        rejectionReasons[node.id] = `Node reached max concurrent jobs (${node.maxConcurrentJobs})`;
        continue;
      }

      if (node.specs.availableCores < requiredCores) {
        rejectionReasons[node.id] = `Insufficient cores (available: ${node.specs.availableCores}, required: ${requiredCores})`;
        continue;
      }

      if (node.specs.availableMemoryMb < requiredMemoryMb) {
        rejectionReasons[node.id] = `Insufficient memory (available: ${node.specs.availableMemoryMb}MB, required: ${requiredMemoryMb}MB)`;
        continue;
      }

      if (requiredGpuCount > 0 && node.specs.gpuCount < requiredGpuCount) {
        rejectionReasons[node.id] = `Insufficient GPU (has: ${node.specs.gpuCount}, required: ${requiredGpuCount})`;
        continue;
      }

      if (softwareType && softwareType !== 'Generic' && !node.simulatorVersions[softwareType]) {
        rejectionReasons[node.id] = `Simulator "${softwareType}" not installed on node`;
        continue;
      }

      if (pluginId && !node.installedPlugins.includes(pluginId)) {
        rejectionReasons[node.id] = `Plugin "${pluginId}" not registered on node`;
        continue;
      }

      if (requiredLicenses) {
        let missingLicense = false;
        for (const [key, count] of Object.entries(requiredLicenses)) {
          if ((node.availableLicenses[key] || 0) < count) {
            rejectionReasons[node.id] = `Insufficient license count for "${key}" (has: ${node.availableLicenses[key] || 0}, needed: ${count})`;
            missingLicense = true;
            break;
          }
        }
        if (missingLicense) continue;
      }

      // Calculate Composite Selection Score (Higher = Better)
      const score = this.calculateNodeScore(node, requiredCores, requiredMemoryMb, requiredGpuCount);
      candidates.push({ node, score });
    }

    if (candidates.length === 0) {
      logger.warn(`ResourceScheduler found no candidate nodes for request (${request.executablePath})`);
      return {
        selectedNode: null,
        score: -1,
        candidateCount: 0,
        rejectionReasons,
      };
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    logger.info(
      `ResourceScheduler selected node [${best.node.id}] (${best.node.name}) with score ${best.score.toFixed(2)}`
    );

    return {
      selectedNode: best.node,
      score: best.score,
      candidateCount: candidates.length,
      rejectionReasons,
    };
  }

  /**
   * Scoring formula factoring load, queue, GPU affinity, and core capacity.
   */
  private calculateNodeScore(
    node: ExecutionNode,
    reqCores: number,
    reqMem: number,
    reqGpu: number
  ): number {
    let score = 100;

    // 1. Available CPU capacity weight (0 - 30 points)
    const coreRatio = node.specs.availableCores / node.specs.totalCores;
    score += coreRatio * 30;

    // 2. Available Memory ratio weight (0 - 20 points)
    const memRatio = node.specs.availableMemoryMb / node.specs.totalMemoryMb;
    score += memRatio * 20;

    // 3. Queue / Job saturation penalty (-15 points per running job)
    const jobRatio = node.runningJobIds.size / node.maxConcurrentJobs;
    score -= jobRatio * 40;

    // 4. GPU affinity bonus if job specifically requests GPU
    if (reqGpu > 0 && node.specs.gpuCount >= reqGpu) {
      score += 25;
    }

    // 5. Target preference: prefer high-performance cluster nodes for heavy core jobs
    if (reqCores >= 8 && (node.target.targetType === 'SLURM' || node.target.targetType === 'PBS' || node.target.targetType === 'SSH')) {
      score += 20;
    }

    return score;
  }
}

export const resourceScheduler = new ResourceScheduler();
