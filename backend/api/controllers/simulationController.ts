import { Request, Response, NextFunction } from 'express';
import { simulationService, SimulationService } from '../../services/simulationService.js';
import { validateRunSimulationDTO, validateJobActionDTO } from '../dto/simulationDTO.js';

export class SimulationController {
  constructor(private service: SimulationService = simulationService) {}

  public getSimulations = (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = this.service.getAllJobs();
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  };

  public runSimulation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { experimentId } = validateRunSimulationDTO(req.body);
      const newJob = await this.service.runSimulation(experimentId);
      res.status(201).json(newJob);
    } catch (err) {
      next(err);
    }
  };

  public handleJobAction = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { action } = validateJobActionDTO(req.body);
      const updatedJob = this.service.executeJobAction(id, action);
      res.json(updatedJob);
    } catch (err) {
      next(err);
    }
  };

  public getSchedulerStatus = (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = this.service.getSchedulerState();
      res.json(state);
    } catch (err) {
      next(err);
    }
  };

  public pauseScheduler = (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = this.service.pauseQueue();
      res.json(state);
    } catch (err) {
      next(err);
    }
  };

  public resumeScheduler = (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = this.service.resumeQueue();
      res.json(state);
    } catch (err) {
      next(err);
    }
  };

  public setSchedulerPolicy = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode } = req.body;
      const state = this.service.setQueuePolicy(mode || 'PRIORITY');
      res.json(state);
    } catch (err) {
      next(err);
    }
  };

  public setSchedulerConcurrency = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { concurrency } = req.body;
      const state = this.service.setConcurrency(Number(concurrency) || 4);
      res.json(state);
    } catch (err) {
      next(err);
    }
  };

  public triggerWorkerRecovery = (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = this.service.triggerWorkerRecovery();
      res.json(state);
    } catch (err) {
      next(err);
    }
  };
}

export const simulationController = new SimulationController();
