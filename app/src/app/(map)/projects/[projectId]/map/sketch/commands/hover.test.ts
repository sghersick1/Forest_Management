/*
 * Tests hover, including the rule that the selected polygon is not hovered.
 */

import { describe, expect, it } from "vitest";
import { hoverCommand } from "./hover";

const topId = "22222222-2222-4222-8222-222222222222";
const selectedId = "11111111-1111-4111-8111-111111111111";

describe("hover command", () => {
  it("hovers the finished polygon under the pointer", () => {
    expect(hoverCommand(topId, selectedId)).toBe(topId);
  });

  it("clears hover for the selected polygon and for a miss", () => {
    expect(hoverCommand(selectedId, selectedId)).toBeNull();
    expect(hoverCommand(null, selectedId)).toBeNull();
  });
});
