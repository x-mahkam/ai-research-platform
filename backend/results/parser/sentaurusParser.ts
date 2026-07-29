import { IResultParser, ParsedOutputData } from './index.js';
import { IRawPluginOutput } from '../types.js';

/**
 * Real Synopsys Sentaurus TCAD .plt File Parser
 * Parses ASCII DFISE PLT format containing plot variables and tabular numeric data.
 */
export class SentaurusPltParser implements IResultParser {
  public parserName = 'Sentaurus-PLT-Parser';

  public canParse(rawFormat: string, pluginId: string): boolean {
    const fmt = rawFormat.toUpperCase();
    return fmt === 'PLT' || pluginId === 'sentaurus-tcad' || pluginId === 'silvaco-atlas';
  }

  public async parse(raw: IRawPluginOutput): Promise<ParsedOutputData> {
    const content = typeof raw.rawData === 'string' ? raw.rawData : String(raw.rawData || '');
    const lines = content.split('\n');

    const variables: string[] = [];
    let inVariables = false;
    let inData = false;
    const dataRows: number[][] = [];

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.toLowerCase().startsWith('variables')) {
        inVariables = true;
        continue;
      }

      if (inVariables && line === '}') {
        inVariables = false;
        continue;
      }

      if (inVariables) {
        // Match quoted variable names like "gate Voltage" "V" or "drain Current" "A"
        const matches = [...line.matchAll(/"([^"]+)"/g)];
        if (matches.length > 0) {
          variables.push(matches[0][1]);
        }
        continue;
      }

      if (line.toLowerCase().startsWith('data')) {
        inData = true;
        continue;
      }

      if (inData && line === '}') {
        inData = false;
        continue;
      }

      if (inData || (!inVariables && /^[0-9eE.+\-\s]+$/.test(line))) {
        const tokens = line.split(/\s+/).map((t) => parseFloat(t)).filter((n) => !isNaN(n));
        if (tokens.length > 0) {
          dataRows.push(tokens);
        }
      }
    }

    if (dataRows.length === 0) {
      return {
        metrics: { 'Status': 'Waiting for real simulator output file' },
        series: [],
        rawText: content,
      };
    }

    // Determine X (Voltage) and Y (Current) columns
    let xIdx = 0;
    let yIdx = variables.length > 1 ? 1 : 0;

    for (let i = 0; i < variables.length; i++) {
      const vName = variables[i].toLowerCase();
      if (vName.includes('gate') || vName.includes('voltage') || vName.includes('v_g')) {
        xIdx = i;
      }
      if (vName.includes('drain') || vName.includes('current') || vName.includes('i_d')) {
        yIdx = i;
      }
    }

    const curveData = dataRows.map((row) => ({
      x: row[xIdx] !== undefined ? row[xIdx] : 0,
      y: Math.abs(row[yIdx] !== undefined ? row[yIdx] : 0),
    }));

    // Real Physics calculations from data points
    const metrics: Record<string, string | number> = {};
    if (curveData.length > 0) {
      const maxPoint = curveData.reduce((prev, curr) => (curr.y > prev.y ? curr : prev), curveData[0]);
      const minPoint = curveData.reduce((prev, curr) => (curr.y < prev.y ? curr : prev), curveData[0]);

      metrics['Ion (ON Current)'] = `${maxPoint.y.toExponential(3)} A/µm`;
      metrics['Ioff (OFF Current)'] = `${minPoint.y.toExponential(3)} A/µm`;
      if (minPoint.y > 0) {
        metrics['Ion/Ioff Ratio'] = (maxPoint.y / minPoint.y).toExponential(2);
      }

      // Calculate Subthreshold Swing (mV/dec)
      let minSlope = Infinity;
      for (let i = 1; i < curveData.length; i++) {
        const dx = curveData[i].x - curveData[i - 1].x;
        const dyLog = Math.log10(curveData[i].y) - Math.log10(curveData[i - 1].y);
        if (dx > 0 && dyLog > 0) {
          const ss = (dx / dyLog) * 1000; // mV/dec
          if (ss > 50 && ss < 300) {
            minSlope = Math.min(minSlope, ss);
          }
        }
      }
      if (minSlope !== Infinity) {
        metrics['Subthreshold Swing'] = `${minSlope.toFixed(1)} mV/dec`;
      }
    }

    return {
      metrics,
      series: [
        {
          id: 'sentaurus-plt-curve',
          title: 'Sentaurus TCAD Measured Curve',
          xAxisLabel: variables[xIdx] || 'Voltage V (V)',
          yAxisLabel: variables[yIdx] || 'Current I (A)',
          data: curveData,
        },
      ],
      rawText: content,
    };
  }
}

/**
 * Real Sentaurus Log File Parser
 * Extracts Newton convergence, node count, memory, and CPU time from Sentaurus .log output.
 */
export class SentaurusLogParser implements IResultParser {
  public parserName = 'Sentaurus-Log-Parser';

  public canParse(rawFormat: string, pluginId: string): boolean {
    const fmt = rawFormat.toUpperCase();
    return fmt === 'LOG' && pluginId === 'sentaurus-tcad';
  }

  public async parse(raw: IRawPluginOutput): Promise<ParsedOutputData> {
    const text = typeof raw.rawData === 'string' ? raw.rawData : String(raw.rawData || '');
    const metrics: Record<string, string | number> = {};

    if (text.includes('CONVERGED') || text.includes('Newton-Raphson')) {
      metrics['Solver Convergence'] = 'CONVERGED_NEWTON_RAPHSON';
    } else if (text.includes('AWAITING_REAL_SIMULATOR')) {
      metrics['Solver Status'] = 'Waiting for real simulator integration';
    } else {
      metrics['Solver Convergence'] = 'IN_PROGRESS_OR_COMPLETED';
    }

    const meshMatch = text.match(/Mesh Nodes:\s*(\d+)/i) || text.match(/Total Nodes:\s*(\d+)/i);
    if (meshMatch) {
      metrics['Mesh Node Count'] = parseInt(meshMatch[1], 10);
    }

    const cpuMatch = text.match(/Cpu Time:\s*([\d.]+)\s*s/i) || text.match(/Elapsed:\s*([\d.]+)\s*s/i);
    if (cpuMatch) {
      metrics['CPU Execution Time'] = `${cpuMatch[1]} s`;
    }

    const memMatch = text.match(/Memory:\s*([\d.]+)\s*MB/i);
    if (memMatch) {
      metrics['Peak Memory Usage'] = `${memMatch[1]} MB`;
    }

    return {
      metrics,
      series: [],
      rawText: text,
    };
  }
}
