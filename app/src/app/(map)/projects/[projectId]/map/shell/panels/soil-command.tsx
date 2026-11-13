"use client";

/*
 * The soils command sidebar.
 */

import { mapPanel } from "../../map-context";

// Soil list for the open map.
export function SoilCommand() {
  return (
    <>
      <div className="flex shrink-0 items-center border-b border-surface-translucent-placeholder px-4 py-4">
        <p className="template-body-medium-emphasized whitespace-nowrap text-text-primary">
          {mapPanel.soils}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4" />
    </>
  );
}
