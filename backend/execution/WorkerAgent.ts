import { commandExecutor } from './CommandExecutor.js';
import { ExecutionNode } from './ExecutionNode.js';
import {
  IDockerTargetConfig,
  IKubernetesTargetConfig,
  IPbsTargetConfig,
  ISlurmTargetConfig,
  ISSHTargetConfig,
} from './ExecutionTarget.js';
import { LoggerService } from '../logging/logger.js';
import { IExecutionRequest, IExecutionResult, TargetType } from './types.js';

const logger = new LoggerService('WorkerAgent');

export class WorkerAgent {
  /**
   * Executes a simulation request on a target execution node.
   */
  public async execute(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string
  ): Promise<IExecutionResult> {
    const startTime = new Date();
    const startIso = startTime.toISOString();

    logger.info(
      `WorkerAgent dispatching Job [${jobId}] to Node [${node.id}] (${node.name}, Target: ${node.target.targetType})`
    );

    switch (node.target.targetType) {
      case 'Local':
        return this.executeLocal(node, request, jobId, startIso);

      case 'SSH':
        return this.executeSSH(node, request, jobId, startIso);

      case 'SLURM':
        return this.executeSlurm(node, request, jobId, startIso);

      case 'PBS':
        return this.executePbs(node, request, jobId, startIso);

      case 'Docker':
        return this.executeDocker(node, request, jobId, startIso);

      case 'Kubernetes':
        return this.executeKubernetes(node, request, jobId, startIso);

      case 'Cloud':
        return this.executeCloud(node, request, jobId, startIso);

      default:
        return this.executeLocal(node, request, jobId, startIso);
    }
  }

  private async executeLocal(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const result = await commandExecutor.execute(request);
    return {
      ...result,
      executedOnNodeId: node.id,
    };
  }

  private async executeSSH(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const cfg = node.target.config as ISSHTargetConfig;
    const args = (request.arguments || []).join(' ');
    const remoteCmd = `ssh -p ${cfg.port || 22} ${cfg.username}@${cfg.host} "cd ${cfg.remoteWorkingDirectory || '/tmp'} && ${request.executablePath} ${args}"`;

    logger.info(`SSH Execution Command: ${remoteCmd}`);

    // Delegate execution to CommandExecutor wrapping SSH command execution
    const sshRequest: IExecutionRequest = {
      executablePath: 'ssh',
      arguments: [
        '-p',
        String(cfg.port || 22),
        '-o',
        'StrictHostKeyChecking=no',
        `${cfg.username}@${cfg.host}`,
        `cd ${cfg.remoteWorkingDirectory || '/tmp'} && ${request.executablePath} ${args}`,
      ],
      workingDirectory: request.workingDirectory,
      timeoutMs: request.timeoutMs || 3600000,
    };

    const res = await commandExecutor.execute(sshRequest);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }

  private async executeSlurm(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const cfg = node.target.config as ISlurmTargetConfig;
    const sbatchArgs = [
      `--partition=${cfg.partition || 'default'}`,
      `--job-name=${jobId}`,
      `--nodes=1`,
      `--ntasks-per-node=${request.requiredCores || 4}`,
      `--time=${cfg.timeLimit || '02:00:00'}`,
      `--wrap="${request.executablePath} ${(request.arguments || []).join(' ')}"`,
    ];

    logger.info(`SLURM Batch Submission: sbatch ${sbatchArgs.join(' ')}`);

    const slurmRequest: IExecutionRequest = {
      executablePath: cfg.sbatchPath || 'sbatch',
      arguments: sbatchArgs,
      workingDirectory: request.workingDirectory,
      timeoutMs: request.timeoutMs || 3600000,
    };

    const res = await commandExecutor.execute(slurmRequest);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }

  private async executePbs(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const cfg = node.target.config as IPbsTargetConfig;
    const qsubArgs = [
      `-q`,
      cfg.queue || 'batch',
      `-N`,
      jobId,
      `-l`,
      `nodes=1:ppn=${request.requiredCores || 4},walltime=${cfg.walltime || '02:00:00'}`,
      `--`,
      request.executablePath,
      ...(request.arguments || []),
    ];

    logger.info(`PBS Job Submission: qsub ${qsubArgs.join(' ')}`);

    const pbsRequest: IExecutionRequest = {
      executablePath: cfg.qsubPath || 'qsub',
      arguments: qsubArgs,
      workingDirectory: request.workingDirectory,
      timeoutMs: request.timeoutMs || 3600000,
    };

    const res = await commandExecutor.execute(pbsRequest);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }

  private async executeDocker(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const cfg = node.target.config as IDockerTargetConfig;
    const dockerArgs = [
      'run',
      '--rm',
      '-v',
      `${request.workingDirectory}:/workspace`,
      '-w',
      '/workspace',
      cfg.image || 'ai-research-platform/solver-sandbox:latest',
      request.executablePath,
      ...(request.arguments || []),
    ];

    logger.info(`Docker Sandbox Execution: docker ${dockerArgs.join(' ')}`);

    const dockerRequest: IExecutionRequest = {
      executablePath: 'docker',
      arguments: dockerArgs,
      workingDirectory: request.workingDirectory,
      timeoutMs: request.timeoutMs || 3600000,
    };

    const res = await commandExecutor.execute(dockerRequest);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }

  private async executeKubernetes(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    const cfg = node.target.config as IKubernetesTargetConfig;
    const kubectlArgs = [
      'run',
      jobId,
      `--namespace=${cfg.namespace || 'default'}`,
      `--image=${cfg.image || 'ai-research-platform/k8s-solver:v1'}`,
      '--restart=Never',
      '--',
      request.executablePath,
      ...(request.arguments || []),
    ];

    logger.info(`Kubernetes Pod Job Execution: kubectl ${kubectlArgs.join(' ')}`);

    const k8sRequest: IExecutionRequest = {
      executablePath: 'kubectl',
      arguments: kubectlArgs,
      workingDirectory: request.workingDirectory,
      timeoutMs: request.timeoutMs || 3600000,
    };

    const res = await commandExecutor.execute(k8sRequest);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }

  private async executeCloud(
    node: ExecutionNode,
    request: IExecutionRequest,
    jobId: string,
    startIso: string
  ): Promise<IExecutionResult> {
    logger.info(`Cloud Worker Execution on Node [${node.id}]`);
    const res = await commandExecutor.execute(request);
    return {
      ...res,
      executedOnNodeId: node.id,
    };
  }
}

export const workerAgent = new WorkerAgent();
