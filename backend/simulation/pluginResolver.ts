/**
 * Maps a human-facing simulator name (as stored on a project / model /
 * experiment) to the id of the registered execution plugin that actually runs
 * it. Without this, experiments created through the UI carry a placeholder
 * pluginId ("plugin-auto") that isn't in the registry, so execution falls
 * through to the generic "awaiting real simulator" adapter and the real solver
 * (COMSOL, Sentaurus, …) is never invoked.
 */
const SIMULATOR_KEYWORD_TO_PLUGIN: Array<{ match: RegExp; pluginId: string }> = [
  { match: /comsol/i, pluginId: 'comsol-multiphysics' },
  { match: /sentaurus/i, pluginId: 'sentaurus-tcad' },
  { match: /quantum\s*atk|quantumatk|\bqatk\b/i, pluginId: 'quantum-atk' },
  { match: /lumerical/i, pluginId: 'lumerical-fdtd' },
  { match: /silvaco|atlas/i, pluginId: 'silvaco-atlas' },
  { match: /matlab|simulink/i, pluginId: 'matlab-simulink' },
  { match: /hfss|ansys/i, pluginId: 'ansys-hfss' },
  { match: /openfoam|foam/i, pluginId: 'openfoam-cfd' },
];

// Plugin ids already registered in the runtime — a value that is already a real
// id should be trusted as-is.
const KNOWN_PLUGIN_IDS = new Set(SIMULATOR_KEYWORD_TO_PLUGIN.map((e) => e.pluginId));

/**
 * Resolves the registered plugin id for a run. Prefers an explicit, already-real
 * pluginId; otherwise derives one from the simulator name. Returns undefined
 * when nothing matches, so the caller can keep the existing behavior.
 */
export function resolvePluginId(candidatePluginId?: string, simulatorName?: string): string | undefined {
  if (candidatePluginId && KNOWN_PLUGIN_IDS.has(candidatePluginId)) {
    return candidatePluginId;
  }
  if (simulatorName) {
    const hit = SIMULATOR_KEYWORD_TO_PLUGIN.find((e) => e.match.test(simulatorName));
    if (hit) return hit.pluginId;
  }
  if (candidatePluginId) {
    const hit = SIMULATOR_KEYWORD_TO_PLUGIN.find((e) => e.match.test(candidatePluginId));
    if (hit) return hit.pluginId;
  }
  return undefined;
}
