import { Request, Response, NextFunction } from 'express';
import { resultManager } from '../../results/index.js';

export class ResultController {
  public getResultByJob = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const result = resultManager.getResultsByJob(jobId);
      if (!result) {
        res.status(404).json({ error: `Results for job ${jobId} not found.` });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public getResultsByExperiment = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { experimentId } = req.params;
      const results = resultManager.getResultsByExperiment(experimentId);
      res.json(results);
    } catch (err) {
      next(err);
    }
  };

  public getViewModel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const viewModel = resultManager.getViewModel(jobId);
      if (!viewModel) {
        res.status(404).json({ error: `View model for job ${jobId} not found.` });
        return;
      }
      res.json(viewModel);
    } catch (err) {
      next(err);
    }
  };

  public exportCSV = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const csv = resultManager.exportCSV(jobId);
      if (!csv) {
        res.status(404).json({ error: `CSV export for job ${jobId} unavailable.` });
        return;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="results-${jobId}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  };
}

export const resultController = new ResultController();
