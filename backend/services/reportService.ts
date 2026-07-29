import { reportRepository, IReportRepository } from '../repositories/reportRepository.js';
import { GeneratedReport } from '../shared/types.js';

export class ReportService {
  constructor(private repo: IReportRepository = reportRepository) {}

  public getAllReports(): GeneratedReport[] {
    return this.repo.findAll();
  }
}

export const reportService = new ReportService();
