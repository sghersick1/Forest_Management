"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/projects/projects";

export function ProjectBrowser({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? projects.filter((project) =>
        (project.title ?? "").toLowerCase().includes(needle),
      )
    : projects;

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
    </div>
  );
}
