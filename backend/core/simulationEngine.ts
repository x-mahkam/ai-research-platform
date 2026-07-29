import { simulationEngineOrchestrator } from '../simulation/index.js';
import { SimulationJob } from '../shared/types.js';

export interface JobExecutionParams {
  experimentId: string;
}

export class SimulationEngine {
  public async createAndRunJob(params: JobExecutionParams): Promise<SimulationJob> {
    return simulationEngineOrchestrator.submitAndExecute({ experimentId: params.experimentId });
  }
}

export const simulationEngine = new SimulationEngine();
