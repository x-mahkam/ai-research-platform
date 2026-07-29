import { Request, Response } from 'express';
import { config } from '../../configuration/index.js';

export class HealthController {
  public checkHealth = (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: config.version,
      service: config.serviceName,
    });
  };
}

export const healthController = new HealthController();
