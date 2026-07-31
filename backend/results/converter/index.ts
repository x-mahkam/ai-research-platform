import { ParsedOutputData } from '../parser/index.js';
import { IARPUnifiedResults, ResultConversionContext, IARPCurveVector } from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { generateId, getCurrentTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('ResultConverter');

export interface IResultConverter {
  converterName: string;
  canConvert(pluginId: string): boolean;
  convert(parsed: ParsedOutputData, context: ResultConversionContext): IARPUnifiedResults;
}

export class UniversalARPConverter implements IResultConverter {
  public converterName = 'Universal-ARP-Standard-Converter';

  public canConvert(): boolean {
    return true; // Default fallback converter for all simulator plugins
  }

  public convert(parsed: ParsedOutputData, context: ResultConversionContext): IARPUnifiedResults {
    const curves: IARPCurveVector[] = parsed.series.map((s) => ({
      id: s.id,
      title: s.title,
      xAxisLabel: s.xAxisLabel,
      yAxisLabel: s.yAxisLabel,
      data: s.data,
    }));

    const metricsCount = Object.keys(parsed.metrics).length;
    const curvesCount = curves.length;

    const summary = `Unified ARP Results converted for plugin "${context.pluginId}". Extracted ${metricsCount} scalar metric(s) and ${curvesCount} vector curve(s).`;

    return {
      id: generateId('arp-res'),
      experimentId: context.experimentId,
      jobId: context.jobId,
      pluginId: context.pluginId,
      timestamp: getCurrentTimestamp(),
      metrics: parsed.metrics,
      curves,
      summary,
      diagnostics: parsed.diagnostics,
    };
  }
}

export class ResultConverterRegistry {
  private converters: IResultConverter[] = [new UniversalARPConverter()];

  public registerConverter(converter: IResultConverter): void {
    this.converters.unshift(converter);
    logger.info(`Registered result converter: ${converter.converterName}`);
  }

  public convertToARPUnifiedFormat(
    parsed: ParsedOutputData,
    context: ResultConversionContext
  ): IARPUnifiedResults {
    for (const converter of this.converters) {
      if (converter.canConvert(context.pluginId)) {
        logger.info(`Converting parsed output via converter "${converter.converterName}"`);
        return converter.convert(parsed, context);
      }
    }

    return new UniversalARPConverter().convert(parsed, context);
  }
}

export const resultConverterRegistry = new ResultConverterRegistry();
