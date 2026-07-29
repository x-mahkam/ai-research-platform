import { AppError } from '../shared/errors.js';

export class ComsolNotFoundError extends AppError {
  constructor(message: string = 'COMSOL executable (comsolbatch) could not be located on the system.') {
    super(message, 404);
    this.name = 'ComsolNotFoundError';
  }
}

export class ComsolExecutionError extends AppError {
  public readonly exitCode?: number;
  public readonly stdout?: string;
  public readonly stderr?: string;

  constructor(
    message: string = 'COMSOL process execution failed.',
    exitCode?: number,
    stdout?: string,
    stderr?: string
  ) {
    super(message, 500);
    this.name = 'ComsolExecutionError';
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export class ComsolLicenseError extends AppError {
  constructor(message: string = 'COMSOL license checkout or license server check failed.') {
    super(message, 403);
    this.name = 'ComsolLicenseError';
  }
}

export class WorkspaceError extends AppError {
  constructor(message: string = 'Failed to prepare or access COMSOL workspace directory structure.') {
    super(message, 400);
    this.name = 'WorkspaceError';
  }
}

export class TimeoutError extends AppError {
  public readonly timeoutMs: number;

  constructor(message: string = 'COMSOL execution timed out.', timeoutMs: number = 3600000) {
    super(message, 408);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
