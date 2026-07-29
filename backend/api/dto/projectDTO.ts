import { ValidationError } from '../../shared/errors.js';

export interface CreateProjectDTO {
  title: string;
  scientificField: string;
  simulator: string;
  physicsModule: string;
  researchGoal: string;
  description?: string;
  principalInvestigator?: string;
  tags?: string[];
  members?: string[];
  initialModel?: {
    fileName: string;
    fileType?: string;
    simulator?: string;
    physicsModule?: string;
    content?: string;
    description?: string;
    fileSize?: number;
    checksum?: string;
  };
  // Backwards compatibility
  domain?: string;
  owner?: string;
}

export interface UpdateProjectDTO {
  title?: string;
  scientificField?: string;
  simulator?: string;
  physicsModule?: string;
  researchGoal?: string;
  description?: string;
  principalInvestigator?: string;
  status?: 'Draft' | 'Active' | 'Completed' | 'Archived';
  favorite?: boolean;
  tags?: string[];
  members?: string[];
  domain?: string;
  owner?: string;
}

export function validateCreateProjectDTO(data: any): CreateProjectDTO {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  const title = (data.title || data.name || '').toString().trim();
  if (!title) {
    throw new ValidationError('Project Title is required.');
  }

  const scientificField = (data.scientificField || data.domain || '').toString().trim();
  if (!scientificField) {
    throw new ValidationError('Scientific Field is required.');
  }

  const simulator = (data.simulator || '').toString().trim();
  if (!simulator) {
    throw new ValidationError('Simulator selection is required.');
  }

  const physicsModule = (data.physicsModule || '').toString().trim();
  if (!physicsModule) {
    throw new ValidationError('Physics / Module is required.');
  }

  const researchGoal = (data.researchGoal || data.description || '').toString().trim();
  if (!researchGoal) {
    throw new ValidationError('Research Goal is required.');
  }

  const principalInvestigator = (data.principalInvestigator || data.owner || 'Lead Scientist').toString().trim();

  return {
    title,
    scientificField,
    simulator,
    physicsModule,
    researchGoal,
    description: data.description || '',
    principalInvestigator,
    owner: principalInvestigator,
    domain: scientificField,
    tags: Array.isArray(data.tags) ? data.tags : [],
    members: Array.isArray(data.members) ? data.members : [principalInvestigator],
    initialModel: data.initialModel,
  };
}

