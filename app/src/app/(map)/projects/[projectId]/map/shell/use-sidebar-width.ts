"use client";

/*
 * Stored width and drag resize for a map sidebar.
 * start measures from the left edge. end measures from the right edge.
 */

import { useEffect, useRef, useState } from "react";

const defaultWidth = 224;
const minWidth = 200;

// Width, bounds, and pointer handlers for one sidebar.
export function useSidebarWidth(
  storageKey: string,
  edge: "start" | "end",
  open = true,
) {
  const asideRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(defaultWidth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    const stored = raw === null ? Number.NaN : Number(raw);
    if (Number.isFinite(stored)) {
      setWidth(clampWidth(stored, asideRef.current?.parentElement));
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, String(width));
  }, [ready, storageKey, width]);

  useEffect(() => {
    if (open) {
      setWidth((current) =>
        clampWidth(current, asideRef.current?.parentElement),
      );
      return;
    }
    dragging.current = false;
    document.documentElement.classList.remove("sidebar-resizing");
  }, [open]);

  useEffect(() => {
    // Keeps the sidebar inside the map after the window changes size.
    function onResize() {
      setWidth((current) =>
        clampWidth(current, asideRef.current?.parentElement),
      );
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      document.documentElement.classList.remove("sidebar-resizing");
    };
  }, []);

  // Starts a sidebar resize drag.
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("sidebar-resizing");
  }

  // Updates the sidebar width while the resize handle is dragged.
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const aside = asideRef.current;
    const parent = aside?.parentElement;
    if (!aside || !parent) return;
    const bounds = aside.getBoundingClientRect();
    const next =
      edge === "start"
        ? event.clientX - bounds.left
        : bounds.right - event.clientX;
    setWidth(clampWidth(next, parent));
  }

  // Ends the sidebar resize drag.
  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    document.documentElement.classList.remove("sidebar-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    asideRef,
    width,
    minWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

// Keeps the sidebar between its minimum and 45% of the map width.
function clampWidth(width: number, parent: Element | null | undefined) {
  const max = parent ? parent.clientWidth * 0.45 : Number.POSITIVE_INFINITY;
  return Math.round(Math.min(Math.max(width, minWidth), max));
}
