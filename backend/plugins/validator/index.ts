import { IPlugin, PluginMetadata } from '../sdk/index.js';
import { PluginMetadataInspector } from '../metadata/index.js';

export interface IValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

export class PluginValidator {
  public async validatePluginContract(plugin: IPlugin): Promise<IValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredMethods: (keyof IPlugin)[] = [
      'metadata',
      'initialize',
      'validate',
      'prepare',
      'execute',
      'pause',
      'resume',
      'terminate',
      'collectResults',
      'cleanup',
      'health',
    ];

    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        errors.push(`Plugin missing required SDK method: ${method}()`);
      }
    }

    let meta: PluginMetadata | undefined;
    try {
      meta = await plugin.metadata();
      PluginMetadataInspector.validateManifest(meta);
    } catch (err: any) {
      errors.push(`Metadata validation failed: ${err.message}`);
    }

    if (meta && meta.capabilities.length === 0) {
      warnings.push('Plugin lists no specific capabilities in manifest.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  public async validateParameters(
    plugin: IPlugin,
    parameters: Record<string, unknown>
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      return await plugin.validate(parameters);
    } catch (err: any) {
      return { valid: false, errors: [`Exception during parameter validation: ${err.message}`] };
    }
  }
}

export const pluginValidator = new PluginValidator();
