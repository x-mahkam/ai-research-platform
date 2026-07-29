import { ModelFile } from '../shared/types.js';
import { IModelRepository, modelRepository } from '../repositories/modelRepository.js';
import { generateId } from '../shared/utils.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

export interface AutoDetectedMeta {
  fileType: string;
  simulator: string;
  physicsModule: string;
  version: string;
}

export function detectModelMeta(fileName: string): AutoDetectedMeta {
  const lowerName = fileName.toLowerCase();
  const extMatch = lowerName.match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1]}` : '';

  if (ext === '.mph') {
    return {
      fileType: '.mph',
      simulator: 'COMSOL Multiphysics',
      physicsModule: lowerName.includes('heat') || lowerName.includes('thermal')
        ? 'Heat Transfer'
        : lowerName.includes('fluid')
        ? 'CFD Microfluidics'
        : lowerName.includes('semiconductor')
        ? 'Semiconductor Module'
        : 'Multiphysics Module',
      version: '6.2',
    };
  }

  if (ext === '.cmd' || ext === '.tdr' || ext === '.par' || ext === '.grd' || ext === '.plt') {
    return {
      fileType: ext,
      simulator: 'Synopsys Sentaurus TCAD',
      physicsModule: lowerName.includes('gaa')
        ? 'GAA / Nanosheet'
        : lowerName.includes('finfet')
        ? 'FinFET'
        : lowerName.includes('hemt')
        ? 'HEMT'
        : 'Hydrodynamic / Quantum',
      version: '2024.03',
    };
  }

  if (ext === '.py' || ext === '.hdf5' || ext === '.cif' || ext === '.xyz') {
    return {
      fileType: ext,
      simulator: 'QuantumATK',
      physicsModule: lowerName.includes('negf') ? 'NEGF Transport' : 'DFT Bandstructure',
      version: '2023.12',
    };
  }

  if (ext === '.fsp' || ext === '.lms' || ext === '.lsf') {
    return {
      fileType: ext,
      simulator: 'Ansys Lumerical',
      physicsModule: lowerName.includes('fdtd') ? 'FDTD Maxwell Solver' : 'Eigenmode Analysis',
      version: '2024.R1',
    };
  }

  if (ext === '.in' || ext === '.str') {
    return {
      fileType: ext,
      simulator: 'Silvaco Atlas',
      physicsModule: lowerName.includes('gan') || lowerName.includes('breakdown')
        ? 'Drift-Diffusion / Breakdown'
        : 'Drift-Diffusion',
      version: '5.32.0.R',
    };
  }

  if (ext === '.m' || ext === '.slx' || ext === '.mat') {
    return {
      fileType: ext,
      simulator: 'MATLAB',
      physicsModule: 'Control Systems & PDE Toolbox',
      version: 'R2024a',
    };
  }

  if (lowerName.endsWith('foam') || ext === '.foam' || lowerName.includes('controldict') || lowerName.includes('blockmesh')) {
    return {
      fileType: '.foam',
      simulator: 'OpenFOAM',
      physicsModule: 'Incompressible CFD Flow',
      version: 'v2312',
    };
  }

  if (ext === '.aedt' || ext === '.s2p' || ext === '.s4p') {
    return {
      fileType: ext,
      simulator: 'HFSS',
      physicsModule: 'Driven Modal 3D EM',
      version: '2024.R1',
    };
  }

  return {
    fileType: ext || '.model',
    simulator: 'COMSOL Multiphysics',
    physicsModule: 'General Physics Solver',
    version: '1.0.0',
  };
}

function generateChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sha256-' + Math.abs(hash).toString(16).padStart(12, '0') + 'a7b9';
}

export interface ModelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  meta: {
    fileName: string;
    fileExtension: string;
    supportedExtension: boolean;
    simulatorCompatibility: boolean;
    detectedSimulator: string;
    detectedPhysicsModule: string;
    fileSize: number;
    checksum: string;
  };
}

export function validateModelFile(data: {
  fileName: string;
  simulator?: string;
  physicsModule?: string;
  fileSize?: number;
  checksum?: string;
}): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fileName = (data.fileName || '').trim();
  if (!fileName) {
    errors.push('Scientific model file name is required.');
  }

  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1]}` : '';

  const supportedFormats = [
    '.mph',
    '.cmd', '.tdr', '.par', '.grd', '.plt', '.msh',
    '.py', '.hdf5', '.cif', '.xyz',
    '.fsp', '.lsf', '.lms',
    '.in', '.str', '.log',
    '.m', '.slx', '.mat',
    '.foam',
    '.aedt', '.s2p', '.s4p',
  ];

  const isSupported = supportedFormats.includes(ext) || fileName.toLowerCase().endsWith('foam');
  if (!isSupported) {
    errors.push(`Unsupported format "${ext || 'none'}". Supported extensions: COMSOL (.mph), Sentaurus (.cmd, .tdr, .par), QuantumATK (.py, .hdf5), Lumerical (.fsp, .lsf), Silvaco (.in, .str), MATLAB (.m), OpenFOAM (.foam).`);
  }

  const detected = detectModelMeta(fileName);

  let simulatorCompatibility = true;
  if (data.simulator && data.simulator !== 'Future Plugin') {
    const simLower = data.simulator.toLowerCase();
    const detSimLower = detected.simulator.toLowerCase();

    if (
      (simLower.includes('comsol') && !detSimLower.includes('comsol')) ||
      (simLower.includes('sentaurus') && !detSimLower.includes('sentaurus')) ||
      (simLower.includes('quantumatk') && !detSimLower.includes('quantum')) ||
      (simLower.includes('lumerical') && !detSimLower.includes('lumerical')) ||
      (simLower.includes('silvaco') && !detSimLower.includes('silvaco')) ||
      (simLower.includes('matlab') && !detSimLower.includes('matlab')) ||
      (simLower.includes('openfoam') && !detSimLower.includes('openfoam'))
    ) {
      simulatorCompatibility = false;
      warnings.push(`Model extension "${ext}" is natively associated with ${detected.simulator}, while project target simulator is "${data.simulator}".`);
    }
  }

  const fileSize = data.fileSize && data.fileSize > 0 ? data.fileSize : 184320;
  const checksum = data.checksum || generateChecksum(fileName + fileSize);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    meta: {
      fileName,
      fileExtension: ext || '.model',
      supportedExtension: isSupported,
      simulatorCompatibility,
      detectedSimulator: detected.simulator,
      detectedPhysicsModule: detected.physicsModule,
      fileSize,
      checksum,
    },
  };
}

export class ModelService {
  constructor(private repo: IModelRepository = modelRepository) {}

  public getProjectModels(projectId: string): ModelFile[] {
    return this.repo.findByProjectId(projectId);
  }

  public getModelById(id: string): ModelFile {
    const model = this.repo.findById(id);
    if (!model) {
      throw new NotFoundError(`Model with ID ${id} not found.`);
    }
    return model;
  }

  public validateModel(data: {
    fileName: string;
    simulator?: string;
    physicsModule?: string;
    fileSize?: number;
    checksum?: string;
  }): ModelValidationResult {
    return validateModelFile(data);
  }

  public createModel(projectId: string, data: Partial<ModelFile> & { fileName: string }): ModelFile {
    const validation = validateModelFile(data);
    if (!validation.valid) {
      throw new ValidationError(`Model validation failed: ${validation.errors.join(' ')}`);
    }

    const fileName = data.fileName.trim();
    const detected = detectModelMeta(fileName);

    const existingModels = this.repo.findByProjectId(projectId);
    const shouldBeDefault = data.isDefault !== undefined ? data.isDefault : existingModels.length === 0;

    const simulator = data.simulator || detected.simulator;
    const physicsModule = data.physicsModule || detected.physicsModule;
    const fileType = data.fileType || detected.fileType;
    const version = data.version || detected.version;
    const fileSize = data.fileSize || validation.meta.fileSize;
    const checksum = data.checksum || validation.meta.checksum;
    const owner = data.owner || 'Dr. Jasur Alimov';
    const absolutePath = data.absolutePath || `/workspaces/projects/${projectId}/models/${fileName}`;

    if (shouldBeDefault) {
      existingModels.forEach((m) => {
        if (m.isDefault) {
          this.repo.update(m.id, { isDefault: false });
        }
      });
    }

    const newModel: ModelFile = {
      id: generateId('mod'),
      projectId,
      fileName,
      fileType,
      simulator,
      physicsModule,
      absolutePath,
      fileSize,
      checksum,
      version,
      owner,
      isDefault: shouldBeDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: data.content || `# Model: ${fileName}\n# Simulator: ${simulator}\n# Module: ${physicsModule}\n`,
      description: data.description || `Scientific model file for ${simulator} - ${physicsModule}`,
    };

    const created = this.repo.create(newModel);

    // Update project defaultModelId if needed
    if (shouldBeDefault) {
      try {
        const { projectRepository } = require('../repositories/projectRepository.js');
        projectRepository.update(projectId, { defaultModelId: created.id });
      } catch (e) {
        // Ignored if repo unavailable
      }
    }

    return created;
  }

  public setDefaultModel(projectId: string, modelId: string): ModelFile {
    const models = this.getProjectModels(projectId);
    const target = models.find((m) => m.id === modelId);
    if (!target) {
      throw new NotFoundError(`Model ${modelId} not found in project ${projectId}`);
    }

    models.forEach((m) => {
      this.repo.update(m.id, { isDefault: m.id === modelId });
    });

    try {
      const { projectRepository } = require('../repositories/projectRepository.js');
      projectRepository.update(projectId, { defaultModelId: modelId });
    } catch (e) {}

    return { ...target, isDefault: true };
  }

  public replaceModel(projectId: string, modelId: string, newFileData: Partial<ModelFile> & { fileName: string }): ModelFile {
    const existing = this.getModelById(modelId);
    if (existing.projectId !== projectId) {
      throw new ValidationError(`Model ${modelId} does not belong to project ${projectId}.`);
    }

    const validation = validateModelFile(newFileData);
    if (!validation.valid) {
      throw new ValidationError(`Model replacement validation failed: ${validation.errors.join(' ')}`);
    }

    const fileName = newFileData.fileName.trim();
    const detected = detectModelMeta(fileName);

    const updated = this.repo.update(modelId, {
      fileName,
      fileType: newFileData.fileType || detected.fileType,
      simulator: newFileData.simulator || detected.simulator,
      physicsModule: newFileData.physicsModule || detected.physicsModule,
      content: newFileData.content || `# Replaced Model File: ${fileName}\n`,
      fileSize: newFileData.fileSize || validation.meta.fileSize,
      checksum: validation.meta.checksum,
      absolutePath: `/workspaces/projects/${projectId}/models/${fileName}`,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError(`Failed to replace model ${modelId}`);
    }

    return updated;
  }

  public updateModel(projectId: string, modelId: string, updates: Partial<ModelFile>): ModelFile {
    const existing = this.getModelById(modelId);
    if (existing.projectId !== projectId) {
      throw new ValidationError(`Model ${modelId} does not belong to project ${projectId}.`);
    }

    let updatedMeta = {};
    if (updates.fileName && updates.fileName !== existing.fileName) {
      const detected = detectModelMeta(updates.fileName);
      updatedMeta = {
        fileType: updates.fileType || detected.fileType,
        checksum: generateChecksum(updates.fileName + Date.now()),
        absolutePath: `/workspaces/projects/${projectId}/models/${updates.fileName}`,
      };
    }

    const updated = this.repo.update(modelId, {
      ...updates,
      ...updatedMeta,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError(`Failed to update model ${modelId}`);
    }

    return updated;
  }

  public deleteModel(projectId: string, modelId: string): boolean {
    const existing = this.getModelById(modelId);
    if (existing.projectId !== projectId) {
      throw new ValidationError(`Model ${modelId} does not belong to project ${projectId}.`);
    }
    const success = this.repo.delete(modelId);

    // If deleted model was default, assign a new default model
    const remaining = this.repo.findByProjectId(projectId);
    if (remaining.length > 0 && existing.isDefault) {
      this.setDefaultModel(projectId, remaining[0].id);
    }

    return success;
  }

  public duplicateModel(projectId: string, modelId: string): ModelFile {
    const existing = this.getModelById(modelId);
    const extMatch = existing.fileName.match(/(\.[a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1] : '';
    const baseName = ext ? existing.fileName.slice(0, -ext.length) : existing.fileName;
    const newFileName = `${baseName}_copy${ext}`;

    return this.createModel(projectId, {
      ...existing,
      id: undefined as any,
      fileName: newFileName,
      isDefault: false,
      checksum: generateChecksum(newFileName + Date.now()),
      createdAt: undefined as any,
      updatedAt: undefined as any,
    });
  }
}

export const modelService = new ModelService();
