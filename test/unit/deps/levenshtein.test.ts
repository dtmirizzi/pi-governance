import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  normalizedSimilarity,
  normalizeName,
  detectTyposquat,
} from '../../../src/lib/deps/levenshtein.js';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('returns length for empty string comparison', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('computes single character edits', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
    expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
    expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
  });

  it('computes multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles real typosquat examples', () => {
    expect(levenshteinDistance('lodash', 'lodas')).toBe(1);
    expect(levenshteinDistance('express', 'expresss')).toBe(1);
    expect(levenshteinDistance('mongoose', 'mongose')).toBe(1);
  });
});

describe('normalizedSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(normalizedSimilarity('abc', 'abc')).toBe(1.0);
  });

  it('returns 0 for completely different strings', () => {
    expect(normalizedSimilarity('abc', 'xyz')).toBe(0);
  });

  it('returns high similarity for near-matches', () => {
    expect(normalizedSimilarity('express', 'expresss')).toBeGreaterThan(0.85);
  });
});

describe('normalizeName', () => {
  it('strips npm scope', () => {
    expect(normalizeName('@types/node')).toBe('node');
    expect(normalizeName('@babel/core')).toBe('core');
  });

  it('removes hyphens and underscores', () => {
    expect(normalizeName('date-fns')).toBe('datefns');
    expect(normalizeName('python_dateutil')).toBe('pythondateutil');
  });

  it('lowercases', () => {
    expect(normalizeName('TypeScript')).toBe('typescript');
  });
});

describe('detectTyposquat', () => {
  const corpus = ['express', 'lodash', 'react', 'mongoose', 'requests', 'numpy'];

  it('detects single-character typosquats', () => {
    const match = detectTyposquat('expresss', corpus);
    expect(match).toBeDefined();
    expect(match!.target).toBe('express');
    expect(match!.distance).toBe(1);
  });

  it('detects missing character typosquats', () => {
    const match = detectTyposquat('mongose', corpus);
    expect(match).toBeDefined();
    expect(match!.target).toBe('mongoose');
  });

  it('returns undefined for exact matches (package is the popular one)', () => {
    expect(detectTyposquat('express', corpus)).toBeUndefined();
  });

  it('returns undefined for unrelated names', () => {
    expect(detectTyposquat('totally-different-name', corpus)).toBeUndefined();
  });

  it('detects two-character edits for long names', () => {
    const match = detectTyposquat('requesst', corpus);
    expect(match).toBeDefined();
    expect(match!.target).toBe('requests');
  });
});
