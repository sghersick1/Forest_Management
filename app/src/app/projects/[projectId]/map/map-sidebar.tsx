"use client";

import { useEffect, useRef, useState } from "react";
import { LogoPlaceholder } from "@/app/components/header/logo-placeholder";

const storageKey = "map-sidebar-width";
const defaultWidth = 224;
const minWidth = 200;

export function MapSidebar({ title }: { title: string }) {
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
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, String(width));
  }, [ready, width]);

  useEffect(() => {
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

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("sidebar-resizing");
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const parent = asideRef.current?.parentElement;
    if (!parent) return;
    const next = event.clientX - parent.getBoundingClientRect().left;
    setWidth(clampWidth(next, parent));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    document.documentElement.classList.remove("sidebar-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <aside
      ref={asideRef}
      style={{ width }}
      className="absolute inset-y-0 left-0 z-10"
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-border-map bg-surface-canvas">
        <div className="flex items-center gap-4 border-b border-surface-translucent-placeholder px-4 py-4">
          <LogoPlaceholder />
          <h1 className="template-body-medium-emphasized min-w-0 truncate text-text-primary">
            {title}
          </h1>
        </div>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={minWidth}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none"
      />
    </aside>
  );
}

function clampWidth(width: number, parent: Element | null | undefined) {
  const max = parent ? parent.clientWidth / 2 : Number.POSITIVE_INFINITY;
  return Math.round(Math.min(Math.max(width, minWidth), max));
}
