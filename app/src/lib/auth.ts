import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Account = {
  email: string;
  roles: string[];
};

export async function getAccount(): Promise<Account | null> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }

  const { claims } = data;
  const email = typeof claims.email === "string" ? claims.email : "";
  const metadata = claims.app_metadata;
  const rawRoles =
    metadata && typeof metadata === "object" && "roles" in metadata
      ? metadata.roles
      : [];
  const roles = Array.isArray(rawRoles)
    ? rawRoles.filter((role): role is string => typeof role === "string")
    : [];

  return { email, roles };
}
