"use client";

/*
 * Title and description for the selected feature.
 * The card mounts this only while a feature is selected.
 */

import { ParagraphField } from "@/app/components/texts/paragraph-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";
import { useMap } from "../state/map-context";
import { FeatureName } from "./feature-name";

const titleClassName =
  "template-body-small-emphasized block w-full cursor-text break-words border-0 bg-transparent p-0 text-left whitespace-normal text-text-primary";

const descriptionClassName =
  "template-body-small box-border block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-left text-text-primary shadow-none outline-none field-sizing-content";

const fieldCardClassName =
  "shrink-0 rounded-[4px] border border-border-map bg-surface-canvas px-2 py-1 focus-within:border-border-selected";

// Title and description for the selected polygon.
export function FeatureDetails() {
  const { features, selectedFeature, describeFeature } = useMap();
  if (selectedFeature === null) return null;

  const feature = features.find((item) => String(item.id) === selectedFeature);
  const featureName = typeof feature?.properties.name === "string" ? feature.properties.name : "";
  const description =
    typeof feature?.properties.description === "string" ? feature.properties.description : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pt-1.5">
      <div className={fieldCardClassName}>
        <p className="template-label-xs text-text-secondary">Title</p>
        <FeatureName
          key={selectedFeature}
          id={selectedFeature}
          name={featureName}
          features={features}
          activate="click"
          className={titleClassName}
        />
      </div>
      <div className={fieldCardClassName}>
        <p className="template-label-xs text-text-secondary">Description</p>
        <ParagraphField
          key={selectedFeature}
          value={description}
          placeholder=""
          className={descriptionClassName}
          onText={(change) => saveDescription(selectedFeature, change, describeFeature)}
        />
      </div>
    </div>
  );
}

// An empty description is stored as an empty string.
function saveDescription(
  id: string,
  change: TextFieldChange,
  describeFeature: (id: string, description: string) => void,
) {
  describeFeature(id, change.action === "delete" ? "" : change.text);
}
