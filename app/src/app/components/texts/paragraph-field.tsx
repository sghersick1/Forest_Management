"use client";

/*
 * A description that grows with its text.
 * A click opens the field. Enter closes it. Shift+Enter adds a line.
 * Text edits directly on the canvas without input chrome.
 */

import { useEffect, useRef, useState } from "react";
import { keepMapSelection, textFieldChange, type TextFieldChange } from "@/app/components/texts/text-field-change";

const fieldClassName =
  "template-body-medium box-border block w-full resize-none overflow-hidden border-0 bg-transparent shadow-none px-2 py-2 text-left leading-5 text-text-primary outline-none placeholder:text-text-secondary field-sizing-content";

// The saved description. The parent stores it through onText.
export function ParagraphField({
  value,
  onText,
  placeholder = "Add a description",
  ariaLabel = "Description",
  className,
}: {
  value: string;
  onText: (change: TextFieldChange) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const canceling = useRef(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (!editing) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }, [editing]);

  function commit() {
    if (!editing) return;
    if (canceling.current) {
      canceling.current = false;
      setDraft(value);
      setEditing(false);
      return;
    }
    const change = textFieldChange(value, draft);
    setEditing(false);
    if (change) onText(change);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!editing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      canceling.current = true;
      keepMapSelection();
      event.currentTarget.blur();
    }
  }

  return (
    <div>
      <textarea
        ref={fieldRef}
        aria-label={ariaLabel}
        readOnly={!editing}
        rows={1}
        value={editing ? draft : value}
        placeholder={placeholder}
        onClick={() => {
          if (editing) return;
          canceling.current = false;
          setDraft(value);
          setEditing(true);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={className ? `${className} cursor-text` : `${fieldClassName} cursor-text`}
      />

    </div>
  );
}
