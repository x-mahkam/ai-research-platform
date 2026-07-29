import { Router } from 'express';
import { pluginController } from '../controllers/pluginController.js';

const router = Router();

router.get('/plugins', pluginController.getPlugins);
router.get('/plugins/health', pluginController.getHealth);
router.get('/plugins/:id', pluginController.getPluginById);
router.post('/plugins/:id/pause', pluginController.pausePlugin);
router.post('/plugins/:id/resume', pluginController.resumePlugin);
router.post('/plugins/:id/configure', pluginController.configurePlugin);

export default router;
