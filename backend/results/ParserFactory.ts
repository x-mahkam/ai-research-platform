import { IResultParser } from './parser/index.js';
import { SentaurusPltParser, SentaurusLogParser } from './parser/sentaurusParser.js';

export class ParserFactory {
  public static createParserForSimulator(simulatorOrPlugin: string): IResultParser {
    const sim = simulatorOrPlugin.toLowerCase();
    if (sim.includes('sentaurus') || sim.includes('tcad') || sim.includes('sdevice')) {
      return new SentaurusPltParser();
    }
    // Generic fallback parsers
    return new SentaurusPltParser();
  }
}
