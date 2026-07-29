import { Router } from 'express';
import { resultController } from '../controllers/resultController.js';

const router = Router();

router.get('/results/job/:jobId', resultController.getResultByJob);
router.get('/results/job/:jobId/view', resultController.getViewModel);
router.get('/results/job/:jobId/export/csv', resultController.exportCSV);
router.get('/results/experiment/:experimentId', resultController.getResultsByExperiment);

export default router;
