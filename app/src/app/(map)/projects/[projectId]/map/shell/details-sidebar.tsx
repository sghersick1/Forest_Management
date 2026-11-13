"use client";

/*
 * The resizable details sidebar on the right of the map.
 * Each panel decides when its details are open.
 */

import { useMap } from "../map-context";
import { panelViews } from "./panels/panel-views";
import { useSidebarWidth } from "./use-sidebar-width";

// The right sidebar for the open panel.
export function DetailsSidebar() {
  const { panel, selectedFeature } = useMap();
  const view = panelViews[panel];
  const open = view.detailsOpen(selectedFeature);
  const {
    asideRef,
    width,
    minWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useSidebarWidth("details-sidebar-width", "end", open);

  if (!open) return null;

  const Details = view.Details;

  return (
    <aside
      ref={asideRef}
      aria-label="Details"
      style={{ width }}
      className="absolute inset-y-0 right-0 z-10"
    >
      <div className="flex h-full flex-col overflow-hidden border-l border-border-map bg-surface-canvas">
        <Details />
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
