import { ValidationError } from '../../shared/errors.js';

export interface AIChatDTO {
  prompt: string;
  experimentContext?: Record<string, unknown>;
  history?: unknown[];
  /** AI provider id(s) to use for this request. More than one → ensemble. */
  providers?: string[];
}

export interface AIReportDTO {
  experiment: any;
  projectName?: string;
}

export function validateAIChatDTO(data: any): AIChatDTO {
  if (!data || !data.prompt || typeof data.prompt !== 'string') {
    throw new ValidationError('A non-empty prompt is required for AI chat.');
  }
  return {
    prompt: data.prompt,
    experimentContext: data.experimentContext,
    history: data.history,
    providers: Array.isArray(data.providers)
      ? data.providers.filter((id: unknown): id is string => typeof id === 'string')
      : undefined,
  };
}

export function validateAIReportDTO(data: any): AIReportDTO {
  if (!data) {
    throw new ValidationError('Experiment payload is required for report generation.');
  }
  return {
    experiment: data.experiment,
    projectName: data.projectName,
  };
}
