import { Request, Response, NextFunction } from 'express';
import { experimentService, ExperimentService } from '../../services/experimentService.js';
import { validateCreateExperimentDTO } from '../dto/experimentDTO.js';

export class ExperimentController {
  constructor(private service: ExperimentService = experimentService) {}

  public getExperiments = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query;
      const experiments = this.service.getExperiments(projectId as string | undefined);
      res.json(experiments);
    } catch (err) {
      next(err);
    }
  };

  public getExperimentById = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const exp = this.service.getExperimentById(id);
      res.json(exp);
    } catch (err) {
      next(err);
    }
  };

  public createExperiment = (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateCreateExperimentDTO(req.body);
      const created = this.service.createExperiment({
        ...req.body,
        ...validated,
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  };

  public cloneExperiment = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const cloned = this.service.cloneExperiment(id);
      res.status(201).json(cloned);
    } catch (err) {
      next(err);
    }
  };

  public updateExperiment = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updated = this.service.updateExperiment(id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}

export const experimentController = new ExperimentController();
