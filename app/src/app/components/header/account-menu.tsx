"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/lib/auth/signout";

export function AccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative py-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-text-primary transition-colors hover:bg-surface-translucent-placeholder-2 ${open ? "bg-surface-translucent-placeholder-2" : "bg-transparent"}`}
      >
        <img
          src="/icons/account-avatar.svg"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0"
        />
        <span className="template-body-medium-emphasized whitespace-nowrap">{name}</span>
        <img
          src="/icons/account-chevron.svg"
          alt=""
          width={6}
          height={3}
          className="-ml-1 shrink-0"
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-10 rounded-[6px] border border-border-map bg-surface-canvas p-2"
        >
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="template-title-medium cursor-pointer bg-transparent px-4 py-2 whitespace-nowrap text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
