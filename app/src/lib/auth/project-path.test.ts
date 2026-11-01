import { describe, expect, it } from "vitest";
import { isProjectChildPath, safeProjectNext } from "@/lib/auth/project-path";

describe("isProjectChildPath", () => {
  it("matches a project and the pages under it", () => {
    expect(isProjectChildPath("/projects/1")).toBe(true);
    expect(isProjectChildPath("/projects/1/")).toBe(true);
    expect(isProjectChildPath("/projects/1/map")).toBe(true);
  });

  it("leaves the project index open", () => {
    expect(isProjectChildPath("/projects")).toBe(false);
    expect(isProjectChildPath("/projects/")).toBe(false);
  });
});

describe("safeProjectNext", () => {
  it("keeps a project path", () => {
    expect(safeProjectNext("/projects/1")).toBe("/projects/1");
    expect(safeProjectNext("/projects/1/map")).toBe("/projects/1/map");
  });

  it("drops anything that can leave the app", () => {
    expect(safeProjectNext("/projects")).toBe("/projects");
    expect(safeProjectNext("//evil.test")).toBe("/projects");
    expect(safeProjectNext("/projects/1/../../auth/login")).toBe("/projects");
    expect(safeProjectNext("https://evil.test/projects/1")).toBe("/projects");
    expect(safeProjectNext("/projects/1?next=https://evil.test")).toBe(
      "/projects",
    );
    expect(safeProjectNext("/projects/1\\map")).toBe("/projects");
  });
});
