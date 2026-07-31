import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ComsolNotFoundError } from './errors.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ComsolLocator');

export class ComsolLocator {
  private static manualPath: string | null = null;

  public static setManualPath(execPath: string | null): void {
    this.manualPath = execPath;
    if (execPath) {
      logger.info(`Manual COMSOL path configured: ${execPath}`);
    }
  }

  public static getManualPath(): string | null {
    return this.manualPath;
  }

  public static locate(): string {
    const foundPath = this.findExecutable();
    if (!foundPath) {
      throw new ComsolNotFoundError(
        'COMSOL Multiphysics executable (comsolbatch) was not detected on this workstation. ' +
        'Please install COMSOL or configure the manual executable path in Settings.'
      );
    }
    return foundPath;
  }

  /**
   * Resolve a user-supplied path (a comsolbatch file OR a folder that contains
   * it) to the actual executable FILE, or null. Used for both the manual path
   * and the env vars so a folder is never returned in place of the binary.
   */
  private static resolveFromPath(val: string): string | null {
    if (!val) return null;
    try {
      if (fs.existsSync(val) && fs.statSync(val).isFile()) {
        return val;
      }
    } catch {
      return null;
    }
    const candidates = [
      path.join(val, 'comsolbatch'),
      path.join(val, 'comsolbatch.exe'),
      path.join(val, 'bin', 'comsolbatch'),
      path.join(val, 'bin', 'comsolbatch.exe'),
      path.join(val, 'bin', 'win64', 'comsolbatch.exe'),
      path.join(val, 'Multiphysics', 'bin', 'win64', 'comsolbatch.exe'),
      path.join(val, 'multiphysics', 'bin', 'comsolbatch'),
      path.join(val, 'multiphysics', 'bin', 'win64', 'comsolbatch.exe'),
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  public static findExecutable(): string | null {
    // 0. Manual Override Path (a file or a folder that contains comsolbatch)
    if (this.manualPath) {
      const resolved = this.resolveFromPath(this.manualPath);
      if (resolved) return resolved;
    }

    // 1. Environment Variables
    const envVars = ['COMSOL_EXECUTABLE', 'COMSOLBATCH_PATH', 'COMSOL_PATH', 'COMSOL_ROOT'];
    for (const envVar of envVars) {
      const val = process.env[envVar];
      const resolved = val ? this.resolveFromPath(val) : null;
      if (resolved) return resolved;
    }

    // 2. PATH Environment Variable
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    const binaries = ['comsolbatch', 'comsolbatch.exe', 'comsol', 'comsol.exe'];
    for (const dir of pathDirs) {
      for (const bin of binaries) {
        const full = path.join(dir, bin);
        if (fs.existsSync(full)) {
          try {
            if (fs.statSync(full).isFile()) return full;
          } catch {
            // ignore permission or stat error
          }
        }
      }
    }

    // 3. Windows Registry (if running on Windows)
    if (process.platform === 'win32') {
      const registryPath = this.searchWindowsRegistry();
      if (registryPath && fs.existsSync(registryPath)) {
        return registryPath;
      }
    }

    // 4. Common Install Locations
    const commonPaths = this.getCommonInstallPaths();
    for (const candidate of commonPaths) {
      if (fs.existsSync(candidate)) {
        try {
          if (fs.statSync(candidate).isFile()) return candidate;
        } catch {
          // ignore
        }
      }
    }

    return null;
  }

  private static searchWindowsRegistry(): string | null {
    const regKeys = [
      'HKLM\\SOFTWARE\\COMSOL',
      'HKLM\\SOFTWARE\\COMSOL\\COMSOL Multiphysics',
      'HKLM\\SOFTWARE\\WOW6432Node\\COMSOL',
    ];

    for (const key of regKeys) {
      try {
        const output = execSync(`reg query "${key}" /s`, { encoding: 'utf-8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('Path') || line.includes('InstallDir') || line.includes('COMSOL')) {
            const parts = line.trim().split(/\s{2,}/);
            const pathVal = parts[parts.length - 1];
            if (pathVal && fs.existsSync(pathVal)) {
              const exe = path.join(pathVal, 'bin', 'win64', 'comsolbatch.exe');
              if (fs.existsSync(exe)) return exe;
            }
          }
        }
      } catch {
        // Registry query failed or key doesn't exist
      }
    }
    return null;
  }

  private static getCommonInstallPaths(): string[] {
    const paths: string[] = [];

    if (process.platform === 'win32') {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const versions = ['64', '63', '62', '61', '60', '56', '55'];
      for (const ver of versions) {
        paths.push(path.join(programFiles, 'COMSOL', `COMSOL${ver}`, 'Multiphysics', 'bin', 'win64', 'comsolbatch.exe'));
        paths.push(path.join(programFiles, 'COMSOL', `COMSOL${ver}`, 'Multiphysics', 'bin', 'win64', 'comsol.exe'));
      }
      paths.push('C:\\COMSOL\\Multiphysics\\bin\\win64\\comsolbatch.exe');
    } else if (process.platform === 'darwin') {
      const versions = ['64', '63', '62', '61', '60', '56'];
      for (const ver of versions) {
        paths.push(`/Applications/COMSOL${ver}/Multiphysics/bin/comsolbatch`);
        paths.push(`/Applications/COMSOL${ver}/bin/comsolbatch`);
      }
      paths.push('/Applications/COMSOL/bin/comsolbatch');
    } else {
      // Linux
      const versions = ['64', '63', '62', '61', '60', '56'];
      for (const ver of versions) {
        paths.push(`/usr/local/comsol${ver}/multiphysics/bin/comsolbatch`);
        paths.push(`/opt/comsol${ver}/multiphysics/bin/comsolbatch`);
        paths.push(`/usr/local/comsol${ver}/bin/comsolbatch`);
      }
      paths.push('/usr/local/comsol/bin/comsolbatch');
      paths.push('/opt/comsol/bin/comsolbatch');
      paths.push('/usr/local/bin/comsolbatch');
    }

    return paths;
  }
}
