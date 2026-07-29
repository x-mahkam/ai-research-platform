import { Request, Response, NextFunction } from 'express';
import { pluginService, PluginService } from '../../services/pluginService.js';

export class PluginController {
  constructor(private service: PluginService = pluginService) {}

  public getPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plugins = await this.service.getAllPlugins();
      res.json(plugins);
    } catch (err) {
      next(err);
    }
  };

  public getPluginById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const plugin = await this.service.getPluginById(id);
      if (!plugin) {
        res.status(404).json({ error: `Plugin with ID ${id} not found.` });
        return;
      }
      res.json(plugin);
    } catch (err) {
      next(err);
    }
  };

  public getHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const healthReport = await this.service.checkHealth();
      res.json(healthReport);
    } catch (err) {
      next(err);
    }
  };

  public pausePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.pausePlugin(id);
      res.json({ message: `Plugin ${id} paused.` });
    } catch (err) {
      next(err);
    }
  };

  public resumePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.resumePlugin(id);
      res.json({ message: `Plugin ${id} resumed.` });
    } catch (err) {
      next(err);
    }
  };

  public configurePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { executablePath } = req.body;
      await this.service.configurePlugin(id, { executablePath });
      res.json({ message: `Plugin ${id} configuration updated successfully.`, executablePath });
    } catch (err) {
      next(err);
    }
  };
}

export const pluginController = new PluginController();
