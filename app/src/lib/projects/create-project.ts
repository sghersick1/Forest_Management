"use server";

import { redirect } from "next/navigation";
import { createProject, type NewProjectInput } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = {
  error: string | null;
};

export async function submitNewProject(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const input: NewProjectInput = {
    address: String(formData.get("address") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
  };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (error || typeof authId !== "string") {
    return { error: "Not signed in." };
  }

  let project;
  try {
    project = await createProject(authId, input, supabase);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not create the project.";
    return { error: message };
  }

  redirect(`/projects/${project.id}`);
}
