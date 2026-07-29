export interface IRawPluginOutput {
  pluginId: string;
  rawFormat: string; // e.g. 'JSON', 'PLT', 'CSV', 'HDF5', 'TEXT'
  rawData: unknown;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface IARPPoint {
  x: number;
  y: number;
  z?: number;
}

export interface IARPCurveVector {
  id: string;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  data: IARPPoint[];
  unitX?: string;
  unitY?: string;
}

export type IARPMetrics = Record<string, string | number>;

export interface IARPSpatialData {
  dimensions: '2D' | '3D';
  meshNodes?: Array<{ x: number; y: number; z?: number }>;
  fieldValues?: Record<string, number[]>;
}

export interface IARPUnifiedResults {
  id: string;
  experimentId: string;
  jobId: string;
  pluginId: string;
  timestamp: string;
  metrics: IARPMetrics;
  curves: IARPCurveVector[];
  spatialData?: IARPSpatialData;
  rawOutputReference?: string;
  summary: string;
}

export interface ResultConversionContext {
  experimentId: string;
  jobId: string;
  pluginId: string;
}
