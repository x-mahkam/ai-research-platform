import { ValidationError } from '../../shared/errors.js';

export interface CreateExperimentDTO {
  title: string;
  projectId: string;
  pluginId?: string;
  tags?: string[];
  parameters?: Record<string, unknown>;
}

export function validateCreateExperimentDTO(data: any): CreateExperimentDTO {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }
  if (!data.title || typeof data.title !== 'string') {
    throw new ValidationError('Experiment title is required.');
  }
  return {
    title: data.title.trim(),
    projectId: data.projectId,
    pluginId: data.pluginId,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    parameters: data.parameters,
  };
}
