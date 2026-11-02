import Link from "next/link";

export function LogoPlaceholder() {
  return (
    <Link href="/" aria-label="Home" className="flex shrink-0 items-center">
      <div
        aria-hidden="true"
        className="size-7 rounded-[6px] bg-surface-neutral"
      />
    </Link>
  );
}
