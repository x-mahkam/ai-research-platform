import { IExecutionContext, ExecutionStatus, IExecutionResult } from './types.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ExecutionMonitor');

export class ExecutionMonitor {
  private activeContexts: Map<string, IExecutionContext> = new Map();
  private history: Map<string, IExecutionResult> = new Map();

  public registerContext(context: IExecutionContext): void {
    this.activeContexts.set(context.requestId, context);
    logger.info(`ExecutionMonitor registered execution context [${context.requestId}] status: ${context.status}`);
  }

  public updateStatus(requestId: string, status: ExecutionStatus): void {
    const ctx = this.activeContexts.get(requestId);
    if (ctx) {
      ctx.status = status;
      logger.info(`ExecutionMonitor updated [${requestId}] status -> ${status}`);
    }
  }

  public getContext(requestId: string): IExecutionContext | undefined {
    return this.activeContexts.get(requestId);
  }

  public recordCompletion(requestId: string, result: IExecutionResult): void {
    const ctx = this.activeContexts.get(requestId);
    if (ctx) {
      ctx.status = result.status;
      ctx.endTime = new Date();
    }
    this.history.set(requestId, result);
    this.activeContexts.delete(requestId);
    logger.info(`ExecutionMonitor recorded completion for [${requestId}], status: ${result.status}`);
  }

  public cancelExecution(requestId: string): boolean {
    const ctx = this.activeContexts.get(requestId);
    if (ctx && ctx.process) {
      logger.info(`ExecutionMonitor cancelling process for [${requestId}] PID: ${ctx.process.pid}`);
      ctx.process.cancel();
      ctx.status = 'Cancelled';
      return true;
    }
    return false;
  }

  public getActiveCount(): number {
    return this.activeContexts.size;
  }

  public getResultHistory(requestId: string): IExecutionResult | undefined {
    return this.history.get(requestId);
  }
}

export const executionMonitor = new ExecutionMonitor();
