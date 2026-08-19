import { Request, Response, NextFunction } from 'express';
import { aiService, AIService } from '../../services/aiService.js';
import { validateAIChatDTO, validateAIReportDTO } from '../dto/aiDTO.js';
import { SYSTEM_CONSTANTS } from '../../configuration/index.js';
import { ValidationError } from '../../shared/errors.js';
import { updateProviderKeys, getComsolStatus, updateComsolPath, updateOllamaSettings } from '../../settings/apiKeys.js';
import { autonomousLoopService } from '../../ai/autoloop/index.js';
import { modelRebuildService } from '../../ai/modelBuilder/index.js';
import { validateParameterOverrides, assertSafeId } from '../dto/simulationDTO.js';

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

  public planSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objective, simulator, providers } = req.body || {};
      if (!objective || typeof objective !== 'string') {
        throw new ValidationError('A research objective is required to plan an experiment setup.');
      }
      const setup = await this.service.planSetup({
        objective,
        simulator: typeof simulator === 'string' ? simulator : undefined,
        providers: Array.isArray(providers) ? providers.filter((p: unknown) => typeof p === 'string') : undefined,
      });
      res.json(setup);
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

  public saveKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Writing API keys is a local convenience for the machine running the
      // platform — never allow it from a remote client (e.g. a public deploy).
      const remote = req.socket.remoteAddress || '';
      const isLocal =
        remote === '127.0.0.1' ||
        remote === '::1' ||
        remote === '::ffff:127.0.0.1';
      if (!isLocal) {
        return res.status(403).json({ error: 'API keys can only be set from the local machine.' });
      }
      const keys = req.body && typeof req.body === 'object' ? (req.body as Record<string, string>) : {};
      updateProviderKeys(keys);
      res.json(this.service.listProviders());
    } catch (err) {
      next(err);
    }
  };

  public startAutoResearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body || {};
      const experimentId = assertSafeId(body.experimentId, 'experimentId');
      const parameter = typeof body.parameter === 'string' ? body.parameter.trim() : '';
      if (!parameter) {
        throw new ValidationError('A COMSOL parameter name to sweep is required.');
      }
      // Reuse the same value validation as run-time overrides (no commas, etc.).
      const rawValues = Array.isArray(body.values) ? body.values : [];
      const values: Array<string | number> = [];
      for (const v of rawValues) {
        const checked = validateParameterOverrides({ [parameter]: v });
        if (checked) values.push(checked[parameter]);
      }
      if (!values.length) {
        throw new ValidationError('Provide at least one valid parameter value to sweep.');
      }
      const providers = Array.isArray(body.providers)
        ? body.providers.filter((p: unknown): p is string => typeof p === 'string')
        : undefined;
      const run = autonomousLoopService.start({
        experimentId,
        parameter,
        values,
        objectiveMetric: typeof body.objectiveMetric === 'string' ? body.objectiveMetric : undefined,
        goal: typeof body.goal === 'string' ? body.goal : undefined,
        providers,
      });
      res.status(201).json(run);
    } catch (err) {
      next(err);
    }
  };

  public getAutoResearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = autonomousLoopService.getStatus(req.params.id);
      if (!run) return res.status(404).json({ error: 'Autonomous run not found.' });
      res.json(run);
    } catch (err) {
      next(err);
    }
  };

  public stopAutoResearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = autonomousLoopService.stop(req.params.id);
      if (!run) return res.status(404).json({ error: 'Autonomous run not found.' });
      res.json(run);
    } catch (err) {
      next(err);
    }
  };

  public startRebuildModel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body || {};
      const experimentId = assertSafeId(body.experimentId, 'experimentId');
      const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
      if (!instruction) {
        throw new ValidationError('An instruction describing the fix to apply is required.');
      }
      const providers = Array.isArray(body.providers)
        ? body.providers.filter((p: unknown): p is string => typeof p === 'string')
        : undefined;
      const run = modelRebuildService.start({ experimentId, instruction, providers });
      res.status(201).json(run);
    } catch (err) {
      next(err);
    }
  };

  public getRebuildModel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = modelRebuildService.getStatus(req.params.id);
      if (!run) return res.status(404).json({ error: 'Rebuild run not found.' });
      res.json(run);
    } catch (err) {
      next(err);
    }
  };

  public comsolStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(getComsolStatus());
    } catch (err) {
      next(err);
    }
  };

  public saveOllama = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const remote = req.socket.remoteAddress || '';
      const isLocal =
        remote === '127.0.0.1' ||
        remote === '::1' ||
        remote === '::ffff:127.0.0.1';
      if (!isLocal) {
        return res.status(403).json({ error: 'Ollama settings can only be changed from the local machine.' });
      }
      const model = typeof req.body?.model === 'string' ? req.body.model : '';
      const baseURL = typeof req.body?.baseURL === 'string' ? req.body.baseURL : '';
      res.json(updateOllamaSettings({ model, baseURL }));
    } catch (err) {
      next(err);
    }
  };

  public saveComsol = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const remote = req.socket.remoteAddress || '';
      const isLocal =
        remote === '127.0.0.1' ||
        remote === '::1' ||
        remote === '::ffff:127.0.0.1';
      if (!isLocal) {
        return res.status(403).json({ error: 'The COMSOL path can only be set from the local machine.' });
      }
      const p = req.body?.path;
      if (typeof p !== 'string' || !p.trim()) {
        throw new ValidationError('A COMSOL executable path (or its folder) is required.');
      }
      res.json(updateComsolPath(p));
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AIController();
