/*
 * Deletes one polygon.
 * The key path deletes the selected feature. A TerraDraw delete change removes stored ids.
 */

import type { FeatureChange } from "../kinds/polygon/create";

// Delete for the selected polygon, or null when nothing is selected.
export function deleteCommand(input: { selectedId: string | null }): FeatureChange | null {
  if (input.selectedId === null) return null;
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
