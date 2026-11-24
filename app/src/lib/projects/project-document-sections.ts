"use server";

import { createClient } from "@/lib/supabase/server";

export type ProjectDocumentSection = {
  id: string;
  title: string;
  content: unknown[];
};

type ProjectDocumentSectionRow = {
  id: string;
  title: string;
  content: unknown;
};

export async function getProjectDocumentSections(projectId: number): Promise<ProjectDocumentSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_document_sections")
    .select("id, title, content")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProjectDocumentSectionRow[]).map((section) => ({
    id: section.id,
    title: section.title,
    content: Array.isArray(section.content) ? section.content : [],
  }));
}

export async function createProjectDocumentSection(projectId: number): Promise<ProjectDocumentSection> {
  if (!Number.isInteger(projectId) || projectId <= 0) throw new Error("Invalid project.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_document_sections")
    .insert({ project_id: projectId })
    .select("id, title, content")
    .single();
  if (error) throw new Error(error.message);
  const section = data as ProjectDocumentSectionRow;
  return {
    id: section.id,
    title: section.title,
    content: Array.isArray(section.content) ? section.content : [],
  };
}

export async function updateProjectDocumentSection(
  projectId: number,
  id: string,
  patch: { title?: string; content?: unknown[] },
): Promise<void> {
  if (!Number.isInteger(projectId) || projectId <= 0 || !id) throw new Error("Invalid project document section.");
  const update: { title?: string; content?: unknown[]; edited_at: string } = {
    edited_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error("Section title must not be blank.");
    update.title = title;
  }
  if (patch.content !== undefined) update.content = patch.content;

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_document_sections")
    .update(update)
    .eq("project_id", projectId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
