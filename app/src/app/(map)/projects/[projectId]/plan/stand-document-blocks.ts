export const descriptionBlockId = "stand-description";
const descriptionHeadingId = "stand-description-heading";

export function withDescriptionBlock(content: unknown[], description: string): unknown[] {
  const blocks = content.filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === "object");
  let descriptionIndex = blocks.findIndex((block) => block.id === descriptionBlockId);
  if (descriptionIndex >= 0) {
    const hasHeading = blocks.some((block) => block.id === descriptionHeadingId);
    if (!hasHeading) {
      blocks.splice(descriptionIndex, 0, {
        id: descriptionHeadingId,
        type: "heading",
        props: { level: 2 },
        content: "Description",
      });
      descriptionIndex += 1;
    }
    const current = blocks[descriptionIndex];
    if (blockText(current.content) !== description) {
      blocks[descriptionIndex] = { ...current, content: description };
    }
    return blocks;
  }
  return [
    { id: descriptionHeadingId, type: "heading", props: { level: 2 }, content: "Description" },
    { id: descriptionBlockId, type: "paragraph", content: description },
    ...blocks,
  ];
}

export function readDescription(content: unknown[]): string {
  const block = content.find(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && (item as { id?: unknown }).id === descriptionBlockId,
  );
  return block ? blockText(block.content) : "";
}

export function hasDescriptionBlock(content: unknown[]): boolean {
  return content.some(
    (item) => Boolean(item) && typeof item === "object" && (item as { id?: unknown }).id === descriptionBlockId,
  );
}

function blockText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const text = (item as { text?: unknown }).text;
    return typeof text === "string" ? [text] : [];
  }).join("");
}
