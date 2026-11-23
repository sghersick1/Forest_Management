/*
 * Tests the details scrollbar thumb against the scrollport.
 */

import { describe, expect, it } from "vitest";
import { detailsThumb } from "./feature-details-thumb";

describe("details thumb", () => {
  it("hides when the text fits", () => {
    expect(detailsThumb(100, 100, 0)).toBeNull();
    expect(detailsThumb(101, 100, 0)).toBeNull();
    expect(detailsThumb(80, 0, 0)).toBeNull();
  });

  it("tracks scroll and stays inside a short panel", () => {
    expect(detailsThumb(200, 100, 0)).toEqual({ height: 50, top: 0 });
    expect(detailsThumb(200, 100, 100)).toEqual({ height: 50, top: 50 });
    expect(detailsThumb(200, 100, -20)).toEqual({ height: 50, top: 0 });
    expect(detailsThumb(40, 10, 30)).toEqual({ height: 10, top: 0 });
  });
});
