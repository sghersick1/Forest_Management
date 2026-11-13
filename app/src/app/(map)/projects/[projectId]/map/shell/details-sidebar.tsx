"use client";

/*
 * Blank details panel on the right of the map.
 * It is visible only while a feature is selected.
 */

import { useEffect, useRef, useState } from "react";
import { useMap } from "../map-context";
import { FeatureName } from "./feature-name";

const storageKey = "details-sidebar-width";
const defaultWidth = 224;
const minWidth = 200;

// The resizable details sidebar. Hidden when nothing is selected.
export function DetailsSidebar() {
  const { features, selectedFeature } = useMap();
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
    if (selectedFeature !== null) {
      setWidth((current) =>
        clampWidth(current, asideRef.current?.parentElement),
      );
      return;
    }
    dragging.current = false;
    document.documentElement.classList.remove("sidebar-resizing");
  }, [selectedFeature]);

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
    const next = aside.getBoundingClientRect().right - event.clientX;
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

  if (selectedFeature === null) return null;

  const feature = features.find((item) => String(item.id) === selectedFeature);
  const featureName = typeof feature?.properties.name === "string" ? feature.properties.name : "";

  return (
    <aside
      ref={asideRef}
      aria-label="Details"
      style={{ width }}
      className="absolute inset-y-0 right-0 z-10"
    >
      <div className="flex h-full flex-col overflow-hidden border-l border-border-map bg-surface-canvas">
        <div className="flex w-full shrink-0 items-center gap-1 border-b border-surface-translucent-placeholder p-2">
          <div className="min-w-0 flex-1">
            <FeatureName
              key={selectedFeature}
              id={selectedFeature}
              name={featureName}
              features={features}
              activate="click"
            />
          </div>
          <p className="template-body-small shrink-0 pr-2 text-text-secondary tabular-nums">
            11.4 acres
          </p>
        </div>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize details sidebar"
        aria-valuemin={minWidth}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none"
      />
    </aside>
  );
}

// Keeps the sidebar between its minimum and 45% of the map width.
function clampWidth(width: number, parent: Element | null | undefined) {
  const max = parent ? parent.clientWidth * 0.45 : Number.POSITIVE_INFINITY;
  return Math.round(Math.min(Math.max(width, minWidth), max));
}
