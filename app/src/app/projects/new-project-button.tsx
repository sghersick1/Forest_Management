"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { suggestAddresses } from "@/lib/map/suggest-address";
import {
  submitNewProject,
  type CreateProjectState,
} from "@/lib/projects/create-project";

const initialState: CreateProjectState = { error: null };

const labelClass =
  "template-body-small flex flex-col gap-2 text-text-secondary";

const inputClass =
  "template-body-large w-full border border-border-map bg-surface-canvas py-4 pl-4 text-text-primary outline-none placeholder:text-text-secondary focus:border-text-primary";

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
  const requestRef = useRef(0);
  const chosenRef = useRef<string | null>(null);
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
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

  useEffect(() => {
    if (chosenRef.current === address) {
      return;
    }

    const query = address.trim();
    const request = ++requestRef.current;
    if (query.length < 3) {
      setSuggestions([]);
      setListOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void suggestAddresses(query).then(
        (next) => {
          if (request !== requestRef.current) {
            return;
          }
          setSuggestions(next);
          setHighlighted(0);
          setListOpen(next.length > 0);
        },
        () => {
          if (request !== requestRef.current) {
            return;
          }
          setSuggestions([]);
          setListOpen(false);
        },
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [address]);

  function choose(text: string) {
    chosenRef.current = text;
    requestRef.current += 1;
    setAddress(text);
    setSuggestions([]);
    setListOpen(false);
    setHighlighted(0);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-project-heading"
      onClose={onClose}
      onCancel={(event) => {
        if (!listOpen) {
          return;
        }
        event.preventDefault();
        setListOpen(false);
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current.close();
        }
      }}
      className="fixed inset-auto top-1/2 left-1/2 m-0 max-h-[calc(100dvh-4rem)] w-[min(100%-2rem,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-visible bg-surface-canvas p-8 backdrop:bg-black/20"
    >
      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="new-project-heading" className="template-title-large">
              New project
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="size-4 shrink-0 border border-surface-header bg-surface-header"
          />
        </div>
        <div className={`flex flex-col gap-2 ${listOpen ? "relative z-10" : ""}`}>
          <label className={labelClass} htmlFor="new-project-address">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 bg-surface-header" />
              Address
            </span>
          </label>
          <span className="relative block">
              <input
                ref={addressRef}
                id="new-project-address"
                name="address"
                value={address}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listOpen}
                aria-controls="address-suggestions"
                aria-activedescendant={
                  listOpen ? `address-suggestion-${highlighted}` : undefined
                }
                placeholder="Enter address"
                className={`${inputClass} ${address ? "pr-12" : "pr-4"}`}
                onChange={(event) => {
                  chosenRef.current = null;
                  setAddress(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (!listOpen) {
                    return;
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlighted((index) => (index + 1) % suggestions.length);
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlighted((index) =>
                      index <= 0 ? suggestions.length - 1 : index - 1,
                    );
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    choose(suggestions[highlighted] ?? suggestions[0]);
                  }
                }}
              />
              {address ? (
                <button
                  type="button"
                  aria-label="Clear"
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-[6px] px-2 py-1 text-text-primary transition-colors hover:bg-surface-translucent-placeholder-2"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    chosenRef.current = null;
                    requestRef.current += 1;
                    setAddress("");
                    setSuggestions([]);
                    setListOpen(false);
                    requestAnimationFrame(() => addressRef.current?.focus());
                  }}
                >
                  X
                </button>
              ) : null}
            </span>
          {listOpen ? (
            <ul
              id="address-suggestions"
              role="listbox"
              className="absolute top-full right-0 left-0 z-10 mt-2 border border-border-map bg-surface-canvas shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
            >
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion}-${index}`} role="presentation">
                  <button
                    id={`address-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === highlighted}
                    className={`template-body-large w-full px-4 py-3 text-left text-text-primary ${
                      index === highlighted
                        ? "bg-surface-translucent-placeholder"
                        : "bg-surface-canvas"
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(suggestion);
                    }}
                    onMouseEnter={() => setHighlighted(index)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
