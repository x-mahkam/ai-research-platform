import { Request, Response, NextFunction } from 'express';
import { projectService, ProjectService } from '../../services/projectService.js';
import { validateCreateProjectDTO } from '../dto/projectDTO.js';

export class ProjectController {
  constructor(private service: ProjectService = projectService) {}

  public getProjects = (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = this.service.getAllProjects();
      res.json(projects);
    } catch (err) {
      next(err);
    }
  };

  public getProjectById = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const project = this.service.getProjectById(id);
      res.json(project);
    } catch (err) {
      next(err);
    }
  };

  public createProject = (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validateCreateProjectDTO(req.body);
      const newProject = this.service.createProject(validatedData);
      res.status(201).json(newProject);
    } catch (err) {
      next(err);
    }
  };

  public updateProject = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updated = this.service.updateProject(id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  public deleteProject = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = this.service.deleteProject(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const projectController = new ProjectController();
