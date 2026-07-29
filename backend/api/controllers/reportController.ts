import { Request, Response, NextFunction } from 'express';
import { reportService, ReportService } from '../../services/reportService.js';

export class ReportController {
  constructor(private service: ReportService = reportService) {}

  public getReports = (req: Request, res: Response, next: NextFunction) => {
    try {
      const reports = this.service.getAllReports();
      res.json(reports);
    } catch (err) {
      next(err);
    }
  };
}

export const reportController = new ReportController();
