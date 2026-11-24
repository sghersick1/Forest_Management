"use client";

/*
 * Title and description for the selected feature.
 * The card mounts this only while a feature is selected.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMap } from "../state/map-context";
import { FeatureName } from "./feature-name";
import { hasDescriptionBlock, readDescription } from "../../plan/stand-document-blocks";

const StandDocumentContent = dynamic(
  () => import("../../plan/stand-document-content").then((module) => module.StandDocumentContent),
  { ssr: false, loading: () => <div className="min-h-24" aria-label="Loading stand document" /> },
);

const titleClassName =
  "template-body-small-emphasized block w-full cursor-text break-words border-0 bg-transparent p-0 text-left whitespace-normal text-text-primary";

const fieldCardClassName =
  "shrink-0 rounded-[4px] border border-border-map bg-surface-canvas px-2 py-1 focus-within:border-border-selected";

// Title and description for the selected polygon.
export function FeatureDetails() {
  const {
    projectId,
    canEditStands,
    standDocuments,
    setStandDocument,
    wholeDocumentOpen,
    setWholeDocumentOpen,
    features,
    selectedFeature,
    describeFeature,
  } = useMap();
  if (selectedFeature === null) return null;

  const feature = features.find((item) => String(item.id) === selectedFeature);
  const featureName = typeof feature?.properties.name === "string" ? feature.properties.name : "";
  const description = typeof feature?.properties.description === "string" ? feature.properties.description : "";
  const content = standDocuments[selectedFeature];
  const documentDescription = content && hasDescriptionBlock(content) ? readDescription(content) : description;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pt-1.5">
      <div className={fieldCardClassName}>
        <p className="template-label-xs text-text-secondary">Title</p>
        {canEditStands ? (
          <FeatureName
            key={selectedFeature}
            id={selectedFeature}
            name={featureName}
            features={features}
            activate="click"
            className={titleClassName}
          />
        ) : (
          <p className={titleClassName}>{featureName}</p>
        )}
      </div>
      {wholeDocumentOpen ? null : (
        <StandDocumentContent
          projectId={projectId}
          featureId={selectedFeature}
          description={documentDescription}
          initialContent={content}
          canEdit={canEditStands}
          onContentChange={(nextContent) => setStandDocument(selectedFeature, nextContent)}
          onDescriptionChange={(nextDescription) => {
            if (nextDescription !== description) {
              describeFeature(selectedFeature, nextDescription);
            }
          }}
          onViewWholeDocument={() => setWholeDocumentOpen(true)}
          compact
        />
      )}
      <Link
        href={`/projects/${projectId}/plan?stand=${encodeURIComponent(selectedFeature)}`}
        className="template-body-small mt-1 rounded-[4px] px-2 py-1 text-text-primary hover:bg-surface-translucent-placeholder-2"
      >
        View Stand Plan
      </Link>
    </div>
  );
}
