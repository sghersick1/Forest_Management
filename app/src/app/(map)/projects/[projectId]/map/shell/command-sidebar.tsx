"use client";

/*
 * The resizable command sidebar for the open map panel.
 * The panel view supplies the header and the list.
 */

import { useMap } from "../map-context";
import { panelViews } from "./panels/panel-views";
import { mapNavWidth } from "./panel-bar";
import { useSidebarWidth } from "./use-sidebar-width";

// The left sidebar. Its contents follow the selected panel.
export function CommandSidebar() {
  const { panel } = useMap();
  const {
    asideRef,
    width,
    minWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useSidebarWidth("map-sidebar-width", "start");
  const Command = panelViews[panel].Command;

  return (
    <aside
      ref={asideRef}
      style={{ width, left: mapNavWidth }}
      className="absolute inset-y-0 z-10"
    >
      <div className="flex h-full flex-col overflow-hidden border-r border-border-map bg-surface-canvas">
        <Command />
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
