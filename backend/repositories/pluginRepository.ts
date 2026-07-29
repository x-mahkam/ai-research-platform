import { BaseRepository } from './baseRepository.js';
import { PluginEntity } from '../entities/index.js';
import { SimulatorPlugin } from '../shared/types.js';

export interface IPluginRepository {
  findAll(): SimulatorPlugin[];
  findById(id: string): SimulatorPlugin | undefined;
}

export class PluginRepository extends BaseRepository<PluginEntity> implements IPluginRepository {
  constructor() {
    super('plugins');
  }
}

export const pluginRepository = new PluginRepository();
