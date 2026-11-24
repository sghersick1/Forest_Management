"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { createClient } from "@/lib/supabase/client";
import { descriptionBlockId, withDescriptionBlock, readDescription } from "./stand-document-blocks";

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

export function StandDocumentContent({
  projectId,
  featureId,
  description,
  initialContent,
  canEdit,
  onContentChange,
  onDescriptionChange,
  onViewWholeDocument,
  compact = false,
  continuous = false,
  showViewWholeDocument = true,
}: {
  projectId: number;
  featureId: string;
  description: string;
  initialContent: unknown[] | undefined;
  canEdit: boolean;
  onContentChange?: (content: unknown[]) => void;
  onDescriptionChange: (description: string) => void | Promise<void>;
  onViewWholeDocument?: () => void;
  compact?: boolean;
  continuous?: boolean;
  showViewWholeDocument?: boolean;
}) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDescription = useRef<string | null>(null);
  const descriptionChange = useRef(onDescriptionChange);
  const latestDocument = useRef<unknown[] | null>(null);
  useEffect(() => {
    descriptionChange.current = onDescriptionChange;
  }, [onDescriptionChange]);
  const [initial] = useState(() => withDescriptionBlock(initialContent ?? [...template], description));
  const editor = useCreateBlockNote({
    initialContent: initial.length > 0 ? initial as PartialBlock[] : undefined,
  });

  useEffect(() => {
    const descriptionBlock = editor.document.find((block) => block.id === descriptionBlockId);
    if (descriptionBlock && readDescription(editor.document) === description) return;
    if (descriptionBlock) {
      editor.updateBlock(descriptionBlock, { content: description });
    } else {
      editor.insertBlocks(
        [{ id: descriptionBlockId, type: "paragraph", content: description }],
        editor.document[0],
        "before",
      );
    }
  }, [description, editor]);

  const saveDocument = useCallback(async (content: unknown[]) => {
    pending.current = true;
    setStatus("saving");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("stand_documents").upsert(
        { project_id: projectId, map_feature_id: featureId, content, edited_at: new Date().toISOString() },
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
  }, [featureId, projectId]);

  const scheduleSave = (content: unknown[]) => {
    if (!canEdit) return;
    latestDocument.current = content;
    onContentChange?.(content);
    latestDescription.current = readDescription(content);
    if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    descriptionTimer.current = setTimeout(() => {
      const nextDescription = latestDescription.current;
      if (nextDescription === null) return;
      latestDescription.current = null;
      void Promise.resolve(descriptionChange.current(nextDescription)).catch((error: unknown) => {
        console.error(error);
        setStatus("error");
      });
    }, 400);
    pending.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveDocument(content), 700);
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    if (latestDescription.current !== null) {
      void Promise.resolve(descriptionChange.current(latestDescription.current)).catch(console.error);
    }
    if (pending.current && latestDocument.current) {
      void saveDocument(latestDocument.current);
    }
  }, [saveDocument]);

  return (
    <section aria-label="Stand document" className={continuous ? "flex flex-col" : "flex min-h-0 flex-col"}>
      {!continuous ? (
        <header className={`flex shrink-0 items-center justify-between border-b border-border-map ${compact ? "px-2 py-1" : "px-3 py-2"}`}>
          <div className="flex items-center gap-2">
            <h2 className="template-body-small-emphasized text-text-primary">Stand Document</h2>
            <span className={`template-label-small ${status === "error" ? "text-red-700" : "text-text-secondary"}`}>
              {status === "saving" ? "Saving…" : status === "error" ? "Save error" : "Saved"}
            </span>
          </div>
          {showViewWholeDocument && onViewWholeDocument ? (
            <button
              type="button"
              aria-label="View whole document"
              title="View whole document"
              onClick={onViewWholeDocument}
              className="flex size-7 cursor-pointer items-center justify-center rounded-[4px] text-text-secondary hover:bg-surface-translucent-placeholder-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            >
              <ExpandIcon />
            </button>
          ) : null}
        </header>
      ) : null}
      <div className={continuous ? "" : `min-h-0 flex-1 overflow-y-auto ${compact ? "px-2 py-1" : "px-4 py-3"}`}>
        <BlockNoteView
          editor={editor}
          editable={canEdit}
          theme="light"
          onChange={(changedEditor) => scheduleSave(changedEditor.document as unknown[])}
        />
      </div>
    </section>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.75H2.75V6M10 2.75h3.25V6M2.75 10v3.25H6M13.25 10v3.25H10" />
      <path d="m2.75 2.75 4 4m6.5-4-4 4m-6.5 6.5 4-4m6.5 4-4-4" />
    </svg>
  );
}
