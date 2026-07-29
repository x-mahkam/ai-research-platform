import { Router } from 'express';
import { simulationController } from '../controllers/simulationController.js';

const router = Router();

router.get('/simulations', simulationController.getSimulations);
router.post('/simulations/run', simulationController.runSimulation);
router.post('/simulations/:id/action', simulationController.handleJobAction);

// Scheduler endpoints
router.get('/scheduler/status', simulationController.getSchedulerStatus);
router.post('/scheduler/pause', simulationController.pauseScheduler);
router.post('/scheduler/resume', simulationController.resumeScheduler);
router.post('/scheduler/policy', simulationController.setSchedulerPolicy);
router.post('/scheduler/concurrency', simulationController.setSchedulerConcurrency);
router.post('/scheduler/recovery', simulationController.triggerWorkerRecovery);

export default router;
