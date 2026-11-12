"use client";

/*
 * One button in the map panel bar.
 * The pressed button is the open sidebar panel.
 */

import { useMap, type MapPanel } from "./map-context";

// Selects this panel when pressed.
export function Panel({
  id,
  label,
  children,
}: {
  id: MapPanel;
  label: string;
  children: React.ReactNode;
}) {
  const { panel, setPanel } = useMap();
  const selected = panel === id;

  return (
    <div className="flex flex-col items-center gap-0.25">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        onClick={() => setPanel(id)}
        className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[4px] transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${selected ? "bg-surface-translucent-placeholder-2" : "hover:bg-surface-translucent-placeholder-2"}`}
      >
        {children}
      </button>
      <span className="template-label-small font-normal! whitespace-nowrap text-text-primary">
        {label}
      </span>
    </div>
  );
}
