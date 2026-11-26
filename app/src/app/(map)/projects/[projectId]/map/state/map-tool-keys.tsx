"use client";

/*
 * Keyboard shortcuts for the map tools.
 * Lowercase v, p, and j work from anywhere on the map page.
 * Enter and Escape leave link mode.
 */

import { useEffect, useRef } from "react";
import { useMap, type MapTool } from "./map-context";
import { isTypingTarget } from "../sketch/events/keyboard";

// The tool for a lowercase shortcut, or null for every other key.
export function toolForKey(key: string): MapTool | null {
  if (key === "v") return "pointer";
  if (key === "p") return "polygon";
  if (key === "j") return "point";
  return null;
}

// Enter and Escape leave link mode. Other keys do not.
export function exitsLinking(key: string) {
  return key === "Enter" || key === "Escape";
}

// Listens on the window and selects the matching tool.
export function MapToolKeys() {
  const { tool, setTool, linking, setLinking, canEdit } = useMap();
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const linkingRef = useRef(linking);
  const setLinkingRef = useRef(setLinking);
  linkingRef.current = linking;
  setLinkingRef.current = setLinking;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const next = toolForKey(event.key);
      if (!next || (!canEditRef.current && next !== "pointer")) return;
      setTool(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool]);

  useEffect(() => {
    let consumed: string | null = null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!linkingRef.current || !exitsLinking(event.key)) return;
      if (event.key === "Enter" && toolRef.current !== "pointer") return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      consumed = event.key;
      event.preventDefault();
      event.stopPropagation();
      setLinkingRef.current(false);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (consumed !== event.key) return;
      consumed = null;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  return null;
}
