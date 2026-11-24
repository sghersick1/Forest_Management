"use client";

import { useState } from "react";
import area from "@turf/area";
import { convertArea } from "@turf/helpers";
import type { MapFeature, MapPolygon } from "@/lib/maps/map-features";
import { SentenceField } from "@/app/components/texts/sentence-field";
import { StandDocumentContent } from "./stand-document-content";

export function StandEditor({
  projectId,
  feature,
  initialContent,
  canEdit,
  onRename,
  onContentChange,
  onDescriptionChange,
  onViewWholeDocument,
}: {
  projectId: number;
  feature: MapFeature;
  initialContent: unknown[] | undefined;
  canEdit: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onContentChange: (id: string, content: unknown[]) => void;
  onDescriptionChange: (id: string, description: string) => void | Promise<void>;
  onViewWholeDocument: () => void;
}) {
  const [metadataError, setMetadataError] = useState(false);
  const acres = polygonAcres(feature.geometry);

  const saveMetadata = async (save: () => Promise<void>) => {
    setMetadataError(false);
    try {
      await save();
    } catch (error) {
      console.error(error);
      setMetadataError(true);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[860px] items-start justify-between gap-6 px-10 pt-10 pb-5">
        <div>
          <label className="template-label-small text-text-secondary" htmlFor="stand-title">Stand name</label>
          <div className="template-title-large mt-1">
            <SentenceField
              value={feature.name}
              ariaLabel="Stand name"
              className="w-full border-0 bg-transparent p-0 text-left text-text-primary outline-none"
              onText={(change) => {
                if (change.action !== "delete" && change.text.trim() && change.text !== feature.name) {
                  void saveMetadata(() => onRename(feature.id, change.text.trim()));
                }
              }}
            />
          </div>
          {acres !== null ? <p className="template-body-small mt-1 text-text-secondary">{formatAcres(acres)}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!canEdit ? <span className="template-body-small text-text-secondary">Read-only</span> : null}
          {metadataError ? <span role="alert" className="template-body-small text-red-700">Stand details failed to save</span> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-16">
        <div className="mx-auto w-full max-w-[860px]">
          <StandDocumentContent
            projectId={projectId}
            featureId={feature.id}
            description={feature.description}
            initialContent={initialContent}
            canEdit={canEdit}
            onContentChange={(content) => onContentChange(feature.id, content)}
            onDescriptionChange={(description) => onDescriptionChange(feature.id, description)}
            onViewWholeDocument={onViewWholeDocument}
          />
        </div>
      </div>
    </div>
  );
}

function polygonAcres(polygon: MapPolygon): number | null {
  if (polygon.type !== "Polygon") return null;
  return convertArea(area(polygon as unknown as GeoJSON.Feature), "meters", "acres");
}

function formatAcres(acres: number) {
  return `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(acres)} acres`;
}
