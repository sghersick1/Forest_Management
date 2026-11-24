"use client";

import { useState } from "react";
import type { ProjectAction } from "@/lib/actions/actions";
import { ParagraphField } from "@/app/components/texts/paragraph-field";
import { SentenceField } from "@/app/components/texts/sentence-field";

export function ProjectActionEditor({
  action,
  canEdit,
  onRename,
  onDescribe,
}: {
  action: ProjectAction;
  canEdit: boolean;
  onRename: (id: number, name: string) => Promise<void>;
  onDescribe: (id: number, description: string) => Promise<void>;
}) {
  const [error, setError] = useState(false);

  const save = async (operation: () => Promise<void>) => {
    setError(false);
    try {
      await operation();
    } catch (saveError) {
      console.error(saveError);
      setError(true);
    }
  };

  return (
    <section className="border-b border-border-map pb-5 last:border-0">
      {canEdit ? (
        <SentenceField
          value={action.name}
          ariaLabel="Action name"
          className="template-body-large-emphasized rounded px-1 text-left text-text-primary"
          onText={(change) => {
            if (change.action !== "delete" && change.text.trim() && change.text !== action.name) {
              void save(() => onRename(action.id, change.text.trim()));
            }
          }}
        />
      ) : (
        <h3 className="template-body-large-emphasized text-text-primary">{action.name}</h3>
      )}
      {canEdit ? (
        <div className="mt-2">
          <ParagraphField
            value={action.description}
            ariaLabel={`Description for ${action.name}`}
            placeholder="Add action details"
            className="template-body-medium min-h-8 w-full resize-y rounded border border-transparent bg-transparent px-1 py-1 text-text-secondary hover:border-border-map focus:border-border-selected focus:outline-none"
            onText={(change) => {
              const description = change.action === "delete" ? "" : change.text;
              if (description !== action.description) {
                void save(() => onDescribe(action.id, description));
              }
            }}
          />
        </div>
      ) : action.description ? (
        <p className="template-body-medium mt-2 whitespace-pre-wrap text-text-secondary">{action.description}</p>
      ) : null}
      {error ? <p role="alert" className="template-label-small mt-1 text-red-700">Could not save this action.</p> : null}
    </section>
  );
}
