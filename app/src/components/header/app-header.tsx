import Link from "next/link";
import { getAccount, type Account } from "@/lib/auth";

const barClass =
  "flex items-center justify-between border-b border-surface-translucent-placeholder bg-surface-canvas px-8 py-4 text-text-primary";

export function AppHeaderFallback() {
  return (
    <header className={barClass}>
      <Mark />
    </header>
  );
}

export async function AppHeader() {
  const account = await getAccount();

  return (
    <header className={barClass}>
      <Mark />
      {account ? <AccountName account={account} /> : <SignInLink />}
    </header>
  );
}

function Mark() {
  return (
    <div
      aria-hidden="true"
      className="size-[29.5px] shrink-0 rounded-[6px] bg-surface-neutral"
    />
  );
}

function AccountName({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden="true"
        className="size-[29.5px] shrink-0 rounded-full bg-surface-neutral"
      />
      <p className="template-title-medium whitespace-nowrap">
        {account.name}
      </p>
    </div>
  );
}

function SignInLink() {
  return (
    <Link
      href="/login"
      className="template-title-medium rounded-[6px] bg-text-primary px-3 py-1.5 text-surface-canvas"
    >
      Sign in
    </Link>
  );
}
