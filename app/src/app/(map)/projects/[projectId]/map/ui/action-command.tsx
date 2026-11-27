"use client";

/*
 * The actions list in the right sidebar.
 * A row opens that action. The header switches to the open action.
 */

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ActionStatus } from "@/lib/actions/action-status";
import { useMap } from "../state/map-context";
import { ActionDetails } from "./action-details";
import { ActionStatusButton } from "./action-status";
import { editedLabel } from "../logic/action-edited";

const headerButtonClass =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

// Every action. A row opens that action's details.
export function ActionList({ featureId }: { featureId?: string } = {}) {
  const { actions, selectedAction, hoverAction, setHoverAction, setSelectedAction, createAction, setStatusAction, setContextMenu, actionFeatureLinks, features, selectedFeature, canEdit, linking, setLinking } = useMap();

  const [actionFilterIds, setActionFilterIds] = useState<string[]>([]);
  const [renameNewAction, setRenameNewAction] = useState<number | null>(null);
  const [actionQuery, setActionQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const automaticFilterId = featureId ?? selectedFeature;
  const manualFilterIds = actionFilterIds.filter((id) => features.some((feature) => String(feature.id) === id));
  const activeFilterIds = [...new Set([...manualFilterIds, ...(automaticFilterId === null ? [] : [automaticFilterId])])].filter((id) => features.some((feature) => String(feature.id) === id));
  const linkedActionIds = new Set(actionFeatureLinks.filter((link) => activeFilterIds.includes(link.featureId)).map((link) => link.actionId));
  const visibleActions = actions.filter((action) => (activeFilterIds.length === 0 || linkedActionIds.has(action.id)) && action.name.toLowerCase().includes(actionQuery.trim().toLowerCase()));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    return () => setHoverAction(null);
  }, [setHoverAction]);

  useEffect(() => {
    if (!filterOpen) return;
    function dismiss(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [filterOpen]);

  return (
    <>
      <div className={`flex shrink-0 items-center ${featureId === undefined ? "border-b border-surface-translucent-placeholder px-4 py-2" : "px-2 py-1"}`}>
        {featureId === undefined ? <p className="template-body-medium-emphasized whitespace-nowrap text-text-primary">
          Actions
        </p> : <div className="flex min-w-0 flex-1 items-center gap-1 rounded-[4px] bg-surface-canvas px-1 focus-within:outline-1 focus-within:outline-border-selected">
          <img src="/icons/map/search-outline.svg" alt="" width={20} height={20} />
          <input aria-label="Search stand actions" placeholder="Search actions…" value={actionQuery} onChange={(event) => setActionQuery(event.target.value)} className="template-body-small min-w-0 flex-1 border-0 bg-transparent py-1 text-text-primary outline-none placeholder:text-text-secondary" />
        </div>}
        {selectedAction !== null ? (
          <div className="ml-auto flex items-center gap-1">
            {canEdit ? (
              <button
                type="button"
                aria-label="Add keyframes"
                aria-pressed={linking}
                onClick={() => setLinking(!linking)}
                className={`${headerButtonClass} aria-pressed:bg-surface-action-linked aria-pressed:hover:bg-surface-action-linked`}
              >
                <span aria-hidden="true" className="size-[18px] bg-current text-text-primary [mask-image:url(/icons/map/add-keyframes.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
              </button>
            ) : null}
            <button type="button" aria-label="Close action" onClick={() => setSelectedAction(null)} className={headerButtonClass}>
              <img src="/icons/map/close-outline.svg" alt="" width={18} height={18} />
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1">
        <div ref={filterRef} className="relative" onKeyDown={(event) => { if (event.key === "Escape") { setFilterOpen(false); filterRef.current?.querySelector("button")?.focus(); } }}>
          <button type="button" aria-label={activeFilterIds.length ? `Filter actions (${activeFilterIds.length} active)` : "Filter actions"} aria-expanded={filterOpen} aria-haspopup="dialog" onClick={() => setFilterOpen(!filterOpen)} className={`relative ${headerButtonClass}`}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {activeFilterIds.length > 0 ? <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-red-500" /> : null}
          </button>
          {filterOpen ? <div role="dialog" aria-label="Filter actions by feature" className="absolute right-0 top-full z-30 mt-1 w-56 max-w-[80vw] rounded-[8px] border border-border-map bg-surface-canvas p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1"><p className="template-label-xs text-text-secondary">Features</p><button type="button" onClick={() => setActionFilterIds([])} className="template-body-small cursor-pointer text-text-secondary hover:text-text-primary">Clear</button></div>
            <div className="max-h-64 overflow-y-auto">{features.map((feature) => {
              const id = String(feature.id);
              const name = typeof feature.properties.name === "string" ? feature.properties.name : id;
              return <label key={id} className="template-body-small flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 hover:bg-surface-translucent-placeholder-2"><input type="checkbox" checked={manualFilterIds.includes(id)} onChange={(event) => setActionFilterIds(event.target.checked ? [...manualFilterIds, id] : manualFilterIds.filter((value) => value !== id))} className="size-3.5 shrink-0 appearance-none rounded-[2px] border border-text-secondary bg-surface-canvas checked:border-border-selected checked:bg-border-selected checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20d=%22m3.5%208%203%203%206-6%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected" /><span className="min-w-0 flex-1 truncate">{name}</span>{automaticFilterId === id ? <span className="template-label-xs shrink-0 rounded-[4px] bg-surface-selected px-1.5 py-0.5 text-border-selected">Selected</span> : null}</label>;
            })}</div>
          </div> : null}
        </div>
        {canEdit ? <button
          type="button"
          aria-label="Add action"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            setCreateError(null);
            try {
              const id = await createAction(featureId);
              setRenameNewAction(id);
            }
            catch { setCreateError("Could not create action. Please try again."); }
            finally { setCreating(false); }
          }}
          className={headerButtonClass}
        >
          <img src="/icons/map/add-outline.svg" alt="" width={18} height={18} className="shrink-0" />
        </button> : null}
          </div>
        )}
      </div>
      {createError ? <p role="alert" className="template-body-small px-4 py-2 text-text-primary">{createError}</p> : null}
      {selectedAction !== null ? <div className="min-h-0 flex-1"><ActionDetails renameNewAction={renameNewAction} setRenameNewAction={setRenameNewAction} /></div> : <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-transparent px-2 py-2">
        {visibleActions.map((action) => {
          const hovered = hoverAction === action.id;
          return (
            <ActionRow
              key={action.id}
              id={action.id}
              name={action.name}
              description={action.description}
              status={action.status}
              editedAt={action.editedAt}
              hovered={hovered}
              onHover={setHoverAction}
              onOpen={() => setSelectedAction(action.id)}
              onStatus={(status) => setStatusAction(action.id, status)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!canEdit) return;
                setContextMenu({ kind: "action", id: action.id, x: event.clientX, y: event.clientY });
              }}
            />
          );
        })}
      </div>}
    </>
  );
}

function ActionRow({
  id,
  name,
  description,
  status,
  editedAt,
  hovered,
  onHover,
  onOpen,
  onStatus,
  onContextMenu,
}: {
  id: number;
  name: string;
  description: string;
  status: ActionStatus;
  editedAt: string;
  hovered: boolean;
  onHover: (id: number | null) => void;
  onOpen: () => void;
  onStatus: (status: ActionStatus) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  function syncHoverFromPointer() {
    onHover(null);
    // After the status menu unmounts, keep hover only if the pointer is still on this row.
    requestAnimationFrame(() => {
      if (rowRef.current?.matches(":hover")) onHover(id);
    });
  }

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onContextMenu={onContextMenu}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
      className={`group relative flex w-full cursor-pointer items-start gap-0 rounded-[6px] px-2 py-1.5 text-left transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary hover:bg-surface-translucent-placeholder-2 ${hovered ? "bg-surface-translucent-placeholder-2" : ""}`}
    >
      {/* Soft edge under the trailing meta — bleeds left over title/description like Cursor. */}
      <div aria-hidden="true" className="action-row-fade" data-hovered={hovered ? "" : undefined} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="template-body-medium-emphasized overflow-hidden whitespace-nowrap text-text-primary">{name}</p>
        {description.trim() ? <p className="template-body-small overflow-hidden whitespace-nowrap text-text-secondary">{description}</p> : null}
      </div>
      {/* w-7 matches size-7 header buttons. -ml-1 overlaps the text by 4px under the status button. */}
      <div className="relative z-[2] -ml-1 flex w-7 shrink-0 flex-col items-center gap-0.5">
        <ActionStatusButton
          status={status}
          onStatus={(next) => {
            onStatus(next);
            syncHoverFromPointer();
          }}
        />
        <p suppressHydrationWarning className="template-body-small text-text-secondary">
          <span className="sr-only">edited </span>
          {editedLabel(new Date(editedAt), new Date())}
        </p>
      </div>
    </div>
  );
}
