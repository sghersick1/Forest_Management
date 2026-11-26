"use client";

/*
 * Title and description for the selected feature.
 * The card mounts this only while a feature is selected.
 */

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { ParagraphField } from "@/app/components/texts/paragraph-field";
import type { TextFieldChange } from "@/app/components/texts/text-field-change";
import { useMap } from "../state/map-context";
import { useFeatureEdits } from "../state/feature-edits";
import { detailsThumb } from "./feature-details-thumb";
import { FeatureName } from "./feature-name";

const titleClassName =
  "template-body-small-emphasized block w-full cursor-text break-words border-0 bg-transparent p-0 text-left whitespace-normal text-text-primary";

const descriptionClassName =
  "template-body-small box-border block min-h-[1lh] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-left text-text-primary shadow-none outline-none field-sizing-content";

const fieldCardClassName =
  "shrink-0 rounded-[4px] border border-border-map bg-surface-canvas px-2 py-1 focus-within:border-border-selected";

// Title and description for the selected polygon.
export function FeatureDetails() {
  const { features, selectedFeature, canEdit } = useMap();
  const { describeFeature } = useFeatureEdits();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  useDetailsThumb(scrollerRef, thumbRef);
  if (selectedFeature === null) return null;

  const feature = features.find((item) => String(item.id) === selectedFeature);
  const featureName = typeof feature?.properties.name === "string" ? feature.properties.name : "";
  const description =
    typeof feature?.properties.description === "string" ? feature.properties.description : "";

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollerRef} className="feature-details-scroll flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pt-1.5">
        <div className={fieldCardClassName}>
          <p className="template-label-xs text-text-secondary">Title</p>
          <FeatureName
            key={selectedFeature}
            id={selectedFeature}
            name={featureName}
            features={features}
            activate="click"
            className={titleClassName}
          />
        </div>
        <div className={fieldCardClassName}>
          <p className="template-label-xs text-text-secondary">Description</p>
          <ParagraphField
            key={selectedFeature}
            value={description}
            placeholder=""
            className={descriptionClassName}
            readOnly={!canEdit}
            onText={(change) => saveDescription(selectedFeature, change, describeFeature)}
          />
        </div>
      </div>
      <div
        className="absolute inset-y-0 right-0 z-10 w-1.5"
        onPointerDown={(event) => dragDetailsThumb(event, scrollerRef.current, thumbRef.current)}
      >
        <div
          ref={thumbRef}
          aria-hidden="true"
          hidden
          className="absolute top-0 right-px w-1 rounded-full bg-surface-header"
        />
      </div>
    </div>
  );
}

// Paints the thumb in the right padding without re-rendering the fields.
function useDetailsThumb(
  scrollerRef: RefObject<HTMLDivElement | null>,
  thumbRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const el = scrollerRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    const paint = () => {
      const next = detailsThumb(el.scrollHeight, el.clientHeight, el.scrollTop);
      thumb.hidden = next === null;
      if (!next) return;
      thumb.style.height = `${next.height}px`;
      thumb.style.transform = `translateY(${next.top}px)`;
    };
    paint();
    el.addEventListener("scroll", paint, { passive: true });
    const observer = new ResizeObserver(paint);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", paint);
      observer.disconnect();
    };
  }, [scrollerRef, thumbRef]);
}

// Drag moves with the pointer. A click on the padding jumps the thumb there.
function dragDetailsThumb(
  event: ReactPointerEvent<HTMLDivElement>,
  scroller: HTMLDivElement | null,
  thumb: HTMLDivElement | null,
) {
  const trackEl = event.currentTarget;
  if (!scroller || !thumb || thumb.hidden) return;
  event.preventDefault();
  const track = trackEl.getBoundingClientRect();
  const thumbBox = thumb.getBoundingClientRect();
  const overflow = scroller.scrollHeight - scroller.clientHeight;
  const travel = track.height - thumbBox.height;
  if (overflow <= 0 || travel <= 0) return;
  const onThumb = event.clientY >= thumbBox.top && event.clientY <= thumbBox.bottom;
  const jump = (clientY: number) => {
    const next = ((clientY - track.top - thumbBox.height / 2) / travel) * overflow;
    scroller.scrollTop = Math.min(overflow, Math.max(0, next));
  };
  const startY = event.clientY;
  const startScroll = scroller.scrollTop;
  if (!onThumb) jump(event.clientY);
  trackEl.setPointerCapture(event.pointerId);
  const onMove = (move: PointerEvent) => {
    if (onThumb) {
      scroller.scrollTop = startScroll + ((move.clientY - startY) / travel) * overflow;
      return;
    }
    jump(move.clientY);
  };
  const onUp = () => {
    trackEl.removeEventListener("pointermove", onMove);
    trackEl.removeEventListener("pointerup", onUp);
  };
  trackEl.addEventListener("pointermove", onMove);
  trackEl.addEventListener("pointerup", onUp);
}

// An empty description is stored as an empty string.
function saveDescription(
  id: string,
  change: TextFieldChange,
  describeFeature: (id: string, description: string) => void,
) {
  describeFeature(id, change.action === "delete" ? "" : change.text);
}
