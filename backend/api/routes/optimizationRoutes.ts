import { Router } from 'express';
import { optimizationController } from '../controllers/optimizationController.js';

const router = Router();

router.get('/optimizations', optimizationController.getOptimizations);
router.post('/optimizations', optimizationController.createOptimization);
router.post('/optimizations/:id/step', optimizationController.stepOptimization);

export default router;
