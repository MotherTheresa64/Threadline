import {describe, expect, it} from 'vitest';
import {normalizeChannelName, normalizeTags, requireText, validateDiscussion, validateEmail, validateReply, ValidationError} from '../../src/validation';

describe('validation', () => {
  it('normalizes email and channel names', () => {
    expect(validateEmail('  Test.User@Example.COM ')).toBe('test.user@example.com');
    expect(normalizeChannelName(' Release Planning ')).toBe('release-planning');
  });

  it('rejects empty and oversized content', () => {
    expect(() => requireText('   ', 'Value', 10)).toThrow(ValidationError);
    expect(() => validateReply('x'.repeat(6001))).toThrow('6,000 characters or fewer');
    expect(() => validateDiscussion('Ok', 'body')).toThrow('at least 3 characters');
  });

  it('deduplicates and bounds normalized tags', () => {
    expect(normalizeTags('API, api, Design System, , SECURITY')).toEqual(['api', 'design-system', 'security']);
    expect(normalizeTags(Array.from({length: 20}, (_, index) => `Tag ${index}`))).toHaveLength(8);
  });
});
