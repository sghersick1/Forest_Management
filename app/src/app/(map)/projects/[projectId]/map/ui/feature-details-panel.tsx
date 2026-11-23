"use client";

/*
 * Floating title and description for the selected feature.
 * The grip moves the card. The bottom edge changes its height.
 */

import { FeatureDetails } from "./feature-details";
import { useMap } from "../state/map-context";
import { ToolTip, useToolTip } from "./map-toolbar";
import {
  featureDetailsMinHeight,
  featureDetailsWidth,
  useFeatureDetailsFrame,
  type FeatureDetailsEdges,
} from "../state/use-feature-details-frame";

const iconButtonClassName =
  "relative flex size-6 shrink-0 items-center justify-center rounded-[4px] text-text-secondary transition-colors hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

// The feature details card. It is absent until a feature is selected.
export function FeatureDetailsPanel() {
  const { selectedFeature } = useMap();
  const open = selectedFeature !== null;
  const moveTip = useToolTip();
  const {
    panelRef,
    left,
    top,
    height,
    maxHeight,
    edges,
    onMovePointerDown,
    onMovePointerMove,
    onResizePointerDown,
    onResizePointerMove,
    onPointerUp,
  } = useFeatureDetailsFrame(open);

  if (!open) return null;

  return (
    <aside
      ref={panelRef}
      aria-label="Feature details"
      style={{ left, top, height, maxHeight: height, width: featureDetailsWidth }}
      className="absolute z-20 flex min-h-0 flex-col overflow-hidden bg-surface-canvas [background-image:linear-gradient(var(--surface-translucent-placeholder-2),var(--surface-translucent-placeholder-2))]"
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border-map bg-surface-canvas px-1">
        <button
          type="button"
          aria-label="Move feature details"
          onPointerEnter={() => moveTip.show("details", true)}
          onPointerLeave={() => moveTip.hide("details")}
          onFocus={() => moveTip.show("details", false)}
          onBlur={() => moveTip.hide("details")}
          onPointerDown={(event) => {
            moveTip.dismiss("details");
            onMovePointerDown(event);
          }}
          onPointerMove={onMovePointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`${iconButtonClassName} cursor-grab touch-none`}
        >
          <PanelIcon src="/icons/map/grip-vertical.svg" />
          {moveTip.current ? (
            <ToolTip
              label={<span>Drag <span className="text-text-secondary">to move</span></span>}
              animate={moveTip.current.animate}
              align="left"
            />
          ) : null}
        </button>
        <button type="button" aria-label="Open document" className={`${iconButtonClassName} cursor-pointer`}>
          <PanelIcon src="/icons/map/open-outline.svg" />
        </button>
      </div>
      <FeatureDetails />
      <StuckEdges edges={edges} />
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize feature details"
        aria-valuemin={featureDetailsMinHeight}
        aria-valuenow={Math.round(height)}
        aria-valuemax={maxHeight === undefined ? undefined : Math.round(maxHeight)}
        tabIndex={0}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-row-resize touch-none"
      />
    </aside>
  );
}

function StuckEdges({ edges }: { edges: FeatureDetailsEdges }) {
  const mark = "pointer-events-none absolute z-30 bg-border-selected";
  return (
    <>
      {edges.left ? <span aria-hidden="true" className={`${mark} inset-y-0 left-0 w-0.5`} /> : null}
      {edges.right ? <span aria-hidden="true" className={`${mark} inset-y-0 right-0 w-0.5`} /> : null}
      {edges.top ? <span aria-hidden="true" className={`${mark} inset-x-0 top-0 h-0.5`} /> : null}
      {edges.bottom ? <span aria-hidden="true" className={`${mark} inset-x-0 bottom-0 h-0.5`} /> : null}
    </>
  );
}

function PanelIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-4 bg-current [mask-mode:alpha] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
      style={{ maskImage: `url(${src})` }}
    />
  );
}
