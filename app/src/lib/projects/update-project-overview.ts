"use server";

import { createClient } from "@/lib/supabase/server";
import { getStandRole } from "@/lib/maps/stand-documents";

export type ProjectOverviewFieldKey = "title" | "address" | "contact_name" | "phone" | "email" | "company";

const columns: Record<ProjectOverviewFieldKey, string> = {
  title: "Title",
  address: "address",
  contact_name: "contact_name",
  phone: "phone",
  email: "email",
  company: "company",
};

export async function updateProjectOverviewField(
  projectId: number,
  field: ProjectOverviewFieldKey,
  value: string,
): Promise<void> {
  if (!Number.isInteger(projectId) || projectId <= 0 || !(field in columns)) {
    throw new Error("Invalid project overview field.");
  }
  if (typeof value !== "string" || value.length > 500) {
    throw new Error("Project overview values must be 500 characters or fewer.");
  }
  const supabase = await createClient();
  const role = await getStandRole(projectId, supabase);
  if (role !== "owner" && role !== "editor") {
    throw new Error("You do not have permission to edit this project.");
  }
  const { error } = await supabase
    .from("projects")
    .update({
      [columns[field]]: value.trim() || null,
      edited_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
}
