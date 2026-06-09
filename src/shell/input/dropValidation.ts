// PURE — no phaser, no DOM. Decidable drop/match/completion logic.

export interface DropTarget {
  id: string; // bin/slot id
  acceptsCategoryId: string | null; // null = match-game slot (matched by pairId)
}

export interface DraggableMeta {
  id: string;
  categoryId?: string; // sort games
  pairId?: string;     // match game
}

/** Is this drop valid for the target? Sort: category equality. Match slots reject (handled by isMatch). */
export function isValidDrop(item: DraggableMeta, target: DropTarget): boolean {
  if (target.acceptsCategoryId === null) return false;
  return item.categoryId === target.acceptsCategoryId;
}

/** Two items form a match if their pairId is equal and ids differ. */
export function isMatch(a: DraggableMeta, b: DraggableMeta): boolean {
  if (a.id === b.id) return false;
  if (a.pairId === undefined || b.pairId === undefined) return false;
  return a.pairId === b.pairId;
}

/** True when EVERY item has been correctly placed/matched (triggers appreciation reward). */
export function isSetComplete(
  placed: ReadonlyArray<string>,
  total: ReadonlyArray<string>,
): boolean {
  const placedSet = new Set(placed);
  return total.every((id) => placedSet.has(id));
}
