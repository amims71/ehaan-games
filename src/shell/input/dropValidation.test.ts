import { describe, it, expect } from 'vitest';
import { isValidDrop, isMatch, isSetComplete } from './dropValidation';
import type { DraggableMeta, DropTarget } from './dropValidation';

describe('isValidDrop', () => {
  it('accepts an item whose categoryId equals the target acceptsCategoryId', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'bin-blue', acceptsCategoryId: 'blue' };
    expect(isValidDrop(item, target)).toBe(true);
  });

  it('rejects an item whose categoryId differs from the target', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'bin-orange', acceptsCategoryId: 'orange' };
    expect(isValidDrop(item, target)).toBe(false);
  });

  it('rejects when the target is a match slot (acceptsCategoryId === null)', () => {
    const item: DraggableMeta = { id: 'i1', categoryId: 'blue' };
    const target: DropTarget = { id: 'slot-1', acceptsCategoryId: null };
    expect(isValidDrop(item, target)).toBe(false);
  });

  it('rejects an item with no categoryId (match-game item on a sort bin)', () => {
    const item: DraggableMeta = { id: 'i1' };
    const target: DropTarget = { id: 'bin-blue', acceptsCategoryId: 'blue' };
    expect(isValidDrop(item, target)).toBe(false);
  });
});

describe('isMatch', () => {
  it('matches two distinct items that share a pairId', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'b', pairId: 'sun' };
    expect(isMatch(a, b)).toBe(true);
  });

  it('does not match an item with itself', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    expect(isMatch(a, a)).toBe(false);
  });

  it('does not match items with different pairIds', () => {
    const a: DraggableMeta = { id: 'a', pairId: 'sun' };
    const b: DraggableMeta = { id: 'b', pairId: 'moon' };
    expect(isMatch(a, b)).toBe(false);
  });

  it('does not match two items that both lack a pairId', () => {
    const a: DraggableMeta = { id: 'a' };
    const b: DraggableMeta = { id: 'b' };
    expect(isMatch(a, b)).toBe(false);
  });
});

describe('isSetComplete', () => {
  it('is true when every total id has been placed', () => {
    expect(isSetComplete(['i1', 'i2', 'i3'], ['i1', 'i2', 'i3'])).toBe(true);
  });

  it('is false when some total id is still unplaced', () => {
    expect(isSetComplete(['i1', 'i2'], ['i1', 'i2', 'i3'])).toBe(false);
  });

  it('ignores order and duplicates in placed', () => {
    expect(isSetComplete(['i2', 'i1', 'i1'], ['i1', 'i2'])).toBe(true);
  });
});
