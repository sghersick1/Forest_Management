"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocodeAddress } from "@/lib/map/geocode-address";
import {
  createProject,
  type NewProjectInput,
  type ProjectMapPoint,
} from "@/lib/projects/projects";
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
    project = await createProject(
      authId,
      input,
      supabase,
      await mapPointForAddress(input.address),
    );
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not create the project.";
    return { error: message };
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

async function mapPointForAddress(
  address: string,
): Promise<ProjectMapPoint | undefined> {
  const singleLine = address.trim();
  if (!singleLine) {
    return undefined;
  }

  try {
    const match = await geocodeAddress(singleLine);
    if (!match) {
      return undefined;
    }
    return { x: match.x, y: match.y };
  } catch {
    return undefined;
  }
}
