"use client";

/*
 * The workspace switcher beside the projects catalog.
 * Projects shows the catalog. Resources is a placeholder.
 */

import { useState, type KeyboardEvent, type ReactNode } from "react";

const tabs = [
  { id: "projects", label: "Projects" },
  { id: "resources", label: "Resources" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const tabClass =
  "template-body-small flex w-full cursor-pointer items-center gap-3 rounded-[6px] px-[10px] py-[6px] text-text-primary transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected";

const panelClass = "min-h-0 min-w-0 flex-1";

export function ProjectTabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TabId>("projects");

  function select(id: TabId) {
    setActive(id);
    document.getElementById(`workspace-tab-${id}`)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: TabId) {
    const next = tabAfter(id, event.key);
    if (!next) return;
    event.preventDefault();
    select(next);
  }

  return (
    <>
      <aside className="flex w-[240px] shrink-0 flex-col gap-3 self-stretch border-r border-border-map px-2 pt-2 pb-4">
        <div
          role="tablist"
          aria-label="Workspace"
          aria-orientation="vertical"
          className="flex flex-col gap-1"
        >
          {tabs.map((tab) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`workspace-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`workspace-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(event) => onKeyDown(event, tab.id)}
                className={`${tabClass} ${selected ? "bg-surface-selected hover:bg-surface-selected" : "hover:bg-surface-translucent-placeholder-2 active:bg-surface-translucent-placeholder"}`}
              >
                {tab.id === "projects" ? <FolderIcon /> : <ResourcesIcon />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>
      <div
        role="tabpanel"
        id="workspace-panel-projects"
        aria-labelledby="workspace-tab-projects"
        hidden={active !== "projects"}
        className={`${panelClass} flex flex-col overflow-hidden`}
      >
        {children}
      </div>
      <div
        role="tabpanel"
        id="workspace-panel-resources"
        aria-labelledby="workspace-tab-resources"
        hidden={active !== "resources"}
        className={`${panelClass} px-10 pt-4`}
      >
        <h1 className="template-body-large-light text-text-primary">Resources</h1>
      </div>
    </>
  );
}

function tabAfter(current: TabId, key: string): TabId | null {
  const index = tabs.findIndex((tab) => tab.id === current);
  if (key === "Home") return tabs[0].id;
  if (key === "End") return tabs[tabs.length - 1].id;
  if (key === "ArrowDown") return tabs[(index + 1) % tabs.length].id;
  if (key === "ArrowUp") return tabs[(index - 1 + tabs.length) % tabs.length].id;
  return null;
}

function FolderIcon() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 bg-text-primary [mask-image:url(/icons/folder.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
    />
  );
}

function ResourcesIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      <rect x="2" y="2" width="5" height="20" rx="1.2" />
      <rect x="9" y="2" width="5" height="20" rx="1.2" />
      <rect x="17" y="6" width="4.5" height="16" rx="1.2" transform="rotate(-12 19.25 14)" />
    </svg>
  );
}
