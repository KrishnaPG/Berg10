import { describe, it, expect } from 'bun:test';
import { ISOGitBackend } from '../src/services/drivers/isogit';

describe('Simple Test', () => {
  it('should create ISOGitBackend instance', () => {
    const backend = new ISOGitBackend();
    expect(backend).toBeDefined();
    expect(typeof backend).toBe('object');
  });
});