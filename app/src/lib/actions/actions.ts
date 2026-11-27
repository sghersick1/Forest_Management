/*
 * Database reads for one project's actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseActionStatus, type ActionStatus } from "@/lib/actions/action-status";

export type ProjectAction = {
  id: number;
  name: string;
  description: string;
  status: ActionStatus;
  editedAt: string;
};

type ActionRow = {
  id: number;
  name: string;
  description: string;
  status: string;
  edited_at: string;
};

// The project's actions in plan order. Feature links are not loaded.
export async function getProjectActions(
  projectId: number,
  supabase: SupabaseClient,
): Promise<ProjectAction[]> {
  const { data, error } = await supabase
    .from("actions")
    .select("id, name, description, status, edited_at")
    .eq("project_id", projectId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ActionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: parseActionStatus(row.status),
    editedAt: row.edited_at,
  }));
}

// Updates the name of one action. Description stays as it is.
export async function renameProjectAction(
  projectId: number,
  id: number,
  name: string,
  supabase: SupabaseClient,
): Promise<void> {
  const nextName = name.trim();
  if (!Number.isInteger(id) || nextName === "") {
    throw new Error("Action name must be a non-empty string.");
  }

  const { error } = await supabase
    .from("actions")
    .update({
      name: nextName,
      edited_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// Updates the description of one action. The name stays as it is.
export async function describeProjectAction(
  projectId: number,
  id: number,
  description: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!Number.isInteger(id) || typeof description !== "string") {
    throw new Error("Action description must be a string.");
  }

  const { error } = await supabase
    .from("actions")
    .update({
      description: description.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }
}

// Updates the status of one action. Any project member may call this.
export async function statusProjectAction(
  projectId: number,
  id: number,
  status: ActionStatus,
  supabase: SupabaseClient,
): Promise<void> {
  if (!Number.isInteger(id)) {
    throw new Error("Invalid action.");
  }

  const { error } = await supabase.rpc("set_action_status", {
    target_project: projectId,
    target_action: id,
    next_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }
}
