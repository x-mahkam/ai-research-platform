import { ValidationError } from '../../shared/errors.js';

export interface RunSimulationDTO {
  experimentId: string;
}

export interface JobActionDTO {
  action: 'pause' | 'resume' | 'cancel' | 'retry';
}

export function validateRunSimulationDTO(data: any): RunSimulationDTO {
  if (!data || !data.experimentId) {
    throw new ValidationError('experimentId is required to execute a simulation.');
  }
  return { experimentId: data.experimentId };
}

export function validateJobActionDTO(data: any): JobActionDTO {
  const validActions = ['pause', 'resume', 'cancel', 'retry'];
  if (!data || !validActions.includes(data.action)) {
    throw new ValidationError(`action must be one of: ${validActions.join(', ')}`);
  }
  return { action: data.action };
}
