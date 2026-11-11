/*
 * Deletes one polygon.
 * The key path requires an active reshape. A TerraDraw delete change removes stored ids.
 */

import type { FeatureChange } from "../kinds/polygon/create";

// Delete for the selected polygon while reshaping, or null when delete should do nothing.
export function deleteCommand(input: {
  reshaping: boolean;
  selectedId: string | null;
}): FeatureChange | null {
  if (!input.reshaping || input.selectedId === null) return null;
  return { type: "delete", id: input.selectedId };
}

// Stored ids named by a TerraDraw delete change.
export function storedIdsToDelete(
  type: string,
  ids: readonly (string | number)[],
  storedIds: readonly string[],
) {
  if (type !== "delete") return [];
  const stored = new Set(storedIds);
  return ids.map(String).filter((id) => stored.has(id));
}
