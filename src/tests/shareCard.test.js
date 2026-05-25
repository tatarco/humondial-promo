import { describe, it, expect } from 'vitest';
import { fillTemplatePlaceholders } from '../lib/shareCard.js';

describe('fillTemplatePlaceholders', () => {
  it('replaces known placeholders', () => {
    const result = fillTemplatePlaceholders('שלום {name}!', { name: 'גל' });
    expect(result).toBe('שלום גל!');
  });

  it('leaves unknown placeholders intact', () => {
    const result = fillTemplatePlaceholders('#{rank} נקודות {points}', { rank: 5 });
    expect(result).toBe('#5 נקודות {points}');
  });

  it('replaces multiple occurrences', () => {
    const result = fillTemplatePlaceholders('{x} + {x}', { x: '2' });
    expect(result).toBe('2 + 2');
  });

  it('returns template unchanged when data is empty', () => {
    const result = fillTemplatePlaceholders('hello {world}', {});
    expect(result).toBe('hello {world}');
  });

  it('handles numeric values', () => {
    const result = fillTemplatePlaceholders('+{points} נ׳', { points: 15 });
    expect(result).toBe('+15 נ׳');
  });

  it('replaces null/undefined value with original placeholder', () => {
    const result = fillTemplatePlaceholders('{missing}', { missing: null });
    expect(result).toBe('{missing}');
  });
});
