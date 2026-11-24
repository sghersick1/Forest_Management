"use client";

import { useEffect } from "react";
import type { ProjectAction } from "@/lib/actions/actions";
import type { MapFeature } from "@/lib/maps/map-features";
import type { ProjectDocumentSection } from "@/lib/projects/project-document-sections";
import type { ProjectOverviewFieldKey } from "@/lib/projects/update-project-overview";
import { StandDocumentContent } from "./stand-document-content";
import { EditableProjectOverview, type OverviewField } from "./editable-project-overview";
import { ProjectDocumentSectionEditor } from "./project-document-section-editor";
import { ProjectActionEditor } from "./project-action-editor";

export function FullProjectDocument({
  projectId,
  projectTitle,
  overviewFields,
  features,
  documents,
  actions,
  sections,
  canEdit,
  onClose,
  onContentChange,
  onDescriptionChange,
  onSaveOverviewField,
  onRenameAction,
  onDescribeAction,
  onUpdateSection,
}: {
  projectId: number;
  projectTitle: string;
  overviewFields: OverviewField[];
  features: MapFeature[];
  documents: Record<string, unknown[]>;
  actions: ProjectAction[];
  sections: ProjectDocumentSection[];
  canEdit: boolean;
  onClose: () => void;
  onContentChange: (id: string, content: unknown[]) => void;
  onDescriptionChange: (id: string, description: string) => void | Promise<void>;
  onSaveOverviewField: (key: ProjectOverviewFieldKey, value: string) => Promise<void>;
  onRenameAction: (id: number, name: string) => Promise<void>;
  onDescribeAction: (id: number, description: string) => Promise<void>;
  onUpdateSection: (section: ProjectDocumentSection) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-surface-canvas">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-map px-4">
        <div className="min-w-0">
          <h1 className="template-body-medium-emphasized truncate text-text-primary">{projectTitle}</h1>
          <p className="template-label-small text-text-secondary">Whole project document</p>
        </div>
        <button
          type="button"
          aria-label="Close whole document"
          onClick={onClose}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-secondary hover:bg-surface-translucent-placeholder-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        >
          <CloseIcon />
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-8">
        <article className="mx-auto w-full max-w-[860px]">
          <section aria-labelledby="whole-property-overview" className="mb-12 border-b border-border-map pb-8">
            <h2 id="whole-property-overview" className="template-title-large mb-5 text-text-primary">Property Overview</h2>
            <EditableProjectOverview fields={overviewFields} canEdit={canEdit} onSave={onSaveOverviewField} />
          </section>

          {features.map((feature, index) => (
            <section key={feature.id} aria-labelledby={`whole-stand-${feature.id}`} className="mb-12 border-b border-border-map pb-8">
              <h2 id={`whole-stand-${feature.id}`} className="template-title-large mb-4 text-text-primary">
                {feature.name || `Stand ${index + 1}`}
              </h2>
              <StandDocumentContent
                projectId={projectId}
                featureId={feature.id}
                description={feature.description}
                initialContent={documents[feature.id]}
                canEdit={canEdit}
                onContentChange={(content) => onContentChange(feature.id, content)}
                onDescriptionChange={(description) => onDescriptionChange(feature.id, description)}
                continuous
                showViewWholeDocument={false}
              />
            </section>
          ))}

          <section aria-labelledby="whole-actions">
            <h2 id="whole-actions" className="template-title-large mb-5 text-text-primary">Actions</h2>
            {actions.length ? (
              <div className="flex flex-col gap-6">
                {actions.map((action) => (
                  <ProjectActionEditor key={action.id} action={action} canEdit={canEdit} onRename={onRenameAction} onDescribe={onDescribeAction} />
                ))}
              </div>
            ) : (
              <p className="template-body-medium text-text-secondary">No actions have been added.</p>
            )}
          </section>
          {sections.map((section) => (
            <ProjectDocumentSectionEditor
              key={section.id}
              projectId={projectId}
              section={section}
              canEdit={canEdit}
              continuous
              onUpdate={onUpdateSection}
            />
          ))}
        </article>
      </main>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
      <path d="m3 3 10 10M13 3 3 13" />
    </svg>
  );
}
