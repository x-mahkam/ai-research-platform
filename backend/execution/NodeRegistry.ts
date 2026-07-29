import { LoggerService } from '../logging/logger.js';
import { ExecutionNode } from './ExecutionNode.js';
import { NodeState, SupportedSoftware, TargetType } from './types.js';

const logger = new LoggerService('NodeRegistry');

export class NodeRegistry {
  private nodes: Map<string, ExecutionNode> = new Map();

  constructor() {
    this.registerDefaultNodes();
  }

  /**
   * Registers default execution nodes covering all target types
   */
  private registerDefaultNodes(): void {
    // 1. Local Workstation Node
    const localNode = new ExecutionNode({
      id: 'node-local-01',
      name: 'Local Workstation (Primary)',
      targetType: 'Local',
      targetConfig: { type: 'Local', workingDirectory: process.cwd() },
      specs: {
        totalCores: 16,
        availableCores: 16,
        totalMemoryMb: 65536,
        availableMemoryMb: 65536,
        gpuCount: 1,
        gpuModel: 'NVIDIA RTX 4090',
        vramMb: 24576,
        os: 'Linux',
      },
      maxConcurrentJobs: 8,
    });
    this.registerNode(localNode);

    // 2. Remote Linux Workstation (SSH)
    const sshNode = new ExecutionNode({
      id: 'node-ssh-remote-01',
      name: 'Remote Linux Compute Node (Cluster Alpha)',
      targetType: 'SSH',
      targetConfig: {
        type: 'SSH',
        host: '192.168.10.100',
        port: 22,
        username: 'researcher',
        remoteWorkingDirectory: '/opt/simulations/jobs',
      },
      specs: {
        totalCores: 64,
        availableCores: 64,
        totalMemoryMb: 262144,
        availableMemoryMb: 262144,
        gpuCount: 4,
        gpuModel: 'NVIDIA A100 80GB',
        vramMb: 327680,
        os: 'Linux',
      },
      maxConcurrentJobs: 32,
    });
    this.registerNode(sshNode);

    // 3. HPC Cluster Node (SLURM)
    const slurmNode = new ExecutionNode({
      id: 'node-slurm-hpc-01',
      name: 'SLURM Supercomputer Cluster (Partition: GPU-High)',
      targetType: 'SLURM',
      targetConfig: {
        type: 'SLURM',
        masterHost: 'slurm-head.hpc.univ.edu',
        partition: 'gpu-high',
        sbatchPath: '/usr/bin/sbatch',
        nodeCount: 16,
        timeLimit: '24:00:00',
        remoteWorkingDirectory: '/scratch/hpc/jobs',
      },
      specs: {
        totalCores: 128,
        availableCores: 128,
        totalMemoryMb: 524288,
        availableMemoryMb: 524288,
        gpuCount: 8,
        gpuModel: 'NVIDIA H100 80GB',
        vramMb: 655360,
        os: 'ClusterOS',
      },
      maxConcurrentJobs: 64,
    });
    this.registerNode(slurmNode);

    // 4. Docker Worker Node
    const dockerNode = new ExecutionNode({
      id: 'node-docker-worker-01',
      name: 'Docker Isolated Sandbox Worker',
      targetType: 'Docker',
      targetConfig: {
        type: 'Docker',
        image: 'ai-research-platform/solver-sandbox:latest',
        containerArgs: ['--rm', '-i'],
      },
      specs: {
        totalCores: 16,
        availableCores: 16,
        totalMemoryMb: 32768,
        availableMemoryMb: 32768,
        gpuCount: 0,
        os: 'Linux',
      },
      maxConcurrentJobs: 8,
    });
    this.registerNode(dockerNode);

    // 5. Kubernetes Cluster Worker Node
    const k8sNode = new ExecutionNode({
      id: 'node-k8s-worker-01',
      name: 'Kubernetes Scalable Worker Group',
      targetType: 'Kubernetes',
      targetConfig: {
        type: 'Kubernetes',
        namespace: 'scientific-simulations',
        image: 'ai-research-platform/k8s-solver:v1',
        cpuLimit: '8',
        memoryLimit: '32Gi',
      },
      specs: {
        totalCores: 32,
        availableCores: 32,
        totalMemoryMb: 131072,
        availableMemoryMb: 131072,
        gpuCount: 2,
        gpuModel: 'NVIDIA T4',
        vramMb: 32768,
        os: 'Linux',
      },
      maxConcurrentJobs: 16,
    });
    this.registerNode(k8sNode);
  }

  public registerNode(node: ExecutionNode): void {
    this.nodes.set(node.id, node);
    logger.info(`Registered execution node [${node.id}] (${node.name}, Target: ${node.target.targetType})`);
  }

  public unregisterNode(nodeId: string): boolean {
    const deleted = this.nodes.delete(nodeId);
    if (deleted) {
      logger.info(`Unregistered execution node [${nodeId}]`);
    }
    return deleted;
  }

  public getNode(nodeId: string): ExecutionNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getAllNodes(): ExecutionNode[] {
    return Array.from(this.nodes.values());
  }

  public getAvailableNodes(): ExecutionNode[] {
    return this.getAllNodes().filter(
      (node) =>
        (node.state === 'Online' || node.state === 'Idle') &&
        node.runningJobIds.size < node.maxConcurrentJobs
    );
  }

  public getNodesByTargetType(targetType: TargetType): ExecutionNode[] {
    return this.getAllNodes().filter((node) => node.target.targetType === targetType);
  }

  public findCapableNodes(
    requiredCores = 1,
    requiredMemoryMb = 1024,
    requiredGpu = 0,
    software?: SupportedSoftware,
    pluginId?: string,
    licenses?: Record<string, number>
  ): ExecutionNode[] {
    return this.getAllNodes().filter((node) =>
      node.canAcceptJob(requiredCores, requiredMemoryMb, requiredGpu, software, pluginId, licenses)
    );
  }

  public updateNodeState(nodeId: string, newState: NodeState): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.state = newState;
      logger.info(`Node [${nodeId}] state updated to [${newState}]`);
    }
  }
}

export const nodeRegistry = new NodeRegistry();
