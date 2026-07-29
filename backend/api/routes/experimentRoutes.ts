import { Router } from 'express';
import { experimentController } from '../controllers/experimentController.js';

const router = Router();

router.get('/experiments', experimentController.getExperiments);
router.post('/experiments', experimentController.createExperiment);
router.get('/experiments/:id', experimentController.getExperimentById);
router.post('/experiments/:id/clone', experimentController.cloneExperiment);
router.put('/experiments/:id', experimentController.updateExperiment);

export default router;
