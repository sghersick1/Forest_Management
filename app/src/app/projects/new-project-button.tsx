"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  submitNewProject,
  type CreateProjectState,
} from "@/lib/projects/create-project";

const initialState: CreateProjectState = { error: null };

const labelClass =
  "template-body-small flex flex-col gap-2 text-text-secondary";

const inputClass =
  "template-body-large w-full border border-border-map bg-surface-canvas px-4 py-4 text-text-primary outline-none placeholder:text-text-secondary focus:border-text-primary";

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
  const addressRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    submitNewProject,
    initialState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
    addressRef.current?.focus();
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
      className="fixed inset-auto top-1/2 left-1/2 m-0 max-h-[calc(100dvh-4rem)] w-[min(100%-2rem,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-surface-canvas p-8 backdrop:bg-black/20"
    >
      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="new-project-heading" className="template-title-large">
              New project
            </h2>
            <p className="template-body-small text-text-secondary">
              All fields optional
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="size-4 shrink-0 border border-surface-header bg-surface-header"
          />
        </div>
        <label className={labelClass}>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 bg-surface-header" />
            Address
          </span>
          <input
            ref={addressRef}
            name="address"
            placeholder="1840 County Road 12, Ely, MN"
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 border-t border-border-map pt-6 sm:grid-cols-2">
          <label className={labelClass}>
            Name
            <input name="name" placeholder="Mara Lind" className={inputClass} />
          </label>
          <label className={labelClass}>
            Phone
            <input
              name="phone"
              type="tel"
              placeholder="(218) 555-0148"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              name="email"
              type="email"
              placeholder="mara@northlineforestry.com"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Company
            <input
              name="company"
              placeholder="Northline Forestry"
              className={inputClass}
            />
          </label>
        </div>
        {state.error ? (
          <p className="template-body-small text-text-primary">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="template-title-medium self-end bg-text-primary px-4 py-2 text-surface-canvas disabled:opacity-40"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </form>
    </dialog>
  );
}
