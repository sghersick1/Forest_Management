"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Map } from "@/app/components/map/map";
import { editedLabel } from "@/app/(map)/projects/[projectId]/map/logic/action-edited";
import { deleteProjectAction } from "@/lib/projects/delete-project";
import { renameProjectAction } from "@/lib/projects/rename-project";
import type { ProjectMembership } from "@/lib/projects/projects";
import { NewProjectButton } from "./new-project-button";

export function ProjectBrowser({
  projects,
  loading = false,
}: {
  projects: ProjectMembership[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{
    projectId: number;
    x: number;
    y: number;
  } | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(() => new Set());
  const [error, setError] = useState<{
    projectId: number;
    message: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [titleError, setTitleError] = useState<{
    projectId: number;
    message: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuProjectId = useRef<number | null>(null);
  menuProjectId.current = menu?.projectId ?? null;
  const needle = query.trim().toLowerCase();
  const titleOf = (project: ProjectMembership) =>
    titles[project.id] ?? project.title ?? "";
  const visible = needle
    ? projects.filter((project) => titleOf(project).toLowerCase().includes(needle))
    : projects;

  useEffect(() => {
    if (!menu) {
      return;
    }

    setError(null);
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

  function openMenu(projectId: number, x: number, y: number) {
    setError(null);
    setMenu({ projectId, x, y });
  }

  function startRename(projectId: number) {
    setMenu(null);
    setError(null);
    setTitleError(null);
    setRenamingId(projectId);
  }

  function saveTitle(projectId: number, next: string) {
    setRenamingId(null);
    setTitles((current) => ({ ...current, [projectId]: next }));
    setTitleError(null);
    void renameProjectAction(projectId, next).then((message) => {
      if (!message) {
        router.refresh();
        return;
      }
      setTitles((current) => {
        if (current[projectId] !== next) {
          return current;
        }
        const rest = { ...current };
        delete rest[projectId];
        return rest;
      });
      setTitleError({ projectId, message });
    });
  }

  return (
    <div className="@container flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-10">
      <div className="flex w-full items-center gap-2 pt-4">
        <h1 className="template-body-large-light text-text-primary">Projects</h1>
        <label className="ml-auto flex h-6 w-[280px] max-w-full items-center rounded-[6px] bg-surface-translucent-placeholder text-text-primary focus-within:outline-1 focus-within:outline-border-selected">
          <svg
            width="12"
            height="12"
            viewBox="0 0 17.6 17.6"
            fill="none"
            aria-hidden="true"
            className="ml-2 shrink-0 text-text-secondary"
          >
            <path
              d="M15.0222 7.9111C15.0222 11.8385 11.8385 15.0222 7.9111 15.0222C3.98375 15.0222 0.8 11.8385 0.8 7.9111C0.8 3.98375 3.98375 0.8 7.9111 0.8C11.8385 0.8 15.0222 3.98375 15.0222 7.9111Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.7999 16.8L12.9332 12.9333"
              stroke="currentColor"
              strokeWidth="1.25"
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
        loading ? null : (
          <p className="template-body-medium pt-16 text-text-secondary">
            {needle ? `No projects match “${query.trim()}”.` : "No projects yet."}
          </p>
        )
      ) : (
        <ul className="grid w-full grid-cols-1 gap-9 pt-16 pb-8 @min-[576px]:grid-cols-2 @min-[882px]:grid-cols-3 @min-[1188px]:grid-cols-4">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              title={titleOf(project)}
              menuOpen={menu?.projectId === project.id}
              renaming={renamingId === project.id}
              titleError={
                titleError?.projectId === project.id ? titleError.message : null
              }
              onContextMenu={(x, y) => openMenu(project.id, x, y)}
              onOpenMenu={(x, y) => openMenu(project.id, x, y)}
              onCancelRename={() => setRenamingId(null)}
              onSaveTitle={(next) => saveTitle(project.id, next)}
            />
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
                disabled={deletingIds.has(menu.projectId)}
                onClick={() => startRename(menu.projectId)}
                className="template-body-small w-full cursor-pointer rounded-[4px] px-2 py-1 text-left text-text-primary hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-border-selected disabled:opacity-50"
              >
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={deletingIds.has(menu.projectId)}
                onClick={() => {
                  const projectId = menu.projectId;
                  setDeletingIds((current) => new Set(current).add(projectId));
                  setError(null);
                  void deleteProjectAction(projectId).then((message) => {
                    setDeletingIds((current) => {
                      if (!current.has(projectId)) {
                        return current;
                      }
                      const next = new Set(current);
                      next.delete(projectId);
                      return next;
                    });
                    if (menuProjectId.current !== projectId) {
                      if (!message) {
                        router.refresh();
                      }
                      return;
                    }
                    if (message) {
                      setError({ projectId, message });
                      return;
                    }
                    setMenu(null);
                    router.refresh();
                  });
                }}
                className="template-body-small w-full cursor-pointer rounded-[4px] px-2 py-1 text-left text-red-600 hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-border-selected disabled:opacity-50"
              >
                {deletingIds.has(menu.projectId) ? "Deleting…" : "Delete"}
              </button>
              {error?.projectId === menu.projectId ? (
                <p role="alert" className="template-body-small px-2 py-1 text-text-secondary">
                  {error.message}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ProjectCard({
  project,
  title,
  menuOpen,
  renaming,
  titleError,
  onContextMenu,
  onOpenMenu,
  onCancelRename,
  onSaveTitle,
}: {
  project: ProjectMembership;
  title: string;
  menuOpen: boolean;
  renaming: boolean;
  titleError: string | null;
  onContextMenu: (x: number, y: number) => void;
  onOpenMenu: (x: number, y: number) => void;
  onCancelRename: () => void;
  onSaveTitle: (next: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(title);
  const canceling = useRef(false);
  const committed = useRef(false);
  const skipNavigation = useRef(false);
  const wasRenaming = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  if (renaming && !wasRenaming.current) {
    wasRenaming.current = true;
    committed.current = false;
    if (draft !== title) {
      setDraft(title);
    }
  } else if (!renaming) {
    wasRenaming.current = false;
  }

  useEffect(() => {
    if (!renaming) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const id = window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [renaming]);

  function openFromContext(event: React.MouseEvent) {
    event.preventDefault();
    onContextMenu(event.clientX, event.clientY);
  }

  function commit(value: string) {
    if (committed.current) {
      return;
    }
    committed.current = true;
    if (canceling.current) {
      canceling.current = false;
      onCancelRename();
      return;
    }
    const next = value.trim();
    if (!next || next === title) {
      onCancelRename();
      return;
    }
    onSaveTitle(next);
  }

  return (
    <li id={`project-${project.id}`} aria-busy={!ready} className="group relative flex min-w-0 flex-col gap-2">
      <Link
        href={`/projects/${project.id}`}
        onMouseDown={() => {
          if (!renaming) {
            return;
          }
          skipNavigation.current = true;
          window.addEventListener(
            "click",
            () => {
              skipNavigation.current = false;
            },
            { once: true },
          );
        }}
        onClick={(event) => {
          if (!renaming && !skipNavigation.current) {
            return;
          }
          event.preventDefault();
          skipNavigation.current = false;
        }}
        onContextMenu={openFromContext}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[6px] outline-none"
      >
        <Map
          interactive={false}
          mapX={project.mapX}
          mapY={project.mapY}
          mapZoom={project.mapZoom - 2}
          onReady={(map) => {
            if (!map) {
              setReady(false);
              return;
            }
            map.once("idle", () => setReady(true));
          }}
        />
        {ready ? null : (
          <div aria-hidden="true" className="absolute inset-0 bg-surface-translucent-placeholder-2" />
        )}
      </Link>
      {ready || renaming ? (
        <span className="relative flex w-full items-center gap-2">
          {renaming ? (
            <input
              ref={inputRef}
              aria-label={`Rename ${title || "project"}`}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={(event) => {
                const input = event.currentTarget;
                window.setTimeout(() => input.select(), 0);
              }}
              onBlur={(event) => commit(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  canceling.current = true;
                  event.currentTarget.blur();
                }
              }}
              className="template-body-small-emphasized min-w-0 flex-1 border-b border-border-map bg-transparent text-text-primary outline-none"
            />
          ) : (
            <Link
              href={`/projects/${project.id}`}
              onContextMenu={openFromContext}
              className="template-body-small-emphasized min-w-0 flex-1 truncate text-text-primary outline-none"
            >
              {title}
            </Link>
          )}
          <span
            suppressHydrationWarning
            className={`template-body-small shrink-0 text-text-secondary group-hover:invisible group-focus-within:invisible ${menuOpen || renaming ? "invisible" : ""}`}
          >
            <span className="sr-only">edited </span>
            {editedLabel(new Date(project.editedAt), new Date())}
          </span>
          {ready && !renaming ? (
            <button
              type="button"
              aria-label={`More options for ${title || "project"}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                onOpenMenu(bounds.right - 160, bounds.bottom + 4);
              }}
              className={`absolute right-0 bottom-0 flex size-4 cursor-pointer items-center justify-center rounded-[4px] text-text-secondary group-hover:opacity-100 group-focus-within:opacity-100 hover:text-text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${menuOpen ? "opacity-100" : "opacity-0"}`}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
              </svg>
            </button>
          ) : null}
        </span>
      ) : (
        <span className="block h-4 w-full rounded-[4px] bg-surface-translucent-placeholder-2">
          <span className="sr-only">{title}</span>
        </span>
      )}
      {titleError ? (
        <p role="alert" className="template-body-small text-text-secondary">
          {titleError}
        </p>
      ) : null}
    </li>
  );
}
