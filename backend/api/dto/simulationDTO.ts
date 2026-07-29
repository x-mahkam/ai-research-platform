import { ValidationError } from '../../shared/errors.js';

export interface RunSimulationDTO {
  experimentId: string;
}

export interface JobActionDTO {
  action: 'pause' | 'resume' | 'cancel' | 'retry';
}

// IDs are used to build filesystem paths (workspace directories), so they must
// never contain path separators or traversal sequences.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function assertSafeId(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a string of letters, digits, "-" or "_" (max 128 chars).`
    );
  }
  return value;
}

export function validateRunSimulationDTO(data: any): RunSimulationDTO {
  if (!data || !data.experimentId) {
    throw new ValidationError('experimentId is required to execute a simulation.');
  }
  return { experimentId: assertSafeId(data.experimentId, 'experimentId') };
}

export function validateJobActionDTO(data: any): JobActionDTO {
  const validActions = ['pause', 'resume', 'cancel', 'retry'];
  if (!data || !validActions.includes(data.action)) {
    throw new ValidationError(`action must be one of: ${validActions.join(', ')}`);
  }
  return { action: data.action };
}
