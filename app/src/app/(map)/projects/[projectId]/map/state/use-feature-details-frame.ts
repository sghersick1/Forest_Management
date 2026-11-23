"use client";

/*
 * Stored place and height for the feature details card.
 * The card starts 16px from the Features sidebar and the top of the map.
 * A drag or a resize is remembered. Sidebar edges push it back into the free map.
 * Dragging into the bottom edge shortens the card. The shorter height stays when the card moves away.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const storageLeft = "feature-details-panel-left";
const storageTop = "feature-details-panel-top";
const storageHeight = "feature-details-panel-height";

export const featureDetailsWidth = 264;
export const featureDetailsDefaultHeight = 355;
export const featureDetailsMinHeight = 86;

const defaultInset = 16;

type Frame = { left: number; top: number; height: number };

function initialFrame(): Frame {
  return { left: defaultInset, top: defaultInset, height: featureDetailsDefaultHeight };
}

export type FeatureDetailsEdges = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

type Drag = {
  kind: "move" | "resize";
  originX: number;
  originY: number;
  start: Frame;
  height: number;
};

// Width, place, and pointer handlers for the feature details card.
export function useFeatureDetailsFrame(open: boolean) {
  const panelRef = useRef<HTMLElement>(null);
  const frameRef = useRef<Frame>(initialFrame());
  const customPosition = useRef(false);
  const drag = useRef<Drag | null>(null);
  const [frame, setFrame] = useState<Frame>(initialFrame);
  const [ready, setReady] = useState(false);

  function commit(next: Frame) {
    frameRef.current = next;
    setFrame(next);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const parent = panelRef.current?.parentElement ?? null;
    const storedLeft = readPx(localStorage.getItem(storageLeft));
    const storedTop = readPx(localStorage.getItem(storageTop));
    const storedHeight = readPx(localStorage.getItem(storageHeight));
    customPosition.current = storedLeft !== null && storedTop !== null;
    const next = place(parent, {
      left: storedLeft ?? defaultInset,
      top: storedTop ?? defaultInset,
      height: storedHeight ?? featureDetailsDefaultHeight,
    }, customPosition.current);
    commit(next);
    setReady(true);
  }, [open]);

  useEffect(() => {
    if (!ready || !open) return;
    localStorage.setItem(storageHeight, String(frame.height));
    if (!customPosition.current) return;
    localStorage.setItem(storageLeft, String(frame.left));
    localStorage.setItem(storageTop, String(frame.top));
  }, [ready, open, frame]);

  useLayoutEffect(() => {
    if (!open || !ready) return;
    const parent = panelRef.current?.parentElement;
    if (!parent) return;

    const apply = () => {
      const next = place(parent, frameRef.current, customPosition.current);
      if (sameFrame(next, frameRef.current)) return;
      commit(next);
    };

    apply();
    const resize = new ResizeObserver(apply);
    const watch = () => {
      resize.disconnect();
      resize.observe(parent);
      for (const child of parent.children) {
        if (child instanceof HTMLElement && child.tagName === "ASIDE" && child !== panelRef.current) {
          resize.observe(child);
        }
      }
    };
    watch();
    const structure = new MutationObserver(() => {
      watch();
      apply();
    });
    structure.observe(parent, { childList: true, attributes: true, attributeFilter: ["style"] });
    return () => {
      resize.disconnect();
      structure.disconnect();
    };
  }, [open, ready]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("panel-moving");
      document.documentElement.classList.remove("panel-resizing");
    };
  }, []);

  function onMovePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      kind: "move",
      originX: event.clientX,
      originY: event.clientY,
      start: { ...frameRef.current },
      height: frameRef.current.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("panel-moving");
  }

  function onMovePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    const parent = panelRef.current?.parentElement;
    if (!active || active.kind !== "move" || !parent) return;
    customPosition.current = true;
    const top = active.start.top + event.clientY - active.originY;
    const pressed = pressIntoBottom(top, active.height, parent.clientHeight);
    const next = clampFrame({
      left: active.start.left + event.clientX - active.originX,
      top: pressed.top,
      height: pressed.height,
    }, parent);
    active.height = Math.min(active.height, next.height);
    commit(next);
  }

  function onResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      kind: "resize",
      originX: event.clientX,
      originY: event.clientY,
      start: { ...frameRef.current },
      height: frameRef.current.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("panel-resizing");
  }

  function onResizePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    const parent = panelRef.current?.parentElement;
    if (!active || active.kind !== "resize" || !parent) return;
    commit(clampFrame({
      left: active.start.left,
      top: active.start.top,
      height: active.start.height + event.clientY - active.originY,
    }, parent));
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>) {
    drag.current = null;
    document.documentElement.classList.remove("panel-moving");
    document.documentElement.classList.remove("panel-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const parent = panelRef.current?.parentElement ?? null;
  const parentHeight = parent?.clientHeight;
  const maxHeight = parentHeight ? Math.max(featureDetailsMinHeight, parentHeight - frame.top) : undefined;
  const edges = parent ? stuckEdges(frame, parent) : { left: false, right: false, top: false, bottom: false };

  return {
    panelRef,
    left: frame.left,
    top: frame.top,
    height: frame.height,
    maxHeight,
    edges,
    onMovePointerDown,
    onMovePointerMove,
    onResizePointerDown,
    onResizePointerMove,
    onPointerUp,
  };
}

// A missing or broken stored number falls back to the default frame.
function readPx(value: string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// The Features and Actions sidebars occupy the left and right of the map.
function occupiedWidth(parent: HTMLElement, edge: "left" | "right") {
  for (const child of parent.children) {
    if (!(child instanceof HTMLElement) || child.tagName !== "ASIDE") continue;
    if (!child.classList.contains(edge === "left" ? "left-0" : "right-0")) continue;
    return child.getBoundingClientRect().width;
  }
  return 0;
}

// Pressing the bottom into the page shortens the card. That shorter height stays.
function pressIntoBottom(top: number, height: number, parentHeight: number) {
  if (top + height <= parentHeight) return { top, height };
  const nextHeight = Math.max(featureDetailsMinHeight, parentHeight - top);
  return { top: Math.min(top, parentHeight - nextHeight), height: nextHeight };
}
function clampFrame(frame: Frame, parent: HTMLElement) {
  const leftInset = occupiedWidth(parent, "left");
  const rightInset = occupiedWidth(parent, "right");
  const maxLeft = Math.max(leftInset, parent.clientWidth - rightInset - featureDetailsWidth);
  const left = Math.round(Math.min(Math.max(frame.left, leftInset), maxLeft));
  let top = Math.round(Math.max(frame.top, 0));
  let height = Math.round(Math.max(frame.height, featureDetailsMinHeight));
  const room = parent.clientHeight - top;
  if (height > room) {
    height = Math.max(featureDetailsMinHeight, room);
    top = Math.min(top, Math.max(0, parent.clientHeight - height));
  }
  return { left, top, height };
}

// An edge is stuck when the card is flush with the map or a sidebar.
function stuckEdges(frame: Frame, parent: HTMLElement): FeatureDetailsEdges {
  const leftInset = occupiedWidth(parent, "left");
  const rightLimit = parent.clientWidth - occupiedWidth(parent, "right");
  return {
    left: frame.left <= leftInset + 1,
    right: frame.left + featureDetailsWidth >= rightLimit - 1,
    top: frame.top <= 1,
    bottom: frame.top + frame.height >= parent.clientHeight - 1,
  };
}

// A card the user has not dragged stays 16px from the Features sidebar and the top.
function place(parent: HTMLElement | null, frame: Frame, custom: boolean) {
  if (!parent) return frame;
  if (custom) return clampFrame(frame, parent);
  const leftInset = occupiedWidth(parent, "left");
  return clampFrame({ left: leftInset + defaultInset, top: defaultInset, height: frame.height }, parent);
}

function sameFrame(a: Frame, b: Frame) {
  return a.left === b.left && a.top === b.top && a.height === b.height;
}
