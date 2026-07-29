import { ISimulationCurve } from './ResultModel.js';

export interface IRawColumnData {
  headerName: string;
  unit: string;
  values: number[];
}

export class CurveExtractor {
  /**
   * Parses raw tabular text data (space or tab separated columns) with variable header declarations
   */
  public extractCurvesFromPlt(pltContent: string): ISimulationCurve[] {
    const lines = pltContent.split('\n');
    const variables: { name: string; unit: string }[] = [];
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
        // e.g. "gate Voltage" "V"
        const matches = [...line.matchAll(/"([^"]+)"/g)];
        if (matches.length >= 2) {
          variables.push({ name: matches[0][1], unit: matches[1][1] });
        } else if (matches.length === 1) {
          variables.push({ name: matches[0][1], unit: '' });
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

    if (dataRows.length === 0 || variables.length === 0) {
      return [];
    }

    // Transpose data rows to columns
    const columns: IRawColumnData[] = variables.map((v, colIdx) => ({
      headerName: v.name,
      unit: v.unit,
      values: dataRows.map((row) => (row[colIdx] !== undefined ? row[colIdx] : 0)),
    }));

    // Detect Voltage (X) and Current (Y) columns
    let xColIdx = 0;
    let yColIndices: number[] = [];

    for (let i = 0; i < columns.length; i++) {
      const h = columns[i].headerName.toLowerCase();
      if (h.includes('gate') && (h.includes('v') || h.includes('voltage'))) {
        xColIdx = i;
      }
    }

    for (let i = 0; i < columns.length; i++) {
      if (i === xColIdx) continue;
      const h = columns[i].headerName.toLowerCase();
      if (h.includes('current') || h.includes('drain') || h.includes('gate') || h.includes('i_')) {
        yColIndices.push(i);
      }
    }

    if (yColIndices.length === 0 && columns.length > 1) {
      yColIndices.push(xColIdx === 0 ? 1 : 0);
    }

    const curves: ISimulationCurve[] = [];
    const xCol = columns[xColIdx];

    for (const yIdx of yColIndices) {
      const yCol = columns[yIdx];
      const yName = yCol.headerName.toLowerCase();

      let curveType: ISimulationCurve['type'] = 'Generic';
      if (yName.includes('drain') || yName.includes('i_d')) {
        curveType = 'Id-Vg';
      } else if (yName.includes('gate') || yName.includes('i_g')) {
        curveType = 'Ig-Vg';
      }

      curves.push({
        id: `curve-${yCol.headerName.replace(/\s+/g, '-').toLowerCase()}`,
        name: `${yCol.headerName} vs ${xCol.headerName}`,
        type: curveType,
        xAxisName: xCol.headerName,
        xAxisUnit: xCol.unit || 'V',
        yAxisName: yCol.headerName,
        yAxisUnit: yCol.unit || 'A',
        xValues: xCol.values,
        yValues: yCol.values,
      });
    }

    return curves;
  }
}

export const curveExtractor = new CurveExtractor();
