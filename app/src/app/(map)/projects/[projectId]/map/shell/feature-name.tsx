"use client";

/*
 * The editable feature name.
 * A click or a double-click turns it into a text field.
 */

import { useEffect, useRef, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import { useMap } from "../map-context";

const nameClassName =
  "template-body-medium w-fit min-w-full max-w-full cursor-text truncate rounded-[4px] px-2 py-1 text-left whitespace-nowrap text-text-primary";

// Figma's layer rename: one 24px box. A transparent border keeps the text still.
const sidebarNameClassName =
  "template-body-medium box-border block h-6 max-h-6 min-h-6 w-full min-w-0 truncate rounded-[4px] border px-2 text-left leading-[22px] whitespace-nowrap text-text-primary outline-none";

// The feature name. Enter or click-away saves a unique name.
export function FeatureName({
  id,
  name,
  features,
  activate,
}: {
  id: string;
  name: string;
  features: GeoJSONStoreFeatures[];
  activate: "click" | "double-click";
}) {
  const { renameFeature } = useMap();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const canceling = useRef(false);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activate !== "double-click" || !editing) return;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [activate, editing]);

  // Turns the name into a text field and selects its text.
  function startEdit() {
    if (editing) return;
    canceling.current = false;
    setDraft(name);
    setEditing(true);
  }

  // Saves a changed unique name. A blank or taken name keeps the previous one.
  function commit() {
    if (canceling.current) {
      canceling.current = false;
      setEditing(false);
      return;
    }
    const next = draft.trim();
    const taken = features.some(
      (feature) =>
        String(feature.id) !== id &&
        typeof feature.properties.name === "string" &&
        feature.properties.name.toLowerCase() === next.toLowerCase(),
    );
    setEditing(false);
    if (next === "" || next.toLowerCase() === name.toLowerCase() || taken) return;
    renameFeature(id, next);
  }

  // Enter saves. Escape restores the name without saving.
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      canceling.current = true;
      event.currentTarget.blur();
    }
  }

  if (activate === "double-click") {
    return (
      <div
        className="min-w-0 w-full"
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          startEdit();
        }}
      >
        <input
          ref={fieldRef}
          aria-label="Feature name"
          readOnly={!editing}
          tabIndex={editing ? 0 : -1}
          value={editing ? draft : name}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (editing) commit();
          }}
          onKeyDown={onKeyDown}
          onClick={(event) => event.stopPropagation()}
          className={`${sidebarNameClassName} ${editing ? "border-text-primary bg-surface-canvas" : "pointer-events-none border-transparent bg-transparent"}`}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <input
        aria-label="Feature name"
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
        className="template-body-medium w-fit min-w-full max-w-full rounded-[4px] border-0 bg-surface-canvas px-2 py-1 text-text-primary outline-1 outline-text-primary"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`${nameClassName} hover:bg-surface-translucent-placeholder-2`}
    >
      {name}
    </button>
  );
}
