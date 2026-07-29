import { ISchedulerJob } from '../queue/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('ResourceManager');

export interface IClusterResourceQuota {
  totalCpuPercent: number;
  totalMemoryGB: number;
  allocatedCpuPercent: number;
  allocatedMemoryGB: number;
}

export class ResourceManager {
  private totalCpu: number = 100;
  private totalMemoryGB: number = 128;
  private allocatedCpu: number = 0;
  private allocatedMemoryGB: number = 0;

  constructor(totalCpu: number = 100, totalMemoryGB: number = 128) {
    this.totalCpu = totalCpu;
    this.totalMemoryGB = totalMemoryGB;
  }

  public getQuota(): IClusterResourceQuota {
    return {
      totalCpuPercent: this.totalCpu,
      totalMemoryGB: this.totalMemoryGB,
      allocatedCpuPercent: this.allocatedCpu,
      allocatedMemoryGB: this.allocatedMemoryGB,
    };
  }

  public hasAvailableResources(cpuRequired: number = 25, memoryRequiredGB: number = 8): boolean {
    const availableCpu = this.totalCpu - this.allocatedCpu;
    const availableRam = this.totalMemoryGB - this.allocatedMemoryGB;

    return availableCpu >= cpuRequired && availableRam >= memoryRequiredGB;
  }

  public allocate(job: ISchedulerJob): boolean {
    const reqCpu = job.cpuRequired || 25;
    const reqRam = job.memoryRequiredGB || 8;

    if (!this.hasAvailableResources(reqCpu, reqRam)) {
      logger.warn(
        `Insufficient resources for job ${job.id}. Req: CPU ${reqCpu}%, RAM ${reqRam}GB. Avail: CPU ${
          this.totalCpu - this.allocatedCpu
        }%, RAM ${this.totalMemoryGB - this.allocatedMemoryGB}GB.`
      );
      return false;
    }

    this.allocatedCpu += reqCpu;
    this.allocatedMemoryGB += reqRam;
    logger.info(
      `Allocated resources for job ${job.id}: CPU +${reqCpu}% (Total ${this.allocatedCpu}%), RAM +${reqRam}GB (Total ${this.allocatedMemoryGB}GB)`
    );
    return true;
  }

  public release(job: ISchedulerJob): void {
    const reqCpu = job.cpuRequired || 25;
    const reqRam = job.memoryRequiredGB || 8;

    this.allocatedCpu = Math.max(0, this.allocatedCpu - reqCpu);
    this.allocatedMemoryGB = Math.max(0, this.allocatedMemoryGB - reqRam);

    logger.info(
      `Released resources for job ${job.id}: CPU -${reqCpu}% (Remaining ${this.allocatedCpu}%), RAM -${reqRam}GB (Remaining ${this.allocatedMemoryGB}GB)`
    );
  }

  public reset(): void {
    this.allocatedCpu = 0;
    this.allocatedMemoryGB = 0;
  }
}

export const resourceManager = new ResourceManager();
