import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function LoginPage({
  searchParams,
}: PageProps<"/auth/login">) {
  return (
    <main className="flex flex-1 flex-col bg-surface-canvas px-8 py-16 text-text-primary">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <h1 className="template-title-large">Sign in</h1>
        <Suspense fallback={<SignInForm next="" />}>
          <SignInNext searchParams={searchParams} />
        </Suspense>
        <Link
          href="/auth/signup"
          className="template-body-small text-text-secondary underline"
        >
          Create an account
        </Link>
      </div>
    </main>
  );
}

async function SignInNext({
  searchParams,
}: {
  searchParams: PageProps<"/auth/login">["searchParams"];
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  return <SignInForm next={next} />;
}
