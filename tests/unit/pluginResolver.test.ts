import { describe, it, expect } from 'vitest';
import { resolvePluginId } from '../../backend/simulation/pluginResolver.js';

describe('resolvePluginId', () => {
  it('maps simulator names to registered plugin ids', () => {
    expect(resolvePluginId('plugin-auto', 'COMSOL Multiphysics')).toBe('comsol-multiphysics');
    expect(resolvePluginId('plugin-auto', 'Synopsys Sentaurus TCAD')).toBe('sentaurus-tcad');
    expect(resolvePluginId('plugin-auto', 'QuantumATK')).toBe('quantum-atk');
    expect(resolvePluginId('plugin-auto', 'Ansys Lumerical FDTD')).toBe('lumerical-fdtd');
    expect(resolvePluginId('plugin-auto', 'Silvaco Atlas')).toBe('silvaco-atlas');
    expect(resolvePluginId('plugin-auto', 'OpenFOAM CFD')).toBe('openfoam-cfd');
  });

  it('trusts an already-registered plugin id', () => {
    expect(resolvePluginId('comsol-multiphysics', undefined)).toBe('comsol-multiphysics');
  });

  it('falls back to matching the candidate id when no simulator name is given', () => {
    expect(resolvePluginId('comsol', undefined)).toBe('comsol-multiphysics');
  });

  it('returns undefined when nothing matches', () => {
    expect(resolvePluginId('plugin-auto', 'Unknown Solver X')).toBeUndefined();
    expect(resolvePluginId(undefined, undefined)).toBeUndefined();
  });
});
