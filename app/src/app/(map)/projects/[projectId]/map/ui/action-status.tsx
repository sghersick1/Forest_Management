"use client";

/*
 * Glyph status control for one action row.
 * The mark darkens on hover. The menu lists the four statuses with no search field.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  ACTION_STATUSES,
  actionStatusLabel,
  type ActionStatus,
} from "@/lib/actions/action-status";

const gray = "var(--text-secondary)";
const progress = "#F2C94C";
const done = "#159C5C";

export function actionStatusColor(status: ActionStatus) {
  if (status === "done") return done;
  if (status === "in-progress") return progress;
  return gray;
}

// Status mark. inverse flips paint for a status-colored bar:
// former primary → empty (shows the bar), former empty/white → status color.
// On a matching bar those status-color marks disappear — so inverse also inks white
// where the mark must stay readable (same job as the white label).
export function ActionStatusIcon({
  status,
  size = 16,
  inverse = false,
}: {
  status: ActionStatus;
  size?: number;
  inverse?: boolean;
}) {
  // Readable ink on a status-colored button. Matches white label.
  const onBar = "#ffffff";

  if (status === "done") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="block shrink-0">
        <circle cx="8" cy="8" r="6.75" fill={inverse ? onBar : done} />
        <path
          d="M4.9 8.25 6.95 10.25 11.15 6"
          fill="none"
          stroke={inverse ? done : "#fff"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="block shrink-0">
        <circle cx="8" cy="8" r="6" fill="none" stroke={inverse ? onBar : progress} strokeWidth="1.5" />
        <path
          d="M8 2.75 A5.25 5.25 0 0 1 8 13.25 L8 8 Z"
          fill={inverse ? "none" : progress}
        />
        {inverse ? <path d="M8 2.75 A5.25 5.25 0 0 0 8 13.25 L8 8 Z" fill={onBar} /> : null}
      </svg>
    );
  }

  if (status === "cancelled") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="block shrink-0">
        <circle cx="8" cy="8" r="6.75" fill={inverse ? onBar : gray} />
        <path
          d="M5.5 5.5 10.5 10.5M10.5 5.5 5.5 10.5"
          fill="none"
          stroke={inverse ? gray : "#fff"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Planned: ring only. Bar uses white stroke on the grey button fill.
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="block shrink-0">
      <circle cx="8" cy="8" r="6" fill="none" stroke={inverse ? onBar : gray} strokeWidth="1.5" />
    </svg>
  );
}

// Opens the status menu from the glyph. Click does not select the row.
// showLabel adds the status name beside the glyph. outline frames a full-width bar.
export function ActionStatusButton({
  status,
  onStatus,
  showLabel = false,
  outline = false,
}: {
  status: ActionStatus;
  onStatus: (status: ActionStatus) => void;
  showLabel?: boolean;
  outline?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const label = actionStatusLabel(status);
  const tone = actionStatusColor(status);
  const className = outline
    ? "inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-transparent px-3 text-white transition-[filter,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary active:scale-[0.99] [@media(hover:hover)_and_(pointer:fine)]:hover:brightness-[0.92]"
    : showLabel
      ? `inline-flex h-7 max-w-full cursor-pointer items-center gap-2 rounded-[6px] border-0 bg-transparent px-2 py-1 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary hover:bg-surface-translucent-placeholder ${open ? "bg-surface-translucent-placeholder" : ""}`
      : "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-[filter,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:brightness-[0.8]";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}. Change status`}
        onMouseDown={(event) => {
          // Keep the glyph from taking focus so the row does not stick in focus-within hover.
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className={className}
        style={outline ? { backgroundColor: tone, borderColor: tone } : undefined}
      >
        <ActionStatusIcon status={status} inverse={outline} />
        {showLabel || outline ? (
          <span className={`template-body-medium min-w-0 truncate ${outline ? "text-white" : "text-text-primary"}`}>{label}</span>
        ) : null}
      </button>
      {open ? (
        <ActionStatusMenu
          triggerRef={triggerRef}
          current={status}
          align={showLabel || outline ? "left" : "right"}
          onSelect={onStatus}
          onClose={(restoreFocus) => {
            setOpen(false);
            if (restoreFocus) {
              triggerRef.current?.focus();
              return;
            }
            // Menu unmount can hand focus back to the trigger; clear that next frame.
            const active = document.activeElement;
            if (active instanceof HTMLElement) active.blur();
            requestAnimationFrame(() => {
              if (document.activeElement === triggerRef.current) triggerRef.current?.blur();
            });
          }}
        />
      ) : null}
    </>
  );
}

function ActionStatusMenu({
  triggerRef,
  current,
  align = "right",
  onSelect,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  current: ActionStatus;
  align?: "left" | "right";
  onSelect: (status: ActionStatus) => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const listId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(() => Math.max(0, ACTION_STATUSES.findIndex((status) => status.id === current)));
  const [entered, setEntered] = useState(false);
  const active = ACTION_STATUSES[highlight] ?? ACTION_STATUSES[0];

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;
    const place = () => placeMenu(trigger, menu, align);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [align, triggerRef]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose, triggerRef]);

  function pick(status: ActionStatus) {
    onSelect(status);
    onClose(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const shortcut = ACTION_STATUSES.find((status) => status.shortcut === event.key);
    if (shortcut) {
      event.preventDefault();
      pick(shortcut.id);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((value) => (value + 1) % ACTION_STATUSES.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((value) => (value - 1 + ACTION_STATUSES.length) % ACTION_STATUSES.length);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active.id);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key === "Tab") onClose(false);
  }

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      id={listId}
      tabIndex={-1}
      aria-label="Change status"
      aria-activedescendant={`${listId}-${active.id}`}
      data-entered={entered ? "" : undefined}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
      className="fixed z-50 w-[220px] rounded-[12px] bg-surface-canvas p-1 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] outline-none transition-[opacity,transform] duration-150 ease-out [transform:scale(0.96)] focus:outline-none focus-visible:outline-none data-entered:opacity-100 data-entered:[transform:scale(1)] motion-reduce:transition-opacity motion-reduce:[transform:none] motion-reduce:data-entered:[transform:none]"
      style={{ left: 0, top: 0 }}
    >
      {ACTION_STATUSES.map((status, index) => {
        const selected = status.id === current;
        return (
          <div
            key={status.id}
            id={`${listId}-${status.id}`}
            role="option"
            aria-selected={selected}
          >
            <button
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(status.id);
              }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-[6px] border-0 px-2 py-1.5 text-left ${index === highlight ? "bg-surface-translucent-placeholder" : "bg-transparent"}`}
            >
              <ActionStatusIcon status={status.id} />
              <span className="template-body-medium min-w-0 flex-1 text-text-primary">{status.label}</span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                {selected ? <CheckIcon /> : <span className="size-4" aria-hidden="true" />}
                <span className="template-body-small w-3 text-center">{status.shortcut}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function placeMenu(trigger: HTMLElement, menu: HTMLElement, align: "left" | "right") {
  const rect = trigger.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const margin = 8;
  const gap = 6;
  // List rows anchor right. The details label anchors left under the trigger.
  let left = align === "left" ? rect.left : rect.right - width;
  left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
  let top = rect.bottom + gap;
  let originY = "top";
  if (top + height > window.innerHeight - margin && rect.top - gap - height > margin) {
    top = rect.top - gap - height;
    originY = "bottom";
  }
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.transformOrigin = `${originY} ${align}`;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="block text-text-primary">
      <path d="M3.5 8.2 6.4 11.1 12.5 4.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
