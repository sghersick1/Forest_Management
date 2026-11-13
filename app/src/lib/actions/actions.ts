/*
 * Database reads for one project's actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectAction = {
  id: number;
  name: string;
  editedAt: string;
};

type ActionRow = {
  id: number;
  name: string;
  edited_at: string;
};

// The project's actions in plan order. Stand links are not loaded.
export async function getProjectActions(
  projectId: number,
  supabase: SupabaseClient,
): Promise<ProjectAction[]> {
  const { data, error } = await supabase
    .from("actions")
    .select("id, name, edited_at")
    .eq("project_id", projectId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ActionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    editedAt: row.edited_at,
  }));
}
