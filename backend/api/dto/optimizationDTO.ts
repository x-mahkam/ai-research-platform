export interface CreateOptimizationDTO {
  title?: string;
  algorithm?: string;
  targetMetric?: string;
  totalIterations?: number;
  parameters?: any[];
}
