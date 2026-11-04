import Link from "next/link";

export function LogoPlaceholder({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Home"
      className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] px-[4px] py-[4px] transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder ${className ?? ""}`}
    >
      <img src="/logo.svg" alt="" className="h-full w-auto" />
    </Link>
  );
}
