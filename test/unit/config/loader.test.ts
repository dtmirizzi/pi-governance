import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../../src/lib/config/loader.js';

describe('loadConfig', () => {
  it('returns built-in defaults when no config file exists', () => {
    const { config, source } = loadConfig();
    expect(source).toBe('built-in');
    expect(config.auth?.provider).toBe('env');
    expect(config.policy?.engine).toBe('yaml');
  });
});
