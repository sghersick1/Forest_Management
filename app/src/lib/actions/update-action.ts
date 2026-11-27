"use server";

/*
 * Server actions for one project's actions.
 * Each write updates one action, or one action_features row.
 */

import { createClient } from "@/lib/supabase/server";
import {
  describeProjectAction as writeActionDescription,
  renameProjectAction as writeActionName,
  statusProjectAction as writeActionStatus,
} from "@/lib/actions/actions";
import { isActionStatus, parseActionStatus, type ActionStatus } from "@/lib/actions/action-status";
import {
  linkActionFeature as writeActionFeatureLink,
  unlinkActionFeature as writeActionFeatureUnlink,
} from "@/lib/actions/action-features";

// Updates the name of one action.
export async function renameProjectAction(projectId: number, id: number, name: string) {
  const supabase = await createClient();
  await writeActionName(projectId, id, name, supabase);
}

// Updates the description of one action.
export async function describeProjectAction(
  projectId: number,
  id: number,
  description: string,
) {
  const supabase = await createClient();
  await writeActionDescription(projectId, id, description, supabase);
}

// Updates the status of one action. Any project member may change it.
export async function statusProjectAction(
  projectId: number,
  id: number,
  status: ActionStatus,
) {
  if (!isActionStatus(status)) throw new Error("Invalid status.");
  const supabase = await createClient();
  await writeActionStatus(projectId, id, status, supabase);
}

// Links one feature to one action.
export async function linkProjectActionFeature(
  projectId: number,
  actionId: number,
  featureId: string,
) {
  const supabase = await createClient();
  await writeActionFeatureLink(projectId, actionId, featureId, supabase);
}

// Removes one feature from one action.
export async function unlinkProjectActionFeature(
  projectId: number,
  actionId: number,
  featureId: string,
) {
  const supabase = await createClient();
  await writeActionFeatureUnlink(projectId, actionId, featureId, supabase);
}

// Creates an untitled action with no description or feature links.
export async function createProjectAction(projectId: number) {
  if (!Number.isInteger(projectId)) throw new Error("Invalid project.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("actions")
    .insert({ project_id: projectId, name: "Untitled action", status: "planned", description: "" })
    .select("id, name, description, status, edited_at").single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as number,
    name: data.name as string,
    description: data.description as string,
    status: parseActionStatus(data.status as string),
    editedAt: data.edited_at as string,
  };
}

// Deletes an action and its cascading feature links, scoped by project membership.
export async function deleteProjectAction(projectId: number, id: number) {
  if (!Number.isInteger(projectId) || !Number.isInteger(id)) throw new Error("Invalid action.");
  const supabase = await createClient();
  const { error } = await supabase.from("actions").delete().eq("project_id", projectId).eq("id", id);
  if (error) throw new Error(error.message);
}
