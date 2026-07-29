import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';

const router = Router();

router.get('/reports', reportController.getReports);

export default router;
