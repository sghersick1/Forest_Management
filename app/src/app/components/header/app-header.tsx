import Link from "next/link";
import { getAccount, type Account } from "@/lib/auth";

const barClass =
  "flex items-stretch justify-between border-b border-surface-translucent-placeholder bg-surface-canvas px-8 text-text-primary";

const endRuleClass =
  "flex items-center border-l border-border-map py-2 pl-8";

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
    <Link href="/" aria-label="Home" className="flex shrink-0 items-center py-2">
      <div
        aria-hidden="true"
        className="size-[29.5px] rounded-[6px] bg-surface-neutral"
      />
    </Link>
  );
}

function AccountName({ account }: { account: Account }) {
  return (
    <div className={`${endRuleClass} gap-2`}>
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
    <div className={endRuleClass}>
      <Link href="/auth/login" className="template-title-medium">
        Sign in
      </Link>
    </div>
  );
}
