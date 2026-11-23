"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapFeature } from "@/lib/maps/map-features";

const StandEditor = dynamic(() => import("./stand-editor").then((module) => module.StandEditor), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1" aria-label="Loading stand plan" />,
});

export function PlanWorkspace({
  projectId,
  projectTitle,
  features,
  documents,
  selectedId,
  canEdit,
}: {
  projectId: number;
  projectTitle: string;
  features: MapFeature[];
  documents: Record<string, unknown[]>;
  selectedId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(selectedId);
  const active = features.find((feature) => feature.id === activeId) ?? null;

  const selectStand = (id: string) => {
    setActiveId(id);
    router.replace(`/projects/${projectId}/plan?stand=${encodeURIComponent(id)}`, { scroll: false });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-surface-canvas">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-border-map bg-surface-actions px-2 py-3">
        <Link href={`/projects/${projectId}`} className="template-body-small mb-3 truncate rounded px-2 py-1 text-text-secondary hover:bg-surface-translucent-placeholder-2">
          {projectTitle}
        </Link>
        <nav aria-label="Plan navigation" className="flex flex-col gap-0.5">
          <button type="button" className="template-body-small rounded px-2 py-1.5 text-left text-text-primary hover:bg-surface-translucent-placeholder-2">
            Property Overview
          </button>
          <div className="template-label-small mt-3 mb-1 px-2 text-text-secondary">Stands</div>
          {features.map((feature) => (
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
          {features.length === 0 ? <p className="template-body-small px-2 py-1 text-text-secondary">No stands yet</p> : null}
          <div className="template-label-small mt-3 mb-1 px-2 text-text-secondary">Project</div>
          <button type="button" className="template-body-small rounded px-2 py-1.5 text-left text-text-primary hover:bg-surface-translucent-placeholder-2">Management Actions</button>
          <button type="button" className="template-body-small rounded px-2 py-1.5 text-left text-text-primary hover:bg-surface-translucent-placeholder-2">Resources</button>
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-8 shrink-0 items-center justify-between border-b border-border-map px-3">
          <span className="template-body-small truncate text-text-secondary">{projectTitle} / Plan</span>
          <div className="flex items-center gap-2">
            {active ? (
              <Link
                href={`/projects/${projectId}/map?stand=${encodeURIComponent(active.id)}&details=1`}
                className="template-body-small rounded px-2 py-1 text-text-primary hover:bg-surface-translucent-placeholder-2"
              >
                View on Map
              </Link>
            ) : null}
            <div className="flex items-center rounded-[5px] border border-border-map p-0.5">
              <Link href={`/projects/${projectId}/map${active ? `?stand=${encodeURIComponent(active.id)}&details=1` : ""}`} className="template-body-small rounded-[3px] px-2 py-0.5 text-text-secondary hover:text-text-primary">Map</Link>
              <span className="template-body-small rounded-[3px] bg-surface-neutral px-2 py-0.5 text-text-primary">Plan</span>
            </div>
          </div>
        </header>

        {active ? (
          <StandEditor
            key={active.id}
            projectId={projectId}
            feature={active}
            initialContent={documents[active.id]}
            canEdit={canEdit}
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
