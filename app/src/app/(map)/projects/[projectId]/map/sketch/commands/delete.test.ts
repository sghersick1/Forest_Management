/*
 * Tests delete of the selected polygon and ids removed by a delete change.
 */

import { describe, expect, it } from "vitest";
import { deleteCommand, storedIdsToDelete } from "./delete";

const id = "11111111-1111-4111-8111-111111111111";

describe("delete command", () => {
  it("deletes the selected polygon", () => {
    expect(deleteCommand({ selectedId: id })).toEqual({
      type: "delete",
      id,
    });
  });

  it("does nothing when nothing is selected", () => {
    expect(deleteCommand({ selectedId: null })).toBeNull();
  });

  it("removes only stored ids from a delete change", () => {
    expect(storedIdsToDelete("delete", [id, "missing"], [id])).toEqual([id]);
    expect(storedIdsToDelete("update", [id], [id])).toEqual([]);
  });
});
