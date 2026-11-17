"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Map } from "@/app/components/map/map";
import { deleteProjectAction } from "@/lib/projects/delete-project";
import type { ProjectMembership } from "@/lib/projects/projects";
import { NewProjectButton } from "./new-project-button";

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
  const menuRef = useRef<HTMLDivElement>(null);
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

    setError(null);
    setPending(false);
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    function dismiss(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenu(null);
        setError(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(null);
        setError(null);
      }
    }

    function close() {
      setMenu(null);
      setError(null);
    }

    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-8">
      <div className="flex w-full items-center gap-2 pt-4">
        <h1 className="template-body-large text-text-primary">Projects</h1>
        <label className="ml-auto flex h-8 w-[280px] max-w-full items-center rounded-[6px] bg-surface-translucent-placeholder text-text-primary focus-within:outline-1 focus-within:outline-text-primary">
          <svg
            width="16"
            height="16"
            viewBox="0 0 17.6 17.6"
            fill="none"
            aria-hidden="true"
            className="ml-2 shrink-0"
          >
            <path
              d="M15.0222 7.9111C15.0222 11.8385 11.8385 15.0222 7.9111 15.0222C3.98375 15.0222 0.8 11.8385 0.8 7.9111C0.8 3.98375 3.98375 0.8 7.9111 0.8C11.8385 0.8 15.0222 3.98375 15.0222 7.9111Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.7999 16.8L12.9332 12.9333"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search projects"
            aria-label="Search projects"
            className="template-body-small min-w-0 flex-1 bg-transparent px-2 text-text-primary outline-none placeholder:text-text-secondary"
          />
        </label>
        <NewProjectButton />
      </div>
      {visible.length === 0 ? (
        <p className="template-body-medium pt-8 text-text-secondary">
          {needle ? `No projects match “${query.trim()}”.` : "No projects yet."}
        </p>
      ) : (
      <ul className="grid w-full grid-cols-1 gap-8 py-8 min-[736px]:grid-cols-2 min-[1088px]:grid-cols-4">
        {visible.map((project) => (
          <li key={project.id} id={`project-${project.id}`} className="min-w-0">
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
              className="flex flex-col gap-2 outline-none"
            >
              <div className="aspect-video w-full overflow-hidden rounded-[6px]">
                <Map
                  interactive={false}
                  mapX={project.mapX}
                  mapY={project.mapY}
                  mapZoom={project.mapZoom -  2}
                />
              </div>
              <span className="template-body-small-emphasized truncate text-text-primary">
                {project.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      )}
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Project options"
              onContextMenu={(event) => event.preventDefault()}
              style={{
                left: Math.max(8, Math.min(menu.x, window.innerWidth - 168)),
                top: Math.max(8, Math.min(menu.y, window.innerHeight - 88)),
              }}
              className="fixed z-50 w-40 rounded-[8px] border border-border-map bg-surface-canvas p-1 shadow-lg"
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
                className="template-body-small w-full cursor-pointer rounded-[4px] px-2 py-1 text-left text-red-600 hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-border-selected disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
              {error ? (
                <p role="alert" className="template-body-small px-2 py-1 text-text-secondary">
                  {error}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
