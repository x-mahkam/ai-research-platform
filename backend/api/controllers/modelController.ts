import { Request, Response, NextFunction } from 'express';
import { modelService, ModelService, detectModelMeta } from '../../services/modelService.js';

export class ModelController {
  constructor(private service: ModelService = modelService) {}

  public getProjectModels = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const models = this.service.getProjectModels(projectId);
      res.json(models);
    } catch (err) {
      next(err);
    }
  };

  public getModelById = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modelId } = req.params;
      const model = this.service.getModelById(modelId);
      res.json(model);
    } catch (err) {
      next(err);
    }
  };

  public createModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const newModel = this.service.createModel(projectId, req.body);
      res.status(201).json(newModel);
    } catch (err) {
      next(err);
    }
  };

  public updateModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, modelId } = req.params;
      const updated = this.service.updateModel(projectId, modelId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  public deleteModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, modelId } = req.params;
      const success = this.service.deleteModel(projectId, modelId);
      res.json({ success });
    } catch (err) {
      next(err);
    }
  };

  public duplicateModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, modelId } = req.params;
      const duplicated = this.service.duplicateModel(projectId, modelId);
      res.status(201).json(duplicated);
    } catch (err) {
      next(err);
    }
  };

  public downloadModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modelId } = req.params;
      const model = this.service.getModelById(modelId);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${model.fileName}"`);
      res.send(model.content || `# Model File: ${model.fileName}\n# Simulator: ${model.simulator}\n# Module: ${model.physicsModule}\n`);
    } catch (err) {
      next(err);
    }
  };

  public detectMetadata = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileName } = req.body;
      const meta = detectModelMeta(fileName || 'model.mph');
      res.json(meta);
    } catch (err) {
      next(err);
    }
  };

  public validateModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.service.validateModel(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public setDefaultModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, modelId } = req.params;
      const updated = this.service.setDefaultModel(projectId, modelId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  public replaceModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, modelId } = req.params;
      const updated = this.service.replaceModel(projectId, modelId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}

export const modelController = new ModelController();
