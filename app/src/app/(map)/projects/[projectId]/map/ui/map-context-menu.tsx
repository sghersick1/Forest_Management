"use client";

/*
 * Right-click and overflow menu for one feature or one action.
 * Reads MapMenu from map state, portals onto document.body, and closes on an outside press, Escape, resize, or scroll.
 * Delete is the only item. Action delete waits on the server. Feature delete is queued and does not report failure here.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "../state/map-context";

export function MapContextMenu() {
  const { contextMenu, setContextMenu, deleteAction, deleteFeature, canEdit } = useMap();
  const root = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!contextMenu) return;
    setError(false);
    setDeleting(false);
    const previous = document.activeElement;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setContextMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setContextMenu(null); } };
    const close = () => setContextMenu(null);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [contextMenu, setContextMenu]);
  if (!contextMenu || !canEdit) return null;
  return createPortal(<div ref={root} role="menu" aria-label={contextMenu.kind === "feature" ? "Feature options" : "Action options"} style={{ left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 168)), top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 88)) }} className="fixed z-50 w-40 rounded-[8px] border border-border-map bg-surface-canvas p-1 shadow-lg" onContextMenu={(event) => event.preventDefault()}>
    <button type="button" role="menuitem" disabled={deleting} className="template-body-small w-full cursor-pointer rounded-[4px] px-2 py-1 text-left text-red-600 hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-border-selected disabled:opacity-50" onClick={async () => {
      setDeleting(true); setError(false);
      try {
        if (contextMenu.kind === "action") await deleteAction(contextMenu.id);
        else deleteFeature(contextMenu.id);
        setContextMenu(null);
      } catch { setError(true); setDeleting(false); }
    }}>{deleting ? "Deleting…" : "Delete"}</button>
    {error ? <p role="alert" className="template-body-small px-2 py-1 text-text-secondary">Could not delete. Try again.</p> : null}
  </div>, document.body);
}
