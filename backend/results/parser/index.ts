import { IRawPluginOutput } from '../types.js';
import { LoggerService } from '../../logging/logger.js';
import { SentaurusPltParser, SentaurusLogParser } from './sentaurusParser.js';

const logger = new LoggerService('ResultParser');

export interface ParsedOutputData {
  metrics: Record<string, string | number>;
  series: Array<{
    id: string;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    data: Array<{ x: number; y: number; z?: number }>;
  }>;
  rawText?: string;
  diagnostics?: Record<string, unknown>;
}

/**
 * Solver-diagnostic fields a plugin may emit alongside metrics/curves. Collected
 * verbatim so the AI layer sees the real run (log tail, convergence, computed
 * values), rather than only the flattened scalar metrics.
 */
export const DIAGNOSTIC_FIELDS = [
  'solverLog',
  'warnings',
  'errors',
  'converged',
  'computedValues',
  'exportedTables',
  'studySteps',
] as const;

function collectDiagnostics(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const diag: Record<string, unknown> = {};
  for (const key of DIAGNOSTIC_FIELDS) {
    if (data[key] !== undefined && data[key] !== null) diag[key] = data[key];
  }
  return Object.keys(diag).length ? diag : undefined;
}

export interface IResultParser {
  parserName: string;
  canParse(rawFormat: string, pluginId: string): boolean;
  parse(raw: IRawPluginOutput): Promise<ParsedOutputData>;
}

export class JsonRawResultParser implements IResultParser {
  public parserName = 'JSON-Standard-Parser';

  public canParse(rawFormat: string): boolean {
    return rawFormat.toUpperCase() === 'JSON' || rawFormat.toUpperCase() === 'OBJECT';
  }

  public async parse(raw: IRawPluginOutput): Promise<ParsedOutputData> {
    const data = typeof raw.rawData === 'string' ? JSON.parse(raw.rawData) : (raw.rawData as any) || {};

    const metrics: Record<string, string | number> = data.metrics || {};
    const series: ParsedOutputData['series'] = [];

    if (Array.isArray(data.curves)) {
      for (const curve of data.curves) {
        series.push({
          id: curve.id || `series-${Math.random().toString(36).substring(7)}`,
          title: curve.title || 'Data Curve',
          xAxisLabel: curve.xAxisLabel || 'X',
          yAxisLabel: curve.yAxisLabel || 'Y',
          data: Array.isArray(curve.data) ? curve.data : [],
        });
      }
    }

    return { metrics, series, rawText: JSON.stringify(data), diagnostics: collectDiagnostics(data) };
  }
}

export class KeyValueTextParser implements IResultParser {
  public parserName = 'KeyValue-Text-Parser';

  public canParse(rawFormat: string): boolean {
    return rawFormat.toUpperCase() === 'TEXT' || rawFormat.toUpperCase() === 'PLT';
  }

  public async parse(raw: IRawPluginOutput): Promise<ParsedOutputData> {
    const text = typeof raw.rawData === 'string' ? raw.rawData : String(raw.rawData);
    const lines = text.split('\n');
    const metrics: Record<string, string | number> = {};

    for (const line of lines) {
      if (line.includes(':') || line.includes('=')) {
        const parts = line.includes('=') ? line.split('=') : line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts[1].trim();
          metrics[key] = isNaN(Number(val)) ? val : Number(val);
        }
      }
    }

    return {
      metrics,
      series: [],
      rawText: text,
    };
  }
}

export class ResultParserRegistry {
  private parsers: IResultParser[] = [
    new SentaurusPltParser(),
    new SentaurusLogParser(),
    new JsonRawResultParser(),
    new KeyValueTextParser(),
  ];

  public registerParser(parser: IResultParser): void {
    this.parsers.unshift(parser);
    logger.info(`Registered custom result parser: ${parser.parserName}`);
  }

  public async parseRawOutput(raw: IRawPluginOutput): Promise<ParsedOutputData> {
    for (const parser of this.parsers) {
      if (parser.canParse(raw.rawFormat, raw.pluginId)) {
        logger.info(`Parsing raw output using ${parser.parserName}`);
        return await parser.parse(raw);
      }
    }

    // Default fallback parsing
    logger.warn(`No specific parser found for format ${raw.rawFormat}, using JSON fallback parser.`);
    return await new JsonRawResultParser().parse(raw);
  }
}

export const resultParserRegistry = new ResultParserRegistry();
