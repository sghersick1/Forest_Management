import {
  formatAcres,
  formatDirection,
  formatFeet,
} from "./sketch-constraints";

export type SketchTooltipLabel = {
  x: number;
  y: number;
  feet: number;
  acres: number;
  direction: number;
};

export function SketchTooltip({ label }: { label: SketchTooltipLabel | null }) {
  if (!label) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-30 rounded-md bg-white px-2 py-1 text-xs leading-4 text-black shadow-[0_1px_4px_rgb(0_0_0/0.35)]"
      style={{ left: label.x + 16, top: label.y + 16 }}
    >
      <div>{formatFeet(label.feet)}</div>
      <div>{formatDirection(label.direction)}</div>
      <div>{formatAcres(label.acres)}</div>
    </div>
  );
}
