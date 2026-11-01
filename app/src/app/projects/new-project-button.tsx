"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  submitNewProject,
  type CreateProjectState,
} from "@/lib/projects/create-project";

const initialState: CreateProjectState = { error: null };

export function NewProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="template-body-large flex shrink-0 items-center justify-center gap-2 rounded-[16px] border border-surface-header px-4 text-surface-header"
      >
        <span aria-hidden="true" className="size-3 shrink-0 bg-surface-header" />
        New
      </button>
      {open ? <NewProjectDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [state, formAction, pending] = useActionState(
    submitNewProject,
    initialState,
  );
  const canCreate = title.trim().length > 0 && !pending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-project-heading"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current.close();
        }
      }}
      className="fixed inset-auto top-1/2 left-1/2 m-0 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 bg-surface-canvas p-8 backdrop:bg-black/20"
    >
      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="new-project-heading" className="template-title-large">
            New project
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="size-4 shrink-0 border border-surface-header bg-surface-header"
          />
        </div>
        <label className="template-body-small flex flex-col gap-2 text-text-secondary">
          Title
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            className="template-body-large border border-border-map bg-surface-canvas px-4 py-4 text-text-primary outline-none"
          />
        </label>
        {state.error ? (
          <p className="template-body-small text-text-primary">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={!canCreate}
          className="template-title-medium self-end bg-text-primary px-4 py-2 text-surface-canvas disabled:opacity-40"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </form>
    </dialog>
  );
}
