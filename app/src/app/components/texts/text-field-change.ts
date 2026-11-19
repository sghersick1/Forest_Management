/*
 * The write contract for a reusable text field.
 * The field reads its saved text from props and reports one of these changes.
 */

export type TextFieldChange =
  | { action: "create"; text: string }
  | { action: "update"; text: string }
  | { action: "delete" };

// Picks create, update, or delete. An unchanged value writes nothing.
export function textFieldChange(saved: string, draft: string): TextFieldChange | null {
  const previous = saved.trim();
  const next = draft.trim();
  if (next === previous) return null;
  if (next === "") return { action: "delete" };
  if (previous === "") return { action: "create", text: next };
  return { action: "update", text: next };
}

// Escape blurs the field on keydown. The following keyup must not reach the map.
export function keepMapSelection() {
  const stopKeyUp = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    window.removeEventListener("keyup", stopKeyUp, true);
  };
  window.addEventListener("keyup", stopKeyUp, true);
}
