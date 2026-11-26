"use client";

/*
 * The editable feature name.
 * A click uses the shared title. A double-click edits the list row.
 */

import { useEffect, useRef, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import { SentenceField } from "@/app/components/texts/sentence-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";
import { useMap } from "../state/map-context";
import { useFeatureEdits } from "../state/feature-edits";

// One 24px box. The 16px type sits in 3px of padding above and below, so the label does not jump into the field.
const sidebarNameClassName =
  "template-body-small box-border block h-6 max-h-6 min-h-6 w-full min-w-0 truncate rounded-[4px] border px-2 py-[3px] text-left whitespace-nowrap text-text-primary outline-none";

// The feature name. Enter or click-away saves a unique name.
export function FeatureName({
  id,
  name,
  features,
  activate,
  className,
}: {
  id: string;
  name: string;
  features: GeoJSONStoreFeatures[];
  activate: "click" | "double-click";
  className?: string;
}) {
  const { canEdit } = useMap();
  const { renameFeature, renameNewFeature, setRenameNewFeature } = useFeatureEdits();

  // A blank or taken name stays as it is. Delete does not clear a feature name.
  function onText(change: TextFieldChange) {
    if (change.action === "delete") return;
    const taken = nameTaken(features, id, change.text);
    if (taken || change.text.toLowerCase() === name.toLowerCase()) return;
    renameFeature(id, change.text);
  }

  if (!canEdit) {
    const quiet = className ? className.replace("cursor-text", "cursor-default") : `${sidebarNameClassName} select-none border-transparent bg-transparent`;
    return <div className={quiet}>{name}</div>;
  }

  if (activate === "click") {
    return <SentenceField value={name} ariaLabel="Feature name" onText={onText} autoEdit={renameNewFeature === id} onEditFocus={() => { if (renameNewFeature === id) setRenameNewFeature(null); }} className={className} />;
  }

  return (
    <ListFeatureName id={id} name={name} features={features} renameFeature={renameFeature} />
  );
}

// The feature list row. A double-click turns the name into a text field.
function ListFeatureName({
  id,
  name,
  features,
  renameFeature,
}: {
  id: string;
  name: string;
  features: GeoJSONStoreFeatures[];
  renameFeature: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const canceling = useRef(false);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [editing]);

  function startEdit() {
    if (editing) return;
    canceling.current = false;
    setDraft(name);
    setEditing(true);
  }

  function commit() {
    if (canceling.current) {
      canceling.current = false;
      setEditing(false);
      return;
    }
    const next = draft.trim();
    setEditing(false);
    if (next === "" || next.toLowerCase() === name.toLowerCase() || nameTaken(features, id, next)) {
      return;
    }
    renameFeature(id, next);
  }

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

  return (
    <div
      className="min-w-0 w-full"
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startEdit();
      }}
    >
      {editing ? (
        <input
          ref={fieldRef}
          aria-label="Feature name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          onClick={(event) => event.stopPropagation()}
          className={`${sidebarNameClassName} cursor-text border-border-selected bg-surface-canvas`}
        />
      ) : (
        <div className={`${sidebarNameClassName} select-none border-transparent bg-transparent`}>{name}</div>
      )}
    </div>
  );
}

function nameTaken(features: GeoJSONStoreFeatures[], id: string, name: string) {
  return features.some(
    (feature) =>
      String(feature.id) !== id &&
      typeof feature.properties.name === "string" &&
      feature.properties.name.toLowerCase() === name.toLowerCase(),
  );
}
