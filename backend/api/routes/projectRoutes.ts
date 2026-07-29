import { Router } from 'express';
import { projectController } from '../controllers/projectController.js';
import { modelController } from '../controllers/modelController.js';

const router = Router();

router.get('/projects', projectController.getProjects);
router.post('/projects', projectController.createProject);
router.get('/projects/:id', projectController.getProjectById);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

// Project Model File Management Routes
router.get('/projects/:projectId/models', modelController.getProjectModels);
router.post('/projects/:projectId/models', modelController.createModel);
router.get('/projects/:projectId/models/:modelId', modelController.getModelById);
router.put('/projects/:projectId/models/:modelId', modelController.updateModel);
router.delete('/projects/:projectId/models/:modelId', modelController.deleteModel);
router.post('/projects/:projectId/models/:modelId/duplicate', modelController.duplicateModel);
router.get('/projects/:projectId/models/:modelId/download', modelController.downloadModel);
router.put('/projects/:projectId/models/:modelId/default', modelController.setDefaultModel);
router.put('/projects/:projectId/models/:modelId/replace', modelController.replaceModel);

// Model validation and metadata auto-detection routes
router.post('/models/detect', modelController.detectMetadata);
router.post('/models/validate', modelController.validateModel);

export default router;
