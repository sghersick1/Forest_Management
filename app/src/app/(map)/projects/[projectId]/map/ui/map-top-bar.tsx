"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { renameProjectAction } from "@/lib/projects/rename-project";
import { isTypingTarget } from "../sketch/events/keyboard";
import { ToolTip, useToolTip } from "./map-toolbar";
import { ShareDialog } from "@/app/components/header/share-dialog";
import { useMap } from "../state/map-context";

// Compact controls for the two independent map sidebars.
// The project name sits in the center and opens links back to Home, Projects, and this project.
export function MapTopBar({ title, projectId, email }: { title: string; projectId: number; email: string }) {
  const { leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen } = useMap();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!["a", "f"].includes(event.key.toLowerCase()) || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      if (event.key.toLowerCase() === "a") setRightSidebarOpen(!rightSidebarOpen);
      else setLeftSidebarOpen(!leftSidebarOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rightSidebarOpen, setRightSidebarOpen, leftSidebarOpen, setLeftSidebarOpen]);
  return (
    <div role="toolbar" aria-label="Map sidebars" className="relative z-[60] flex h-8 shrink-0 items-center justify-between border-b border-border-map bg-surface-canvas px-2">
      <SidebarToggle side="left" open={leftSidebarOpen} onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)} />
      <ProjectNav title={title} projectId={projectId} />
      <div className="flex items-center gap-1">
        <ShareProfile email={email} projectId={projectId} />
        <SidebarToggle side="right" open={rightSidebarOpen} onToggle={() => setRightSidebarOpen(!rightSidebarOpen)} />
      </div>
    </div>
  );
}

const navItemClass = "template-body-small-emphasized flex items-center gap-2 rounded-[4px] px-2 py-1 text-text-primary hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

function ProjectNav({ title, projectId }: { title: string; projectId: number }) {
  const { canEdit } = useMap();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(title);
  const [draft, setDraft] = useState(title);
  const canceling = useRef(false);
  const clickTimer = useRef<number | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setDisplayTitle(title);
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (!editing) return;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    };
  }, []);

  function startEdit() {
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    if (!canEdit || editing) return;
    canceling.current = false;
    setOpen(false);
    setDraft(displayTitle);
    setEditing(true);
  }

  function commit() {
    if (canceling.current) {
      canceling.current = false;
      setEditing(false);
      setDraft(displayTitle);
      return;
    }
    const next = draft.trim();
    setEditing(false);
    if (next === "" || next.toLowerCase() === displayTitle.toLowerCase()) {
      setDraft(displayTitle);
      return;
    }
    const previous = displayTitle;
    setDisplayTitle(next);
    void renameProjectAction(projectId, next).then((message) => {
      if (!message) {
        router.refresh();
        return;
      }
      setDisplayTitle(previous);
      setDraft(previous);
    });
  }

  function onFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!editing) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      canceling.current = true;
      event.currentTarget.blur();
    }
  }

  return (
    <div ref={rootRef} className="absolute top-1/2 left-1/2 z-10 max-w-[calc(100%-9rem)] -translate-x-1/2 -translate-y-1/2">
      <input
        ref={fieldRef}
        aria-label="Project name"
        aria-expanded={editing ? undefined : open}
        aria-controls={editing ? undefined : menuId}
        aria-haspopup={editing ? undefined : "menu"}
        readOnly={!editing}
        value={editing ? draft : displayTitle}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (editing) commit();
        }}
        onKeyDown={onFieldKeyDown}
        onMouseDown={(event) => {
          if (!editing) event.preventDefault();
        }}
        onClick={() => {
          if (editing) return;
          if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
          clickTimer.current = window.setTimeout(() => {
            clickTimer.current = null;
            setOpen((value) => !value);
          }, 250);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          startEdit();
        }}
        className={`template-body-small box-border block h-6 w-64 truncate rounded-[4px] border px-2 text-center leading-[22px] text-text-primary outline-none transition-colors duration-200 ease-in-out ${
          editing
            ? "cursor-text border-border-selected bg-surface-translucent-placeholder-2"
            : `cursor-pointer select-none border-transparent caret-transparent hover:bg-surface-translucent-placeholder-2 focus-visible:border-border-selected ${open ? "bg-surface-translucent-placeholder-2" : ""}`
        }`}
      />
      {open && !editing ? (
        <div id={menuId} role="menu" aria-label="Project" className="absolute top-[calc(100%+4px)] left-1/2 flex w-max min-w-[256px] -translate-x-1/2 flex-col gap-[2px] rounded-[8px] border border-border-map bg-surface-canvas p-1 shadow-[0_2px_6px_rgb(0_0_0/0.35)]">
          <Link role="menuitem" href="/" className={navItemClass}><NavIcon src="/icons/home.svg" />Home</Link>
          <Link role="menuitem" href="/projects" className={navItemClass}><NavIcon src="/icons/folder.svg" />Projects</Link>
          <Link role="menuitem" href={`/projects/${projectId}`} className={navItemClass}><NavIcon src="/icons/file-earmark.svg" /><span className="min-w-0 truncate">{displayTitle}</span></Link>
        </div>
      ) : null}
    </div>
  );
}

function NavIcon({ src }: { src: string }) {
  return <span aria-hidden="true" className="size-3 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" style={{ maskImage: `url(${src})` }} />;
}

function ShareProfile({ email, projectId }: { email: string; projectId: number }) {
  const [open, setOpen] = useState(false);
  const tip = useToolTip();
  useEffect(() => {
    if (!email) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "u" || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [email]);
  if (!email) return null;
  return (
    <>
      <button
        type="button"
        aria-label="View Access"
        aria-keyshortcuts="U"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => tip.show("access", true)}
        onPointerLeave={() => tip.hide("access")}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) tip.show("access", false);
        }}
        onBlur={() => tip.hide("access")}
        onPointerDown={() => tip.dismiss("access")}
        onClick={() => setOpen(true)}
        className="relative flex size-6 cursor-pointer items-center justify-center rounded-[4px] text-text-primary hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
      >
        <span aria-hidden="true" className="size-[18px] shrink-0 bg-current [mask-image:url(/icons/user-circle.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
        {tip.current ? <ToolTip label="View Access" shortcut="U" animate={tip.current.animate} /> : null}
      </button>
      {open ? (
        <ShareDialog
          projectId={projectId}
          currentEmail={email}
          tone="light"
          onClose={() => {
            tip.hide("access", true);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function SidebarToggle({ side, open, onToggle }: { side: "left" | "right"; open: boolean; onToggle: () => void }) {
  const tip = useToolTip();
  const tipId = side === "right" ? "actions" : "features";
  return (
    <button type="button" aria-label={side === "right" ? "Toggle actions panel" : "Toggle left sidebar"} aria-keyshortcuts={side === "right" ? "A" : "F"}
      onPointerEnter={() => { tip.show(tipId, true); }}
      onPointerLeave={() => tip.hide(tipId)}
      onFocus={() => { tip.show(tipId, false); }}
      onBlur={() => tip.hide(tipId)}
      onPointerDown={() => tip.dismiss(tipId)} aria-pressed={open} onClick={onToggle}
      className={`relative flex size-6 cursor-pointer items-center justify-center rounded-[4px] ${open ? "text-text-primary" : "text-text-secondary"} transition-colors hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary`}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
        {open ? <path d={side === "left" ? "M3.5 2.5H6v11H3.5A1.5 1.5 0 0 1 2 12V4a1.5 1.5 0 0 1 1.5-1.5Z" : "M10 2.5h2.5A1.5 1.5 0 0 1 14 4v8a1.5 1.5 0 0 1-1.5 1.5H10Z"} fill="currentColor" stroke="none" /> : null}
        <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
        <path d={side === "left" ? "M6 2.5v11" : "M10 2.5v11"} />
      </svg>
      {tip.current ? <ToolTip label={side === "right" ? "Toggle Actions" : "Toggle Features"} shortcut={side === "right" ? "A" : "F"} animate={tip.current.animate} align={side === "right" ? "right" : "left"} /> : null}
    </button>
  );
}
