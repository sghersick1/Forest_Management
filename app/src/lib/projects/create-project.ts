"use server";

import { redirect } from "next/navigation";
import { createProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = {
  error: string | null;
};

export async function submitNewProject(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Enter a title." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (error || typeof authId !== "string") {
    return { error: "Not signed in." };
  }

  const { data: user, error: userError } = await supabase
    .from("public_users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "Not signed in." };
  }

  let project;
  try {
    project = await createProject(user.id, title, supabase);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not create the project.";
    return { error: message };
  }

  redirect(`/projects/${project.id}`);
}
