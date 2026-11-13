"use client";

/*
 * The actions command sidebar.
 */

import { mapPanel } from "../../map-context";

// Action list header. The plus is the add control.
export function ActionCommand() {
  return (
    <>
      <div className="flex shrink-0 items-center border-b border-surface-translucent-placeholder px-4 py-4">
        <p className="template-body-medium-emphasized whitespace-nowrap text-text-primary">
          {mapPanel.actions}
        </p>
        <button
          type="button"
          aria-label="Add action"
          className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        >
          <span
            aria-hidden="true"
            className="flex size-3.5 items-center justify-center text-[24px] leading-[0.6] font-extralight tracking-normal"
          >
            +
          </span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4" />
    </>
  );
}
