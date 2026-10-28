import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { getAccount } from "@/app/lib/auth";

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <h1 className="template-title-large">Projects</h1>
      <Suspense fallback={<p className="template-body-medium">Loading account…</p>}>
        <AccountPanel />
      </Suspense>
    </main>
  );
}

async function AccountPanel() {
  const account = await getAccount();

  if (!account) {
    return (
      <p className="template-body-medium">
        Not signed in.{" "}
        <Link href="/login" className="template-body-medium-link">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="template-body-medium">Email: {account.email}</p>
      <p className="template-body-medium">
        Roles: {account.roles.length > 0 ? account.roles.join(", ") : "none"}
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="template-title-medium rounded border px-3 py-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
