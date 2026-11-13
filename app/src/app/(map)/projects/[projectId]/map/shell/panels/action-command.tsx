"use client";

/*
 * The actions command sidebar.
 * A row selects that action. The details sidebar stays closed.
 */

import { useState } from "react";
import { mapPanel, useMap } from "../../map-context";
import { editedLabel } from "./action-edited";

// Action list for the open project.
export function ActionCommand() {
  const { actions, selectedAction, setSelectedAction } = useMap();
  const [hoverAction, setHoverAction] = useState<number | null>(null);

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
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {actions.map((action) => {
          const selected = selectedAction === action.id;
          const hovered = hoverAction === action.id;
          return (
            <div
              key={action.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onMouseEnter={() => setHoverAction(action.id)}
              onMouseLeave={() => setHoverAction(null)}
              onClick={() => setSelectedAction(action.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setSelectedAction(action.id);
              }}
              className={`flex w-full cursor-pointer flex-col items-start px-4 py-1 text-left transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary hover:bg-surface-translucent-placeholder-2 ${selected || hovered ? "bg-surface-translucent-placeholder-2" : ""}`}
            >
              <p className="template-body-medium line-clamp-2 w-full text-text-primary">
                {action.name}
              </p>
              <p
                suppressHydrationWarning
                className="template-body-small flex items-center gap-1 text-text-secondary"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </svg>
                <span className="sr-only">edited </span>
                {editedLabel(new Date(action.editedAt), new Date())}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
