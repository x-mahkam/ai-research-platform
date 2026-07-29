import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';

const router = Router();

router.post('/ai/chat', aiController.chat);
router.post('/ai/report', aiController.generateReport);
router.post('/ai/plan', aiController.planExperiment);
router.post('/ai/analyze', aiController.analyzeResults);
router.post('/ai/optimize', aiController.predictOptimization);
router.get('/ai/knowledge', aiController.queryKnowledge);

export default router;
