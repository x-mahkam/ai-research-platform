import { BaseRepository } from './baseRepository.js';
import { ReportEntity } from '../entities/index.js';
import { GeneratedReport } from '../shared/types.js';

export interface IReportRepository {
  findAll(): GeneratedReport[];
  create(report: GeneratedReport): GeneratedReport;
}

export class ReportRepository extends BaseRepository<ReportEntity> implements IReportRepository {
  constructor() {
    super('reports');
  }
}

export const reportRepository = new ReportRepository();
