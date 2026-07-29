import { IRawPluginOutput, IARPUnifiedResults, ResultConversionContext } from '../types.js';
import { resultCollector } from '../collector/index.js';
import { resultParserRegistry } from '../parser/index.js';
import { resultConverterRegistry } from '../converter/index.js';
import { resultStorageRepository } from '../storage/index.js';
import { resultViewer, IResultViewModel } from '../viewer/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('ResultManager');

export class ResultManager {
  public async processAndStoreRawResult(
    pluginId: string,
    rawResult: unknown,
    context: ResultConversionContext,
    rawFormat: string = 'JSON'
  ): Promise<IARPUnifiedResults> {
    logger.info(`ResultManager processing raw output from plugin "${pluginId}" for experiment ${context.experimentId}`);

    // 1. Collect
    const rawOutput: IRawPluginOutput = resultCollector.collectFromPluginExecution(pluginId, rawResult, rawFormat);

    // 2. Parse
    const parsedData = await resultParserRegistry.parseRawOutput(rawOutput);

    // 3. Convert to Unified ARP Format
    const unifiedResults = resultConverterRegistry.convertToARPUnifiedFormat(parsedData, context);

    // 4. Store
    resultStorageRepository.save(unifiedResults);

    logger.info(`ResultManager successfully converted and stored unified ARP results ${unifiedResults.id}`);
    return unifiedResults;
  }

  public getResultsByJob(jobId: string): IARPUnifiedResults | undefined {
    return resultStorageRepository.findByJobId(jobId);
  }

  public getResultsByExperiment(experimentId: string): IARPUnifiedResults[] {
    return resultStorageRepository.findByExperimentId(experimentId);
  }

  public getViewModel(jobId: string): IResultViewModel | undefined {
    const res = this.getResultsByJob(jobId);
    if (!res) return undefined;
    return resultViewer.prepareViewModel(res);
  }

  public exportCSV(jobId: string): string | undefined {
    const res = this.getResultsByJob(jobId);
    if (!res) return undefined;
    return resultViewer.exportToCSV(res);
  }
}

export const resultManager = new ResultManager();
