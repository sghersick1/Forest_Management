/*
 * Tests the soils GeoJSON source.
 * MapLibre is told to load /api/soils, and that request is sent as a POST with bounds.
 */

import type { Map as MapLibreMap, RequestParameters } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { installSoilSource, soilSourceId } from "./soil-source";

function fakeMap(loaded: boolean) {
  const sources = new Map<string, { type: string; data: string }>();
  const listeners = new Map<string, Set<() => void>>();
  let transform: ((url: string) => RequestParameters) | null = null;
  const map = {
    style: { _loaded: loaded },
    getBounds: () => ({
      getWest: () => -81.302,
      getSouth: () => 41.611,
      getEast: () => -81.3,
      getNorth: () => 41.613,
    }),
    addSource(id: string, spec: { type: string; data: string }) {
      sources.set(id, spec);
    },
    getSource(id: string) {
      return sources.get(id);
    },
    removeSource(id: string) {
      sources.delete(id);
    },
    setTransformRequest(next: ((url: string) => RequestParameters) | null) {
      transform = next;
    },
    on(type: string, fn: () => void) {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    off(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
    loadStyle() {
      map.style._loaded = true;
      for (const fn of listeners.get("style.load") ?? []) fn();
    },
  };
  return { map: map as unknown as MapLibreMap, sources, transform: () => transform };
}

describe("soil source", () => {
  it("adds /api/soils and posts the current bounds", () => {
    const { map, sources, transform } = fakeMap(true);
    installSoilSource(map);

    expect(sources.get(soilSourceId)).toEqual({ type: "geojson", data: "/api/soils" });

    const request = transform()?.("http://localhost:3000/api/soils");
    expect(request).toMatchObject({
      url: "http://localhost:3000/api/soils",
      method: "POST",
    });
    expect(JSON.parse(request?.body ?? "")).toEqual({
      bounds: { west: -81.302, south: 41.611, east: -81.3, north: 41.613 },
    });
    expect(transform()?.("http://localhost:3000/api/basemap/style?v=2")).toEqual({
      url: "http://localhost:3000/api/basemap/style?v=2",
    });
  });

  it("waits for the style, then removes the source on cleanup", () => {
    const { map, sources, transform } = fakeMap(false);
    const stop = installSoilSource(map);
    expect(sources.has(soilSourceId)).toBe(false);

    (map as unknown as { loadStyle: () => void }).loadStyle();
    expect(sources.has(soilSourceId)).toBe(true);

    stop();
    expect(sources.has(soilSourceId)).toBe(false);
    expect(transform()).toBeNull();
  });
});
