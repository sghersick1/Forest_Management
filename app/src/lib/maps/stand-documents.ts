import type { SupabaseClient } from "@supabase/supabase-js";

export type StandDocument = {
  projectId: number;
  mapFeatureId: string;
  content: unknown[];
  editedAt: string;
};

type StandDocumentRow = {
  project_id: number;
  map_feature_id: string;
  content: unknown;
  edited_at: string;
};

export async function getStandDocument(
  projectId: number,
  mapFeatureId: string,
  supabase: SupabaseClient,
): Promise<StandDocument | null> {
  const { data, error } = await supabase
    .from("stand_documents")
    .select("project_id, map_feature_id, content, edited_at")
    .eq("project_id", projectId)
    .eq("map_feature_id", mapFeatureId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as StandDocumentRow;
  if (!Array.isArray(row.content)) {
    throw new Error("Stand document content must be a BlockNote block list.");
  }
  return {
    projectId: row.project_id,
    mapFeatureId: row.map_feature_id,
    content: row.content,
    editedAt: row.edited_at,
  };
}

export async function getStandDocuments(
  projectId: number,
  supabase: SupabaseClient,
): Promise<Record<string, unknown[]>> {
  const { data, error } = await supabase
    .from("stand_documents")
    .select("map_feature_id, content")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  const documents: Record<string, unknown[]> = {};
  for (const row of (data ?? []) as StandDocumentRow[]) {
    documents[row.map_feature_id] = Array.isArray(row.content) ? row.content : [];
  }
  return documents;
}

export async function getStandRole(
  projectId: number,
  supabase: SupabaseClient,
): Promise<"owner" | "editor" | "viewer" | null> {
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claims?.claims.sub !== "string") return null;

  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", claims.claims.sub)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const role = (data as { role?: unknown } | null)?.role;
  return role === "owner" || role === "editor" || role === "viewer" ? role : null;
}
