"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectAction } from "@/lib/actions/actions";
import type { MapFeature } from "@/lib/maps/map-features";
import { describeMapFeature, renameMapFeature } from "@/lib/maps/map-actions";
import { describeProjectAction as saveActionDescription, renameProjectAction as saveActionName } from "@/lib/actions/update-action";
import {
  createProjectDocumentSection,
  type ProjectDocumentSection,
} from "@/lib/projects/project-document-sections";
import { updateProjectOverviewField, type ProjectOverviewFieldKey } from "@/lib/projects/update-project-overview";
import { FullProjectDocument } from "./full-project-document";
import { EditableProjectOverview, type OverviewField } from "./editable-project-overview";
import { ProjectDocumentSectionEditor } from "./project-document-section-editor";
import { ProjectActionEditor } from "./project-action-editor";

const StandEditor = dynamic(() => import("./stand-editor").then((module) => module.StandEditor), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1" aria-label="Loading stand plan" />,
});

export function PlanWorkspace({
  projectId,
  projectTitle,
  overviewFields,
  features,
  documents,
  actions,
  sections: initialSections,
  selectedId,
  canEdit,
}: {
  projectId: number;
  projectTitle: string;
  overviewFields: OverviewField[];
  features: MapFeature[];
  documents: Record<string, unknown[]>;
  actions: ProjectAction[];
  sections: ProjectDocumentSection[];
  selectedId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(selectedId);
  const [activeSection, setActiveSection] = useState<"property" | "stand" | "actions" | "section">(selectedId ? "stand" : "property");
  const [standFeatures, setStandFeatures] = useState(features);
  const [standDocuments, setStandDocuments] = useState(documents);
  const [sections, setSections] = useState(initialSections);
  const [projectActions, setProjectActions] = useState(actions);
  const [propertyFields, setPropertyFields] = useState(overviewFields);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [wholeDocumentOpen, setWholeDocumentOpen] = useState(false);
  const [sectionError, setSectionError] = useState(false);
  const currentProjectTitle = propertyFields.find((field) => field.key === "title")?.value || "Untitled";
  const active = standFeatures.find((feature) => feature.id === activeId) ?? null;

  const renameStand = async (id: string, name: string) => {
    const feature = standFeatures.find((item) => item.id === id);
    if (!feature || standFeatures.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("Stand names must be unique.");
    }
    setStandFeatures((current) => current.map((item) => item.id === id ? { ...item, name } : item));
    try {
      await renameMapFeature(projectId, id, name);
    } catch (error) {
      setStandFeatures((current) => current.map((item) => item.id === id && item.name === name ? { ...item, name: feature.name } : item));
      throw error;
    }
  };

  const describeStand = async (id: string, description: string) => {
    const feature = standFeatures.find((item) => item.id === id);
    if (!feature) throw new Error("Stand could not be found.");
    setStandFeatures((current) => current.map((item) => item.id === id ? { ...item, description } : item));
    try {
      await describeMapFeature(projectId, id, description);
    } catch (error) {
      setStandFeatures((current) => current.map((item) => item.id === id && item.description === description ? { ...item, description: feature.description } : item));
      throw error;
    }
  };

  const selectStand = (id: string) => {
    setActiveId(id);
    setActiveSection("stand");
    router.replace(`/projects/${projectId}/plan?stand=${encodeURIComponent(id)}`, { scroll: false });
  };

  const updateDocument = (id: string, content: unknown[]) => {
    setStandDocuments((current) => ({ ...current, [id]: content }));
  };

  const updateDescriptionFromDocument = (id: string, description: string) => {
    const currentDescription = standFeatures.find((feature) => feature.id === id)?.description;
    if (currentDescription !== description) return describeStand(id, description);
  };

  const saveOverviewField = async (key: ProjectOverviewFieldKey, value: string) => {
    const previous = propertyFields.find((field) => field.key === key)?.value ?? null;
    setPropertyFields((current) => current.map((field) => field.key === key ? { ...field, value } : field));
    try {
      await updateProjectOverviewField(projectId, key, value);
    } catch (error) {
      setPropertyFields((current) => current.map((field) => field.key === key && field.value === value ? { ...field, value: previous } : field));
      throw error;
    }
  };

  const renameAction = async (id: number, name: string) => {
    const previous = projectActions.find((action) => action.id === id);
    if (!previous) throw new Error("Action could not be found.");
    setProjectActions((current) => current.map((action) => action.id === id ? { ...action, name } : action));
    try {
      await saveActionName(projectId, id, name);
    } catch (error) {
      setProjectActions((current) => current.map((action) => action.id === id && action.name === name ? { ...action, name: previous.name } : action));
      throw error;
    }
  };

  const describeAction = async (id: number, description: string) => {
    const previous = projectActions.find((action) => action.id === id);
    if (!previous) throw new Error("Action could not be found.");
    setProjectActions((current) => current.map((action) => action.id === id ? { ...action, description } : action));
    try {
      await saveActionDescription(projectId, id, description);
    } catch (error) {
      setProjectActions((current) => current.map((action) => action.id === id && action.description === description ? { ...action, description: previous.description } : action));
      throw error;
    }
  };

  const addSection = async () => {
    setSectionError(false);
    try {
      const section = await createProjectDocumentSection(projectId);
      setSections((current) => [...current, section]);
      setSectionId(section.id);
      setActiveSection("section");
    } catch (error) {
      console.error(error);
      setSectionError(true);
    }
  };

  const updateSection = (section: ProjectDocumentSection) => {
    setSections((current) => current.map((item) => item.id === section.id ? section : item));
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-surface-canvas">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-border-map bg-surface-actions px-2 py-3">
        <Link href={`/projects/${projectId}`} className="template-body-small mb-3 truncate rounded px-2 py-1 text-text-secondary hover:bg-surface-translucent-placeholder-2">
          {currentProjectTitle}
        </Link>
        <nav aria-label="Plan navigation" className="flex flex-col gap-0.5">
          <button type="button" onClick={() => setActiveSection("property")} className={`template-body-small rounded px-2 py-1.5 text-left ${activeSection === "property" ? "bg-surface-selected text-text-primary" : "text-text-primary hover:bg-surface-translucent-placeholder-2"}`}>
            Property Overview
          </button>
          <div className="template-label-small mt-3 mb-1 px-2 text-text-secondary">Stands</div>
          {standFeatures.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => selectStand(feature.id)}
              className={`template-body-small flex items-center gap-2 rounded px-2 py-1.5 text-left ${feature.id === activeId ? "bg-surface-selected text-text-primary" : "text-text-primary hover:bg-surface-translucent-placeholder-2"}`}
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 bg-surface-header [mask-image:url(/icons/map/pentagon.svg)] [mask-size:contain] [mask-repeat:no-repeat]" />
              <span className="truncate">{feature.name}</span>
            </button>
          ))}
          {standFeatures.length === 0 ? <p className="template-body-small px-2 py-1 text-text-secondary">No stands yet</p> : null}
          <div className="template-label-small mt-3 mb-1 px-2 text-text-secondary">Project</div>
          <button type="button" onClick={() => setActiveSection("actions")} className={`template-body-small rounded px-2 py-1.5 text-left ${activeSection === "actions" ? "bg-surface-selected text-text-primary" : "text-text-primary hover:bg-surface-translucent-placeholder-2"}`}>Actions</button>
          {sections.map((section) => (
            <button key={section.id} type="button" onClick={() => { setSectionId(section.id); setActiveSection("section"); }} className={`template-body-small rounded px-2 py-1.5 text-left ${activeSection === "section" && sectionId === section.id ? "bg-surface-selected text-text-primary" : "text-text-primary hover:bg-surface-translucent-placeholder-2"}`}>
              {section.title}
            </button>
          ))}
          <button type="button" onClick={() => void addSection()} disabled={!canEdit} className="template-body-small mt-1 rounded px-2 py-1.5 text-left text-text-secondary hover:bg-surface-translucent-placeholder-2 disabled:cursor-not-allowed disabled:opacity-50">
            + Add section
          </button>
          {sectionError ? <p role="alert" className="template-label-small px-2 text-red-700">Could not add section.</p> : null}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-8 shrink-0 items-center justify-between border-b border-border-map px-3">
          <span className="template-body-small truncate text-text-secondary">{projectTitle} / Plan</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="View whole document" title="View whole document" onClick={() => setWholeDocumentOpen(true)} className="flex size-7 cursor-pointer items-center justify-center rounded-[4px] text-text-secondary hover:bg-surface-translucent-placeholder-2 hover:text-text-primary">
              <ExpandIcon />
            </button>
            <div className="flex items-center rounded-[5px] border border-border-map p-0.5">
              <Link href={`/projects/${projectId}/map${active ? `?stand=${encodeURIComponent(active.id)}&details=1` : ""}`} className="template-body-small rounded-[3px] px-2 py-0.5 text-text-secondary hover:text-text-primary">Map</Link>
              <span className="template-body-small rounded-[3px] bg-surface-neutral px-2 py-0.5 text-text-primary">Plan</span>
            </div>
          </div>
        </header>

        {wholeDocumentOpen ? (
          <FullProjectDocument
            projectId={projectId}
            projectTitle={currentProjectTitle}
            overviewFields={propertyFields}
            features={standFeatures}
            documents={standDocuments}
            actions={projectActions}
            sections={sections}
            canEdit={canEdit}
            onClose={() => setWholeDocumentOpen(false)}
            onContentChange={updateDocument}
            onDescriptionChange={updateDescriptionFromDocument}
            onSaveOverviewField={saveOverviewField}
            onRenameAction={renameAction}
            onDescribeAction={describeAction}
            onUpdateSection={updateSection}
          />
        ) : activeSection === "property" ? (
          <section aria-label="Property Overview" className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
            <div className="mx-auto w-full max-w-[860px]">
              <SectionHeading title="Property Overview" onExpand={() => setWholeDocumentOpen(true)} />
              <div className="mt-6">
                <EditableProjectOverview fields={propertyFields} canEdit={canEdit} onSave={saveOverviewField} />
              </div>
            </div>
          </section>
        ) : activeSection === "actions" ? (
          <section aria-label="Actions" className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
            <div className="mx-auto w-full max-w-[860px]">
              <SectionHeading title="Actions" onExpand={() => setWholeDocumentOpen(true)} />
              {projectActions.length ? (
                <div className="mt-6 flex flex-col gap-6">
                  {projectActions.map((action) => <ProjectActionEditor key={action.id} action={action} canEdit={canEdit} onRename={renameAction} onDescribe={describeAction} />)}
                </div>
              ) : <p className="template-body-medium mt-6 text-text-secondary">No actions have been added.</p>}
            </div>
          </section>
        ) : activeSection === "section" ? (
          (() => {
            const section = sections.find((item) => item.id === sectionId);
            return section ? (
              <ProjectDocumentSectionEditor
                key={section.id}
                projectId={projectId}
                section={section}
                canEdit={canEdit}
                onUpdate={updateSection}
              />
            ) : <p className="p-8 text-text-secondary">Select or add a document section.</p>;
          })()
        ) : active ? (
          <StandEditor
            key={active.id}
            projectId={projectId}
            feature={active}
            initialContent={standDocuments[active.id]}
            canEdit={canEdit}
            onRename={renameStand}
            onContentChange={updateDocument}
            onDescriptionChange={updateDescriptionFromDocument}
            onViewWholeDocument={() => setWholeDocumentOpen(true)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-secondary">
            <p className="template-body-medium">Create a stand on the map to begin its plan.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeading({ title, onExpand }: { title: string; onExpand: () => void }) {
  const id = title.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="flex items-center justify-between border-b border-border-map pb-3">
      <h1 id={id} className="template-title-large text-text-primary">{title}</h1>
      <button type="button" aria-label="View whole document" title="View whole document" onClick={onExpand} className="flex size-7 cursor-pointer items-center justify-center rounded-[4px] text-text-secondary hover:bg-surface-translucent-placeholder-2 hover:text-text-primary">
        <ExpandIcon />
      </button>
    </div>
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
