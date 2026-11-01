"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteProjectAction } from "@/lib/projects/delete-project";
import type { ProjectMembership } from "@/lib/projects/projects";

export function ProjectBrowser({ projects }: { projects: ProjectMembership[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{
    projectId: number;
    x: number;
    y: number;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? projects.filter((project) =>
        (project.title ?? "").toLowerCase().includes(needle),
      )
    : projects;

  useEffect(() => {
    if (!menu) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        setError(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menu]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center px-8 py-2">
        <label className="flex h-8 w-[331px] max-w-full items-center overflow-hidden rounded-[6px] border border-surface-navigation bg-surface-translucent-placeholder">
          <span className="flex aspect-square h-full shrink-0 items-center justify-center">
            <img
              src="/icons/search.svg"
              alt=""
              width={17.5999}
              height={17.6}
            />
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="template-body-large min-w-0 flex-1 bg-transparent pr-3 text-text-primary outline-none placeholder:text-text-secondary"
          />
        </label>
      </div>
      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-[10px] px-8 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              onContextMenu={(event) => {
                event.preventDefault();
                setPending(false);
                setError(null);
                setMenu({
                  projectId: project.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              className="flex h-[216.5px] flex-col overflow-hidden rounded-[10px] border border-surface-header"
            >
              <div className="min-h-0 flex-1" />
              <div className="flex h-[38px] shrink-0 items-center gap-3 border-t border-surface-header px-4">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 bg-surface-header"
                />
                <span className="template-body-large truncate text-surface-header">
                  {project.title}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {menu ? (
        <div
          className="fixed inset-0 z-20"
          onMouseDown={() => {
            setMenu(null);
            setError(null);
          }}
        >
          <div
            role="menu"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ top: menu.y, left: menu.x }}
            className="absolute min-w-[200px] rounded-[10px] bg-text-primary"
          >
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                const projectId = menu.projectId;
                setPending(true);
                setError(null);
                void deleteProjectAction(projectId).then((message) => {
                  setPending(false);
                  if (message) {
                    setError(message);
                    return;
                  }
                  setMenu(null);
                  router.refresh();
                });
              }}
              className="template-body-large bg-transparent px-3 py-2 text-surface-canvas disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
            {error ? (
              <p className="template-body-small max-w-48 px-3 pb-2 text-surface-canvas">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
