"use client";

/*
 * Keyboard shortcuts for the map tools.
 * Lowercase v, p, and j work from anywhere on the map page.
 */

import { useEffect } from "react";
import { useMap, type MapTool } from "../map-context";
import { isTypingTarget } from "../sketch/events/keyboard";

// The tool for a lowercase shortcut, or null for every other key.
export function toolForKey(key: string): MapTool | null {
  if (key === "v") return "pointer";
  if (key === "p") return "polygon";
  if (key === "j") return "point";
  return null;
}

// Listens on the window and selects the matching tool.
export function MapToolKeys() {
  const { setTool } = useMap();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const next = toolForKey(event.key);
      if (!next) return;
      setTool(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool]);

  return null;
}
