import { LoggerService } from '../logging/logger.js';
import { ExecutionNode } from './ExecutionNode.js';
import { nodeRegistry, NodeRegistry } from './NodeRegistry.js';
import { NodeState } from './types.js';

const logger = new LoggerService('NodeHealthMonitor');

export class NodeHealthMonitor {
  private registry: NodeRegistry;
  private monitorTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutMs: number = 60000; // 60 seconds

  constructor(registry: NodeRegistry = nodeRegistry) {
    this.registry = registry;
  }

  public startMonitoring(intervalMs = 15000): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }

    logger.info(`Starting NodeHealthMonitor (interval: ${intervalMs}ms)`);
    this.monitorTimer = setInterval(async () => {
      await this.checkAllNodesHealth();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
      logger.info('Stopped NodeHealthMonitor');
    }
  }

  public async checkAllNodesHealth(): Promise<Record<string, NodeState>> {
    const results: Record<string, NodeState> = {};
    const nodes = this.registry.getAllNodes();

    for (const node of nodes) {
      const state = await this.checkNodeHealth(node);
      results[node.id] = state;
    }

    return results;
  }

  public async checkNodeHealth(node: ExecutionNode): Promise<NodeState> {
    const now = new Date().getTime();
    const lastBeat = new Date(node.lastHeartbeat).getTime();

    // 1. Check for Maintenance override
    if (node.state === 'Maintenance') {
      return 'Maintenance';
    }

    // 2. Check for Heartbeat Stale (Unreachable / Offline)
    if (now - lastBeat > this.heartbeatTimeoutMs) {
      if (node.state !== 'Unreachable' && node.state !== 'Offline') {
        logger.warn(`Node [${node.id}] (${node.name}) missed heartbeat. Transitioning to Unreachable.`);
        node.state = 'Unreachable';
      }
      return node.state;
    }

    // 3. Refresh simulated or real local heartbeat
    node.updateHeartbeat();

    // 4. Determine state based on capacity and usage
    if (node.runningJobIds.size >= node.maxConcurrentJobs || node.specs.availableCores <= 0) {
      node.state = 'Busy';
    } else if (node.runningJobIds.size === 0) {
      node.state = 'Idle';
    } else {
      node.state = 'Online';
    }

    return node.state;
  }

  public setMaintenanceMode(nodeId: string, inMaintenance: boolean): boolean {
    const node = this.registry.getNode(nodeId);
    if (!node) return false;

    if (inMaintenance) {
      node.state = 'Maintenance';
      logger.info(`Node [${nodeId}] placed into Maintenance mode.`);
    } else {
      node.state = 'Online';
      logger.info(`Node [${nodeId}] removed from Maintenance mode.`);
    }
    return true;
  }
}

export const nodeHealthMonitor = new NodeHealthMonitor();
