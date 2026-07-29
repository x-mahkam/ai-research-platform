import { PluginMetadata } from '../sdk/index.js';
import { ValidationError } from '../../shared/errors.js';

export class PluginMetadataInspector {
  public static validateManifest(manifest: any): PluginMetadata {
    if (!manifest || typeof manifest !== 'object') {
      throw new ValidationError('Plugin manifest must be a valid object.');
    }

    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new ValidationError('Plugin manifest must specify a valid "id".');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new ValidationError('Plugin manifest must specify a valid "name".');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new ValidationError('Plugin manifest must specify a valid "version".');
    }

    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description || '',
      author: manifest.author || { name: 'Unknown Author' },
      category: manifest.category || 'General',
      supportedFormats: Array.isArray(manifest.supportedFormats) ? manifest.supportedFormats : [],
      capabilities: Array.isArray(manifest.capabilities) ? manifest.capabilities : [],
      minSdkVersion: manifest.minSdkVersion || '1.0.0',
      license: manifest.license || 'MIT',
      website: manifest.website,
      icon: manifest.icon,
    };
  }

  public static formatSummary(meta: PluginMetadata): string {
    return `${meta.name} (v${meta.version}) [Category: ${meta.category}] - ${meta.description}`;
  }
}
