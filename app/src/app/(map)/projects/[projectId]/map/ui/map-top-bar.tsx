"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { isTypingTarget } from "../sketch/events/keyboard";
import { ToolTip, useToolTip } from "./map-toolbar";
import { useMap } from "../state/map-context";

// Compact controls for the two independent map sidebars.
// The project name sits in the center and opens links back to Home, Projects, and this project.
export function MapTopBar({ title, projectId }: { title: string; projectId: number }) {
  const { leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen, featureDetailsOpen, setFeatureDetailsOpen } = useMap();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!["a", "f", "d"].includes(event.key.toLowerCase()) || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      if (event.key.toLowerCase() === "a") setRightSidebarOpen(!rightSidebarOpen);
      else if (event.key.toLowerCase() === "f") setLeftSidebarOpen(!leftSidebarOpen);
      else setFeatureDetailsOpen(!featureDetailsOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rightSidebarOpen, setRightSidebarOpen, leftSidebarOpen, setLeftSidebarOpen, featureDetailsOpen, setFeatureDetailsOpen]);
  const detailsTip = useToolTip();
  return (
    <div role="toolbar" aria-label="Map sidebars" className="relative z-[60] flex h-8 shrink-0 items-center justify-between border-b border-border-map bg-surface-canvas px-2">
      <SidebarToggle side="left" open={leftSidebarOpen} onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)} />
      <ProjectNav title={title} projectId={projectId} />
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Toggle feature details" aria-keyshortcuts="D"
          onPointerEnter={() => detailsTip.show("details", true)} onPointerLeave={() => detailsTip.hide("details")}
          onFocus={() => detailsTip.show("details", false)} onBlur={() => detailsTip.hide("details")}
          onPointerDown={() => detailsTip.dismiss("details")} aria-pressed={featureDetailsOpen} onClick={() => setFeatureDetailsOpen(!featureDetailsOpen)} className={`relative flex size-6 cursor-pointer items-center justify-center rounded-[4px] ${featureDetailsOpen ? "text-text-primary" : "text-text-secondary"} transition-colors hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary`}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
            {featureDetailsOpen ? <path d="M10 2.5h2.5A1.5 1.5 0 0 1 14 4v8a1.5 1.5 0 0 1-1.5 1.5H10Z" fill="currentColor" stroke="none" /> : null}
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" /><path d="M10 2.5v11" />
          </svg>
          {detailsTip.current ? <ToolTip label="Details" shortcut="D" animate={detailsTip.current.animate} align="right" /> : null}
        </button>
        <SidebarToggle side="right" open={rightSidebarOpen} onToggle={() => setRightSidebarOpen(!rightSidebarOpen)} />
      </div>
    </div>
  );
}

const navItemClass = "template-body-small-emphasized flex items-center gap-2 rounded-[4px] px-2 py-1 text-text-primary hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

function ProjectNav({ title, projectId }: { title: string; projectId: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  return (
    <div ref={rootRef} className="absolute top-1/2 left-1/2 z-10 max-w-[calc(100%-7rem)] -translate-x-1/2 -translate-y-1/2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`template-body-small block h-6 max-w-full cursor-pointer truncate rounded-[4px] px-2 leading-[22px] text-text-secondary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${open ? "bg-surface-translucent-placeholder-2" : ""}`}
      >
        {title}
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label="Project" className="absolute top-[calc(100%+4px)] left-1/2 flex w-max min-w-[256px] -translate-x-1/2 flex-col gap-[2px] rounded-[8px] border border-border-map bg-surface-canvas p-1 shadow-[0_2px_6px_rgb(0_0_0/0.35)]">
          <Link role="menuitem" href="/" className={navItemClass}><NavIcon src="/icons/home.svg" />Home</Link>
          <Link role="menuitem" href="/projects" className={navItemClass}><NavIcon src="/icons/folder.svg" />Projects</Link>
          <Link role="menuitem" href={`/projects/${projectId}`} className={navItemClass}><NavIcon src="/icons/file-earmark.svg" /><span className="min-w-0 truncate">{title}</span></Link>
        </div>
      ) : null}
    </div>
  );
}

function NavIcon({ src }: { src: string }) {
  return <span aria-hidden="true" className="size-3 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" style={{ maskImage: `url(${src})` }} />;
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
      {side === "right" ? <span aria-hidden="true" data-state={open ? "selected" : "unselected"} className={`size-4 bg-current ${open ? "[mask-image:url(/icons/map/collection-filled.svg)]" : "[mask-image:url(/icons/map/collection.svg)]"} [mask-position:center] [mask-repeat:no-repeat] [mask-size:16px_16px] ${open ? "text-text-primary" : "text-text-secondary"}`} /> : <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
        {open ? <path d={side === "left" ? "M3.5 2.5H6v11H3.5A1.5 1.5 0 0 1 2 12V4a1.5 1.5 0 0 1 1.5-1.5Z" : "M10 2.5h2.5A1.5 1.5 0 0 1 14 4v8a1.5 1.5 0 0 1-1.5 1.5H10Z"} fill="currentColor" stroke="none" /> : null}
        <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
        <path d={side === "left" ? "M6 2.5v11" : "M10 2.5v11"} />
      </svg>}
      {tip.current ? <ToolTip label={side === "right" ? "Actions" : "Features"} shortcut={side === "right" ? "A" : "F"} animate={tip.current.animate} align={side === "right" ? "right" : "left"} /> : null}
    </button>
  );
}
