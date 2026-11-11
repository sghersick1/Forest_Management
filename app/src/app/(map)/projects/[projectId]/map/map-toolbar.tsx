"use client";

/*
 * Pointer, polygon, and point tools.
 * The thumb slides to the selected tool.
 */

import { useEffect, useRef, useState } from "react";
import { useMap } from "./map-context";

const tools = [
  {
    id: "pointer",
    label: "Pointer",
    src: "/icons/map/cursor-pointer.svg",
    width: 27,
    height: 27,
  },
  {
    id: "polygon",
    label: "Polygon",
    src: "/icons/map/pentagon.svg",
    width: 21,
    height: 21,
  },
  {
    id: "point",
    label: "Point",
    src: "/icons/map/location.svg",
    width: 24,
    height: 24,
  },
] as const;

const cell = 52;
const springFrequency = 50;

// The tool radio group and its sliding thumb.
export function MapToolbar() {
  const { tool, setTool } = useMap();
  const index = tools.findIndex((item) => item.id === tool);
  const thumbX = useCriticallyDamped(index * cell);

  // Moves the tool with the arrow keys.
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (next === 0) return;
    event.preventDefault();
    const wrapped = (index + next + tools.length) % tools.length;
    const nextTool = tools[wrapped];
    setTool(nextTool.id);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[aria-label="${nextTool.label}"]`)
      ?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Map tools"
      onKeyDown={onKeyDown}
      className="fixed top-4 left-1/2 z-20 flex -translate-x-1/2 rounded-[12px] bg-white/55 shadow-[0_8px_12px_6px_rgb(0_0_0/0.15),0_4px_4px_0_rgb(0_0_0/0.3)] outline outline-1 -outline-offset-1 outline-white/40 [backdrop-filter:blur(20px)_saturate(1.8)] [@media(prefers-contrast:more)]:outline-text-primary [@media(prefers-reduced-transparency:reduce)]:bg-surface-control [@media(prefers-reduced-transparency:reduce)]:shadow-none [@media(prefers-reduced-transparency:reduce)]:outline-border-map [@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1.5 left-1.5 size-10 rounded-[8px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.16),0_2px_6px_rgb(0_0_0/0.08)] will-change-transform [@media(prefers-reduced-transparency:reduce)]:bg-surface-canvas [@media(prefers-reduced-transparency:reduce)]:shadow-[0_0_0_1px_var(--border-map)]"
        style={{ transform: `translate3d(${thumbX}px,0,0)` }}
      />
      {tools.map((item) => {
        const selected = tool === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={item.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTool(item.id)}
            className="relative z-10 flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] transition-transform duration-100 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <img
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              className="max-w-none shrink-0"
            />
          </button>
        );
      })}
    </div>
  );
}

// Slides a value toward a target without overshoot.
function useCriticallyDamped(target: number) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const velocityRef = useRef(0);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      valueRef.current = target;
      velocityRef.current = 0;
      setValue(target);
      return;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const offset = valueRef.current - targetRef.current;
      const velocity = velocityRef.current;
      const decay = Math.exp(-springFrequency * dt);
      const impulse = velocity + springFrequency * offset;
      const carried = offset + impulse * dt;
      const nextOffset = carried * decay;
      const nextVelocity = (impulse - springFrequency * carried) * decay;
      const nextValue = targetRef.current + nextOffset;
      valueRef.current = nextValue;
      velocityRef.current = nextVelocity;

      if (Math.abs(offset) < 0.2 && Math.abs(nextVelocity) < 0.2) {
        valueRef.current = targetRef.current;
        velocityRef.current = 0;
        setValue(targetRef.current);
        return;
      }

      setValue(nextValue);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
