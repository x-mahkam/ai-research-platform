import { IAllowedParameterRange } from '../types.js';

export class ParameterGenerator {
  /**
   * Enforces physical and manufacturing bounds on a parameter dictionary
   */
  public sanitizeParameters(
    parameters: Record<string, number | string>,
    allowedRanges: Record<string, IAllowedParameterRange>
  ): Record<string, number | string> {
    const sanitized: Record<string, number | string> = {};

    for (const [key, val] of Object.entries(parameters)) {
      if (typeof val === 'string') {
        sanitized[key] = val;
        continue;
      }

      let numVal = val;
      const range = allowedRanges[key];

      // Physical guardrails for known TCAD / Semiconductor physics parameters
      numVal = this.applyPhysicalGuardrails(key, numVal);

      if (range) {
        // Enforce Range Bounds
        if (range.min !== undefined && numVal < range.min) {
          numVal = range.min;
        }
        if (range.max !== undefined && numVal > range.max) {
          numVal = range.max;
        }

        // Enforce Step Discretization
        if (range.step && range.step > 0) {
          const stepsFromMin = Math.round((numVal - (range.min || 0)) / range.step);
          numVal = (range.min || 0) + stepsFromMin * range.step;
          // Precision clamp
          numVal = parseFloat(numVal.toFixed(6));
        }
      }

      sanitized[key] = numVal;
    }

    return sanitized;
  }

  /**
   * Applies fundamental semiconductor physics guardrails
   */
  private applyPhysicalGuardrails(key: string, value: number): number {
    const lowerKey = key.toLowerCase();

    // Work function must be physically achievable (3.8 eV to 5.6 eV for metal gates)
    if (lowerKey.includes('workfunction') || lowerKey.includes('gateworkfunction')) {
      return Math.min(Math.max(value, 3.8), 5.6);
    }

    // Equivalent Oxide Thickness (EOT) must be > 0.3 nm to prevent mathematical breakdown
    if (lowerKey.includes('eot') || lowerKey.includes('tox') || lowerKey.includes('oxide')) {
      return Math.min(Math.max(value, 0.3), 10.0);
    }

    // Channel / Source-Drain Doping concentration must be between 1e14 cm^-3 and 5e20 cm^-3
    if (lowerKey.includes('doping')) {
      return Math.min(Math.max(value, 1e14), 5e20);
    }

    // Supply Voltage (Vdd) must be positive and non-destructive (< 3.3V)
    if (lowerKey === 'vdd' || lowerKey.includes('supplyvoltage') || lowerKey.includes('voltage')) {
      return Math.min(Math.max(value, 0.1), 3.3);
    }

    // Temperature must be above absolute zero and below silicon melting (200K to 800K)
    if (lowerKey.includes('temp') || lowerKey.includes('temperature')) {
      return Math.min(Math.max(value, 200), 800);
    }

    // Channel length must be physical (> 1 nm)
    if (lowerKey.includes('channellength') || lowerKey === 'lg' || lowerKey === 'l_channel') {
      return Math.min(Math.max(value, 1.0), 1000.0);
    }

    return value;
  }

  /**
   * Nudges a parameter along a gradient direction while keeping it strictly physical
   */
  public stepParameter(
    key: string,
    currentValue: number,
    delta: number,
    range?: IAllowedParameterRange
  ): number {
    const rawNewVal = currentValue + delta;
    const sanitizedDict = this.sanitizeParameters(
      { [key]: rawNewVal },
      range ? { [key]: range } : {}
    );
    return sanitizedDict[key] as number;
  }
}

export const parameterGenerator = new ParameterGenerator();
