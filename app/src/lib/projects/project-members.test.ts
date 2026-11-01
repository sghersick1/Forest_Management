import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  canChangeMemberRole,
  getProjectMembers,
  memberLabel,
} from "@/lib/projects/project-members";

describe("memberLabel", () => {
  it("uses the name when one exists", () => {
    expect(memberLabel("Pat", "pat@forest.test")).toBe("Pat");
  });

  it("uses the email when the name is missing", () => {
    expect(memberLabel(null, "pat@forest.test")).toBe("pat@forest.test");
    expect(memberLabel("  ", "pat@forest.test")).toBe("pat@forest.test");
  });
});

function rpcClient(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  const client = { rpc } as unknown as SupabaseClient;

  return { client, rpc };
}

describe("canChangeMemberRole", () => {
  it("lets an owner change an editor or a viewer", () => {
    expect(canChangeMemberRole("owner", "editor", false)).toBe(true);
    expect(canChangeMemberRole("owner", "viewer", false)).toBe(true);
  });

  it("lets an editor change a viewer", () => {
    expect(canChangeMemberRole("editor", "viewer", false)).toBe(true);
  });

  it("refuses a peer, the owner, and your own role", () => {
    expect(canChangeMemberRole("editor", "editor", false)).toBe(false);
    expect(canChangeMemberRole("owner", "owner", false)).toBe(false);
    expect(canChangeMemberRole("owner", "owner", true)).toBe(false);
    expect(canChangeMemberRole("editor", "viewer", true)).toBe(false);
    expect(canChangeMemberRole("viewer", "viewer", false)).toBe(false);
    expect(canChangeMemberRole(undefined, "viewer", false)).toBe(false);
  });
});

describe("getProjectMembers", () => {
  it("returns members from the project", async () => {
    const { client, rpc } = rpcClient([
      {
        user_id: "22222222-2222-4222-8222-222222222222",
        role: "editor",
        email: "forester@forest.test",
        name: "Forester",
      },
      {
        user_id: "33333333-3333-4333-8333-333333333333",
        role: "viewer",
        email: "user@forest.test",
        name: null,
      },
    ]);

    await expect(getProjectMembers(1, client)).resolves.toEqual([
      {
        userId: "22222222-2222-4222-8222-222222222222",
        role: "editor",
        email: "forester@forest.test",
        name: "Forester",
      },
      {
        userId: "33333333-3333-4333-8333-333333333333",
        role: "viewer",
        email: "user@forest.test",
        name: null,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("project_members", { target_project: 1 });
  });

  it("drops rows with an unknown role or no email", async () => {
    const { client } = rpcClient([
      {
        user_id: "11111111-1111-4111-8111-111111111111",
        role: "admin",
        email: "admin@forest.test",
        name: null,
      },
      {
        user_id: "22222222-2222-4222-8222-222222222222",
        role: "owner",
        email: null,
        name: "Pat",
      },
    ]);

    await expect(getProjectMembers(1, client)).resolves.toEqual([]);
  });

  it("throws when the query fails", async () => {
    const { client } = rpcClient(null, { message: "permission denied" });

    await expect(getProjectMembers(1, client)).rejects.toThrow(
      "permission denied",
    );
  });
});
