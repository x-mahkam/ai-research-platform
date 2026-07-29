import { describe, it, expect } from 'vitest';
import { PluginService } from '../../backend/services/pluginService.js';
import { ValidationError } from '../../backend/shared/errors.js';

const service = new PluginService();

describe('PluginService.configurePlugin executablePath validation', () => {
  it('rejects an arbitrary non-COMSOL binary path', async () => {
    await expect(
      service.configurePlugin('comsol', { executablePath: '/bin/sh' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a relative path', async () => {
    await expect(
      service.configurePlugin('comsol', { executablePath: 'comsolbatch' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a non-existent absolute comsol path', async () => {
    await expect(
      service.configurePlugin('comsol', { executablePath: '/nonexistent/path/comsolbatch' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('ignores executablePath for non-COMSOL plugins (no throw, no-op)', async () => {
    await expect(
      service.configurePlugin('sentaurus-tcad', { executablePath: '/bin/sh' })
    ).resolves.toBeUndefined();
  });
});
