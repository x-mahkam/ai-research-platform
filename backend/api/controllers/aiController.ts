import { Request, Response, NextFunction } from 'express';
import { aiService, AIService } from '../../services/aiService.js';
import { validateAIChatDTO, validateAIReportDTO } from '../dto/aiDTO.js';
import { SYSTEM_CONSTANTS } from '../../configuration/index.js';

export class AIController {
  constructor(private service: AIService = aiService) {}

  public chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateAIChatDTO(req.body);
      const result = await this.service.chat(validated);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public generateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateAIReportDTO(req.body);
      const report = await this.service.generateReport(validated);
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  public planExperiment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { goal, context } = req.body;
      const plan = await this.service.planExperiment(
        goal || SYSTEM_CONSTANTS.DEFAULT_EXPERIMENT_GOAL,
        context
      );
      res.json(plan);
    } catch (err) {
      next(err);
    }
  };

  public analyzeResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { results } = req.body;
      const analysis = await this.service.analyzeResults(results || {});
      res.json(analysis);
    } catch (err) {
      next(err);
    }
  };

  public predictOptimization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetMetric, currentParameters } = req.body;
      const prediction = await this.service.predictOptimization(
        targetMetric || SYSTEM_CONSTANTS.DEFAULT_TARGET_METRIC,
        currentParameters || {}
      );
      res.json(prediction);
    } catch (err) {
      next(err);
    }
  };

  public queryKnowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.query;
      const topics = await this.service.queryKnowledge((query as string) || '');
      res.json({ topics });
    } catch (err) {
      next(err);
    }
  };

  public listProviders = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(this.service.listProviders());
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AIController();
