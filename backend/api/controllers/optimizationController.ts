import { Request, Response, NextFunction } from 'express';
import { optimizationService, OptimizationService } from '../../services/optimizationService.js';

export class OptimizationController {
  constructor(private service: OptimizationService = optimizationService) {}

  public getOptimizations = (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = this.service.getAllOptimizations();
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  };

  public createOptimization = (req: Request, res: Response, next: NextFunction) => {
    try {
      const newOpt = this.service.createOptimization(req.body);
      res.status(201).json(newOpt);
    } catch (err) {
      next(err);
    }
  };

  public stepOptimization = (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = this.service.stepOptimization(req.params.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}

export const optimizationController = new OptimizationController();
