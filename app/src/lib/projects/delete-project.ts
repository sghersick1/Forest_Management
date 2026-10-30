"use server";

import { revalidatePath } from "next/cache";
import { deleteProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

export async function deleteProjectAction(
  projectId: number,
): Promise<string | null> {
  const supabase = await createClient();
  try {
    await deleteProject(projectId, supabase);
  } catch (caught) {
    return caught instanceof Error
      ? caught.message
      : "Could not delete the project.";
  }

  revalidatePath("/projects");
  return null;
}
