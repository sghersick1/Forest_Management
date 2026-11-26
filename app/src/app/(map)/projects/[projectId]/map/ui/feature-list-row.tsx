"use client";

/*
 * One feature row in an action sidebar.
 * The row matches the features list: pentagon, name, and an optional hover X.
 */

import type { GeoJSONStoreFeatures } from "terra-draw";
import { useMap } from "../state/map-context";
import { FeatureName } from "./feature-name";

// A feature row. Press toggles or selects. The X runs the caller's remove.
export function FeatureListRow({
  id,
  name,
  features,
  pressed,
  hovered,
  linked = false,
  linking = false,
  onPress,
  onRemove,
  removeLabel,
  onHoverStart,
  onHoverEnd,
}: {
  id: string;
  name: string;
  features: GeoJSONStoreFeatures[];
  pressed: boolean;
  hovered: boolean;
  linked?: boolean;
  linking?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const { setContextMenu, canEdit } = useMap();
  // Selection and action links keep their colors while the pointer is over the row.
  const background = pressed
    ? linking
      ? "bg-surface-action-linked hover:bg-surface-action-linked"
      : "bg-surface-selected hover:bg-surface-selected"
    : linked
      ? "bg-surface-action-linked hover:bg-surface-action-linked"
      : `${hovered ? "bg-surface-translucent-placeholder-2" : ""} hover:bg-surface-translucent-placeholder-2`;
  return (
    <div
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      aria-pressed={onPress ? pressed : undefined}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); if (!canEdit) return; setContextMenu({ kind: "feature", id, x: event.clientX, y: event.clientY }); }}
      onClick={onPress}
      onKeyDown={onPress ? (event) => onRowKey(event, onPress) : undefined}
      className={`group flex w-full items-center gap-2.5 overflow-hidden px-4 text-left transition-colors duration-200 ease-in-out ${onPress ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected" : ""} ${background}`}
    >
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 bg-surface-header [mask-image:url(/icons/map/pentagon.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${onRemove ? "group-hover:hidden" : ""}`}
      />
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="hidden size-3 shrink-0 cursor-pointer items-center justify-center text-surface-header transition-colors duration-200 ease-in-out group-hover:flex hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="block shrink-0">
            <path d="m2.5 2.5 7 7m0-7-7 7" />
          </svg>
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <FeatureName id={id} name={name} features={features} activate="double-click" />
      </div>
    </div>
  );
}

function onRowKey(event: React.KeyboardEvent<HTMLDivElement>, onPress: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onPress();
}
