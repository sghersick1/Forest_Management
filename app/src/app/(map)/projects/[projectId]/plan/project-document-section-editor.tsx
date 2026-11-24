"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import type { ProjectDocumentSection } from "@/lib/projects/project-document-sections";
import { updateProjectDocumentSection } from "@/lib/projects/project-document-sections";
import { SentenceField } from "@/app/components/texts/sentence-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";

export function ProjectDocumentSectionEditor({
  projectId,
  section,
  canEdit,
  continuous = false,
  onUpdate,
}: {
  projectId: number;
  section: ProjectDocumentSection;
  canEdit: boolean;
  continuous?: boolean;
  onUpdate: (section: ProjectDocumentSection) => void;
}) {
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContent = useRef<unknown[]>(section.content);
  const editor = useCreateBlockNote({
    initialContent: section.content.length ? section.content as PartialBlock[] : undefined,
  });

  const saveContent = useCallback(async (content: unknown[]) => {
    setStatus("saving");
    try {
      await updateProjectDocumentSection(projectId, section.id, { content });
      setStatus("saved");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, [projectId, section.id]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (saveTimer.current && lastContent.current.length) void saveContent(lastContent.current);
  }, [saveContent]);

  const rename = async (change: TextFieldChange) => {
    if (change.action === "delete" || !change.text.trim() || change.text === section.title) return;
    const updated = { ...section, title: change.text.trim() };
    onUpdate(updated);
    setStatus("saving");
    try {
      await updateProjectDocumentSection(projectId, section.id, { title: updated.title });
      setStatus("saved");
    } catch (error) {
      console.error(error);
      onUpdate(section);
      setStatus("error");
    }
  };

  return (
    <section className={continuous ? "mb-10 border-b border-border-map pb-8" : "min-h-0 flex-1 overflow-y-auto px-6 py-10"}>
      <div className={continuous ? "" : "mx-auto w-full max-w-[860px]"}>
        <div className="flex items-center justify-between border-b border-border-map pb-3">
          <h1 className="template-title-large text-text-primary">
            {canEdit ? (
              <SentenceField value={section.title} ariaLabel="Section title" onText={(change) => void rename(change)} />
            ) : section.title}
          </h1>
          <span className="template-label-small text-text-secondary">
            {status === "saving" ? "Saving…" : status === "error" ? "Save error" : "Saved"}
          </span>
        </div>
        <div className="mt-4">
          <BlockNoteView
            editor={editor}
            editable={canEdit}
            theme="light"
            onChange={(changedEditor) => {
              if (!canEdit) return;
              const content = changedEditor.document as unknown[];
              lastContent.current = content;
              onUpdate({ ...section, content });
              setStatus("saving");
              if (saveTimer.current) clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(() => {
                void saveContent(content);
                saveTimer.current = null;
              }, 700);
            }}
          />
        </div>
      </div>
    </section>
  );
}
