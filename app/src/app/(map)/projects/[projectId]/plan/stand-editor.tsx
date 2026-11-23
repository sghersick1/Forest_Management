"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import area from "@turf/area";
import { convertArea } from "@turf/helpers";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import type { MapFeature, MapPolygon } from "@/lib/maps/map-features";
import { createClient } from "@/lib/supabase/client";

type SaveStatus = "saved" | "saving" | "error";

const template = [
  { type: "heading", props: { level: 2 }, content: "Current Conditions" },
  { type: "paragraph", content: "Describe current stand conditions, structure, and health." },
  { type: "heading", props: { level: 2 }, content: "Stand History" },
  { type: "paragraph", content: "Record notable treatments, disturbance, and ownership history." },
  { type: "heading", props: { level: 2 }, content: "Tree Species" },
  { type: "paragraph", content: "List dominant and associated tree species." },
  { type: "heading", props: { level: 2 }, content: "Management Recommendations" },
  { type: "paragraph", content: "Add recommended treatments and future objectives." },
] as const;

export function StandEditor({
  projectId,
  feature,
  initialContent,
  canEdit,
}: {
  projectId: number;
  feature: MapFeature;
  initialContent: unknown[] | undefined;
  canEdit: boolean;
}) {
  const hasSavedDocument = initialContent !== undefined;
  const initial = useMemo<PartialBlock[]>(
    () => (hasSavedDocument ? initialContent as PartialBlock[] : template as unknown as PartialBlock[]),
    [hasSavedDocument, initialContent],
  );
  const editor = useCreateBlockNote({ initialContent: initial.length > 0 ? initial : undefined });
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDocument = useRef<unknown[] | null>(null);
  const acres = polygonAcres(feature.geometry);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const saveDocument = useCallback(async (content: unknown[]) => {
    pending.current = true;
    setStatus("saving");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("stand_documents").upsert(
        { project_id: projectId, map_feature_id: feature.id, content, edited_at: new Date().toISOString() },
        { onConflict: "project_id,map_feature_id" },
      );
      if (error) throw error;
      pending.current = false;
      setStatus("saved");
    } catch (error) {
      console.error(error);
      pending.current = false;
      setStatus("error");
    }
  }, [feature.id, projectId]);

  const scheduleSave = (document: unknown[]) => {
    if (!canEdit) return;
    latestDocument.current = document;
    pending.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveDocument(document), 700);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current && latestDocument.current) {
      void saveDocument(latestDocument.current);
    }
  }, [saveDocument]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[860px] items-end justify-between px-10 pt-10 pb-5">
        <div>
          <h1 className="template-title-large">{feature.name}</h1>
          {acres !== null ? <p className="template-body-small mt-1 text-text-secondary">{formatAcres(acres)}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {!canEdit ? <span className="template-body-small text-text-secondary">Read-only</span> : null}
          <span className={`template-body-small ${status === "error" ? "text-red-700" : "text-text-secondary"}`}>
            {status === "saving" ? "Saving…" : status === "error" ? "Save error" : "Saved"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-16">
        <div className="mx-auto w-full max-w-[860px]">
          <BlockNoteView
            editor={editor}
            editable={canEdit}
            theme="light"
            onChange={(changedEditor) => scheduleSave(changedEditor.document as unknown[])}
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
