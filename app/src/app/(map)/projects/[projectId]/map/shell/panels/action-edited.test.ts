/*
 * Tests the edited line for today, this year, and another year.
 */

import { describe, expect, it } from "vitest";
import { editedLabel } from "./action-edited";

const now = new Date(2026, 10, 13, 17, 17);

describe("editedLabel", () => {
  it("uses 24-hour time on the same day", () => {
    expect(editedLabel(new Date(2026, 10, 13, 9, 5), now)).toBe("09:05");
  });

  it("uses an abbreviated month and day in the same year", () => {
    expect(editedLabel(new Date(2026, 10, 12, 9, 5), now)).toBe("Nov 12");
  });

  it("adds the year when the day is in another year", () => {
    expect(editedLabel(new Date(2025, 10, 12, 9, 5), now)).toBe("Nov 12, 2025");
  });
});
