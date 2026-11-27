"use client";

/*
 * Details for the selected action.
 * The right sidebar shows this in place of the action list.
 */

import { ParagraphField } from "@/app/components/texts/paragraph-field";
import { SentenceField } from "@/app/components/texts/sentence-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";
import { useMap } from "../state/map-context";
import { useActionEdits } from "../state/action-edits";
import { ActionStatusButton } from "./action-status";
import { FeatureListRow } from "./feature-list-row";

// Title + body scroll; status bar stays pinned at the bottom.
export function ActionDetails({
  renameNewAction,
  setRenameNewAction,
}: {
  renameNewAction: number | null;
  setRenameNewAction: (id: number | null) => void;
}) {
  const {
    actions,
    features,
    selectedAction,
    linking,
    linkedFeatureIds,
    toggleLinkedFeature,
    hoverFeature,
    setHoverFeature,
    setStatusAction,
    canEdit,
  } = useMap();
  const { renameAction, describeAction } = useActionEdits();

  if (selectedAction === null) return null;

  const action = actions.find((item) => item.id === selectedAction);
  if (!action) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ActionHeader
          actionId={action.id}
          name={action.name}
          renameNewAction={renameNewAction}
          onRenameFocus={() => { if (renameNewAction === action.id) setRenameNewAction(null); }}
          onName={(change) => saveName(action.id, action.name, change, renameAction)}
          readOnly={!canEdit}
        />
        {linking ? (
          <ActionFeatures
            features={features}
            linkedFeatureIds={linkedFeatureIds}
            hoverFeature={hoverFeature}
            onUnlink={canEdit ? toggleLinkedFeature : undefined}
            onHoverStart={setHoverFeature}
            onHoverEnd={() => setHoverFeature(null)}
          />
        ) : (
          <ActionDescription
            actionId={action.id}
            value={action.description}
            readOnly={!canEdit}
            onText={(change) => saveDescription(action.id, change, describeAction)}
          />
        )}
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 bg-surface-canvas px-4 py-3">
        <ActionStatusButton status={action.status} onStatus={(status) => setStatusAction(action.id, status)} outline />
      </div>
    </div>
  );
}

// Action title only — status lives in the sticky bottom bar.
function ActionHeader({
  actionId,
  name,
  renameNewAction,
  onRenameFocus,
  onName,
  readOnly = false,
}: {
  actionId: number;
  name: string;
  renameNewAction: number | null;
  onRenameFocus: () => void;
  onName: (change: TextFieldChange) => void;
  readOnly?: boolean;
}) {
  return (
    <header className="flex w-full shrink-0 pl-2 pr-4 pt-2">
      <div className="min-w-0 flex-1">
        <SentenceField key={actionId} value={name} ariaLabel="Action name" onText={onName} autoEdit={!readOnly && renameNewAction === actionId} onEditFocus={onRenameFocus} readOnly={readOnly} />
      </div>
    </header>
  );
}

// The description under the header.
function ActionDescription({
  actionId,
  value,
  onText,
  readOnly = false,
}: {
  actionId: number;
  value: string;
  onText: (change: TextFieldChange) => void;
  readOnly?: boolean;
}) {
  return (
    <section aria-label="Action description" className="shrink-0 px-2">
      <ParagraphField key={actionId} value={value} onText={onText} readOnly={readOnly} />
    </section>
  );
}

// Features linked to this action. The X removes the link.
function ActionFeatures({
  features,
  linkedFeatureIds,
  hoverFeature,
  onUnlink,
  onHoverStart,
  onHoverEnd,
}: {
  features: ReturnType<typeof useMap>["features"];
  linkedFeatureIds: string[];
  hoverFeature: string | null;
  onUnlink?: (id: string) => void;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
}) {
  const rows = linkedFeatureIds.flatMap((id) => {
    const feature = features.find((item) => String(item.id) === id);
    if (!feature) return [];
    const name = typeof feature.properties.name === "string" ? feature.properties.name : id;
    return [{ id, name }];
  });

  return (
    <section aria-label="Action features" className="space-y-0.5 bg-surface-canvas">
      {rows.map((row) => (
        <FeatureListRow
          key={row.id}
          id={row.id}
          name={row.name}
          features={features}
          pressed={false}
          hovered={hoverFeature === row.id}
          onRemove={onUnlink ? () => onUnlink(row.id) : undefined}
          removeLabel={onUnlink ? `Unlink ${row.name}` : undefined}
          onHoverStart={() => onHoverStart(row.id)}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </section>
  );
}

// A blank name stays as it is. Delete does not clear an action name.
function saveName(
  id: number,
  name: string,
  change: TextFieldChange,
  renameAction: (id: number, name: string) => void,
) {
  if (change.action === "delete") return;
  if (change.text.toLowerCase() === name.toLowerCase()) return;
  renameAction(id, change.text);
}

// An empty description is stored as an empty string.
function saveDescription(
  id: number,
  change: TextFieldChange,
  describeAction: (id: number, description: string) => void,
) {
  describeAction(id, change.action === "delete" ? "" : change.text);
}
