/*
 * Allowed action statuses and display labels.
 * Values match the actions.status column. New actions start as planned.
 */

export const ACTION_STATUSES = [
  { id: "planned", label: "Planned", shortcut: "1" },
  { id: "in-progress", label: "In Progress", shortcut: "2" },
  { id: "done", label: "Done", shortcut: "3" },
  { id: "cancelled", label: "Cancelled", shortcut: "4" },
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number]["id"];

export function isActionStatus(value: string): value is ActionStatus {
  return ACTION_STATUSES.some((status) => status.id === value);
}

// Unknown values fall back to planned so the list always has a known mark.
export function parseActionStatus(value: string): ActionStatus {
  return isActionStatus(value) ? value : "planned";
}

export function actionStatusLabel(status: ActionStatus) {
  return ACTION_STATUSES.find((item) => item.id === status)?.label ?? status;
}
