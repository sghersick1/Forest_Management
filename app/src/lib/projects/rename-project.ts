"use server";

import { revalidatePath } from "next/cache";
import { renameProject } from "@/lib/projects/projects";
import { createClient } from "@/lib/supabase/server";

export async function renameProjectAction(
  projectId: number,
  title: string,
): Promise<string | null> {
  const supabase = await createClient();
  try {
    await renameProject(projectId, title, supabase);
  } catch (caught) {
    return caught instanceof Error
      ? caught.message
      : "Could not rename the project.";
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`, "layout");
  return null;
}
