import Link from "next/link";
import { getAccount, type Account } from "@/lib/auth/user-account";
import { AccountMenu } from "@/app/components/header/account-menu";
import { LogoPlaceholder } from "@/app/components/header/logo-placeholder";
import { ShareButton } from "@/app/components/header/share-button";

const barClass =
  "flex items-stretch justify-between border-b border-surface-translucent-placeholder bg-surface-canvas px-8 text-text-primary";

const endRuleClass =
  "flex items-center border-l border-border-map py-2 pl-8";

export function AppHeaderFallback() {
  return (
    <header className={barClass}>
      <div className="flex items-center py-2">
        <LogoPlaceholder />
      </div>
    </header>
  );
}

export async function AppHeader() {
  const account = await getAccount();

  return (
    <header className={barClass}>
      <div className="flex items-center py-2">
        <LogoPlaceholder />
      </div>
      {account ? (
        <div className="flex items-stretch">
          <ShareButton email={account.email} />
          <AccountName account={account} />
        </div>
      ) : (
        <SignInLink />
      )}
    </header>
  );
}

function AccountName({ account }: { account: Account }) {
  return (
    <div className="flex items-center border-l border-border-map pl-6">
      <AccountMenu name={account.name} />
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
