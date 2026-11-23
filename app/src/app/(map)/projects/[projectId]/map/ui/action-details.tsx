"use client";

/*
 * Details for the selected action.
 * The right sidebar shows this in place of the action list.
 */

import { ParagraphField } from "@/app/components/texts/paragraph-field";
import { SentenceField } from "@/app/components/texts/sentence-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";
import { useMap } from "../state/map-context";
import { FeatureListRow } from "./feature-list-row";

const headerButtonClass =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

// Name, then either the description or the feature list.
export function ActionDetails() {
  const {
    actions,
    features,
    selectedAction,
    renameAction,
    describeAction,
    linking,
    setLinking,
    linkedFeatureIds,
    toggleLinkedFeature,
    hoverFeature,
    setHoverFeature,
  } = useMap();

  if (selectedAction === null) return null;

  const action = actions.find((item) => item.id === selectedAction);
  if (!action) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ActionHeader
        actionId={action.id}
        name={action.name}
        featuresOpen={linking}
        onToggleFeatures={() => setLinking(!linking)}
        onName={(change) => saveName(action.id, action.name, change, renameAction)}
      />
      {linking ? (
        <ActionFeatures
          features={features}
          linkedFeatureIds={linkedFeatureIds}
          hoverFeature={hoverFeature}
          onUnlink={toggleLinkedFeature}
          onHoverStart={setHoverFeature}
          onHoverEnd={() => setHoverFeature(null)}
        />
      ) : (
        <ActionDescription
          actionId={action.id}
          value={action.description}
          onText={(change) => saveDescription(action.id, change, describeAction)}
        />
      )}
    </div>
  );
}

// The action title and its header buttons.
function ActionHeader({
  actionId,
  name,
  featuresOpen,
  onToggleFeatures,
  onName,
}: {
  actionId: number;
  name: string;
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  onName: (change: TextFieldChange) => void;
}) {
  const { renameNewAction, setRenameNewAction } = useMap();
  return (
    <header className="flex w-full shrink-0 items-center gap-2 pl-2 pr-4 pt-2">
      <div className="min-w-0 flex-1">
        <SentenceField key={actionId} value={name} ariaLabel="Action name" onText={onName} autoEdit={renameNewAction === actionId} onEditFocus={() => { if (renameNewAction === actionId) setRenameNewAction(null); }} />
      </div>
      <button
        type="button"
        aria-label="Add keyframes"
        aria-pressed={featuresOpen}
        onClick={onToggleFeatures}
        className={`${headerButtonClass} aria-pressed:bg-surface-action-linked aria-pressed:hover:bg-surface-action-linked`}
      >
        <span aria-hidden="true" className="size-[18px] bg-current text-text-primary [mask-image:url(/icons/map/add-keyframes.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
      </button>
    </header>
  );
}

// The description under the header.
function ActionDescription({
  actionId,
  value,
  onText,
}: {
  actionId: number;
  value: string;
  onText: (change: TextFieldChange) => void;
}) {
  return (
    <section aria-label="Action description" className="shrink-0 px-2">
      <ParagraphField key={actionId} value={value} onText={onText} />
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
  onUnlink: (id: string) => void;
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
    <section aria-label="Action features" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto bg-surface-canvas">
      {rows.map((row) => (
        <FeatureListRow
          key={row.id}
          id={row.id}
          name={row.name}
          features={features}
          pressed={false}
          hovered={hoverFeature === row.id}
          onRemove={() => onUnlink(row.id)}
          removeLabel={`Unlink ${row.name}`}
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
