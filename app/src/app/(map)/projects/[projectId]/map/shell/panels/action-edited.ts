/*
 * The time or date under an action name. The pencil is separate.
 * Today uses 24-hour time. Any other day uses an abbreviated month.
 */

// "17:17" today, "Nov 12" this year, "Nov 12, 2025" otherwise.
export function editedLabel(editedAt: Date, now: Date) {
  if (
    editedAt.getFullYear() === now.getFullYear() &&
    editedAt.getMonth() === now.getMonth() &&
    editedAt.getDate() === now.getDate()
  ) {
    const hours = String(editedAt.getHours()).padStart(2, "0");
    const minutes = String(editedAt.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const month = editedAt.toLocaleDateString("en-US", { month: "short" });
  const day = editedAt.getDate();
  if (editedAt.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${editedAt.getFullYear()}`;
}
