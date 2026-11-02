import { cacheLife } from "next/cache";
import {
  basemapCacheLife,
  sanitizeBasemapStyle,
} from "@/lib/map/basemap-proxy";
import type { StyleSpecification } from "maplibre-gl";

const MAP_STYLE_URL =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery";

const KEY_ERROR = "ESRI_API_KEY is required for the ArcGIS imagery style.";

let styleCache: { storedAt: number; style: StyleSpecification } | null = null;

export function clearBasemapStyleCache(): void {
  styleCache = null;
}

export async function basemapStyle(): Promise<StyleSpecification | null> {
  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error(KEY_ERROR);
  }

  if (styleCache && Date.now() - styleCache.storedAt < basemapCacheLife.expire * 1000) {
    return styleCache.style;
  }

  try {
    const style = await cachedBasemapStyle();
    styleCache = { storedAt: Date.now(), style };
    return style;
  } catch (error) {
    if (error instanceof Error && error.message === KEY_ERROR) {
      throw error;
    }
    return null;
  }
}

async function cachedBasemapStyle(): Promise<StyleSpecification> {
  "use cache";
  cacheLife(basemapCacheLife);
  const style = await fetchBasemapStyle();
  if (!style) {
    throw new Error("ArcGIS imagery style is unavailable.");
  }
  return style;
}

async function fetchBasemapStyle(): Promise<StyleSpecification | null> {
  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error(KEY_ERROR);
  }

  const styleUrl = new URL(MAP_STYLE_URL);
  styleUrl.searchParams.set("token", token);
  styleUrl.searchParams.set("echoToken", "false");

  let response: Response;
  try {
    response = await fetch(styleUrl, { redirect: "manual", cache: "no-store" });
  } catch {
    return null;
  }
  if (!response.ok || (response.status >= 300 && response.status < 400)) {
    return null;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }

  return sanitizeBasemapStyle(body, token);
}
