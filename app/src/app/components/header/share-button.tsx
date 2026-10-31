"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShareDialog } from "@/app/components/header/share-dialog";

export function ShareButton({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const projectId = Number(pathname.split("/")[2]);
  const inProject = Number.isInteger(projectId) && projectId > 0;

  if (!inProject) {
    return null;
  }

  return (
    <div className="flex items-center pr-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[4px] bg-surface-header px-3 py-1.5 font-sans text-[12px] leading-4 font-medium tracking-[0.4px] whitespace-nowrap text-white"
      >
        Share
      </button>
      {open ? (
        <ShareDialog
          projectId={projectId}
          currentEmail={email}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
