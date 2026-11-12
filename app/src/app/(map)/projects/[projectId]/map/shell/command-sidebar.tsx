"use client";

/*
 * The list of polygons for the open map panel.
 * A row selects that polygon and hovering a row hovers it on the map.
 */

import { useEffect, useRef, useState } from "react";
import { mapPanel, useMap } from "../map-context";
import { FeatureName } from "./feature-name";
import { mapNavWidth } from "./panel-bar";

const storageKey = "map-sidebar-width";
const defaultWidth = 224;
const minWidth = 200;

// The resizable sidebar of stored polygons.
export function CommandSidebar() {
  const { panel, features, selectedFeature, setSelectedFeature, hoverFeature, setHoverFeature, setTool } = useMap();
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
    const next = event.clientX - aside.getBoundingClientRect().left;
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

  return (
    <aside
      ref={asideRef}
      style={{ width, left: mapNavWidth }}
      className="absolute inset-y-0 z-10"
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-border-map bg-surface-canvas">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-translucent-placeholder px-4 py-2">
          <p className="template-body-medium-emphasized whitespace-nowrap text-text-primary">
            {mapPanel[panel]}
          </p>
          <button
            type="button"
            aria-label="Add layer"
            className="flex size-3.5 shrink-0 items-center justify-center overflow-hidden text-[24px] font-extralight leading-[0.6] tracking-normal text-text-primary"
          >
            +
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {features.map((feature) => {
            const id = String(feature.id);
            const selected = selectedFeature === id;
            const hovered = hoverFeature === id;
            const name = typeof feature.properties.name === "string" ? feature.properties.name : id;
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onMouseEnter={() => setHoverFeature(id)}
                onMouseLeave={() => setHoverFeature(null)}
                onClick={() => {
                  setTool("pointer");
                  setSelectedFeature(id);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setTool("pointer");
                  setSelectedFeature(id);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 overflow-hidden px-4 text-left transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary hover:bg-surface-translucent-placeholder-2 ${selected || hovered ? "bg-surface-translucent-placeholder-2" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="size-3.5 shrink-0 bg-surface-header [mask-image:url(/icons/map/pentagon.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                />
                <div className="min-w-0 flex-1">
                  <FeatureName
                    id={id}
                    name={name}
                    features={features}
                    activate="double-click"
                  />
                </div>
              </div>
            );
          })}
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

// Keeps the sidebar between its minimum and 45% of the map width.
function clampWidth(width: number, parent: Element | null | undefined) {
  const max = parent ? parent.clientWidth * 0.45 : Number.POSITIVE_INFINITY;
  return Math.round(Math.min(Math.max(width, minWidth), max));
}
