import { ValidationError } from '../../shared/errors.js';

export interface RunSimulationDTO {
  experimentId: string;
  /** Optional COMSOL Global Parameter overrides for this run (name → value). */
  parameterOverrides?: Record<string, string | number>;
}

// COMSOL parameter names are identifiers; values may carry units/expressions
// (e.g. "0.7[V]", "range(0,0.1,1)") but must not contain a comma, which is the
// -pname/-plist list separator, nor control characters.
const PARAM_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const PARAM_VALUE_PATTERN = /^[A-Za-z0-9_.\-+*/^()\[\] ]{1,64}$/;

export function validateParameterOverrides(raw: unknown): Record<string, string | number> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') {
    throw new ValidationError('parameterOverrides must be an object of name → value.');
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > 32) {
    throw new ValidationError('parameterOverrides supports at most 32 parameters.');
  }
  const out: Record<string, string | number> = {};
  for (const [name, value] of entries) {
    if (!PARAM_NAME_PATTERN.test(name)) {
      throw new ValidationError(`Invalid parameter name "${name}".`);
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new ValidationError(`Parameter "${name}" has a non-finite value.`);
      out[name] = value;
    } else if (typeof value === 'string') {
      if (!PARAM_VALUE_PATTERN.test(value)) {
        throw new ValidationError(`Invalid value for parameter "${name}".`);
      }
      out[name] = value;
    } else {
      throw new ValidationError(`Parameter "${name}" must be a number or string.`);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export interface JobActionDTO {
  action: 'pause' | 'resume' | 'cancel' | 'retry';
}

// IDs are used to build filesystem paths (workspace directories), so they must
// never contain path separators or traversal sequences.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function assertSafeId(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a string of letters, digits, "-" or "_" (max 128 chars).`
    );
  }
  return value;
}

export function validateRunSimulationDTO(data: any): RunSimulationDTO {
  if (!data || !data.experimentId) {
    throw new ValidationError('experimentId is required to execute a simulation.');
  }
  return {
    experimentId: assertSafeId(data.experimentId, 'experimentId'),
    parameterOverrides: validateParameterOverrides(data.parameterOverrides),
  };
}

export function validateJobActionDTO(data: any): JobActionDTO {
  const validActions = ['pause', 'resume', 'cancel', 'retry'];
  if (!data || !validActions.includes(data.action)) {
    throw new ValidationError(`action must be one of: ${validActions.join(', ')}`);
  }
  return { action: data.action };
}
