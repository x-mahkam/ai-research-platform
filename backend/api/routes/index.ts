import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import projectRoutes from './projectRoutes.js';
import experimentRoutes from './experimentRoutes.js';
import simulationRoutes from './simulationRoutes.js';
import pluginRoutes from './pluginRoutes.js';
import optimizationRoutes from './optimizationRoutes.js';
import aiRoutes from './aiRoutes.js';
import reportRoutes from './reportRoutes.js';
import resultRoutes from './resultRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(projectRoutes);
apiRouter.use(experimentRoutes);
apiRouter.use(simulationRoutes);
apiRouter.use(pluginRoutes);
apiRouter.use(optimizationRoutes);
apiRouter.use(aiRoutes);
apiRouter.use(reportRoutes);
apiRouter.use(resultRoutes);

export default apiRouter;
