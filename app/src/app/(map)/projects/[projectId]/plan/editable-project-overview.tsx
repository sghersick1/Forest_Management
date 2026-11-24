"use client";

import { useState } from "react";
import type { ProjectOverviewFieldKey } from "@/lib/projects/update-project-overview";

export type OverviewField = {
  key: ProjectOverviewFieldKey;
  label: string;
  value: string | null;
};

export function EditableProjectOverview({
  fields,
  canEdit,
  onSave,
}: {
  fields: OverviewField[];
  canEdit: boolean;
  onSave: (key: ProjectOverviewFieldKey, value: string) => Promise<void>;
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <OverviewValue key={`${field.key}:${field.value ?? ""}`} field={field} canEdit={canEdit} onSave={onSave} />
      ))}
    </dl>
  );
}

function OverviewValue({
  field,
  canEdit,
  onSave,
}: {
  field: OverviewField;
  canEdit: boolean;
  onSave: (key: ProjectOverviewFieldKey, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(field.value ?? "");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = value.trim();
    if (next === (field.value ?? "")) return;
    setSaving(true);
    setError(false);
    try {
      await onSave(field.key, next);
    } catch (saveError) {
      console.error(saveError);
      setValue(field.value ?? "");
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <dt className="template-label-small text-text-secondary">{field.label}</dt>
      {canEdit ? (
        <dd>
          <input
            aria-label={field.label}
            value={value}
            maxLength={500}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setValue(field.value ?? "");
                event.currentTarget.blur();
              }
            }}
            className="template-body-medium mt-1 w-full rounded-[4px] border border-transparent bg-transparent px-1 py-0.5 text-text-primary hover:border-border-map focus:border-border-selected focus:bg-surface-canvas focus:outline-none"
          />
          {error ? <p role="alert" className="template-label-small text-red-700">Could not save this field.</p> : null}
          {saving ? <span className="sr-only">Saving {field.label}</span> : null}
        </dd>
      ) : (
        <dd className="template-body-medium mt-1 text-text-primary">{field.value || "—"}</dd>
      )}
    </div>
  );
}
