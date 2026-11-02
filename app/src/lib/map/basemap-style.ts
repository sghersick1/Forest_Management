"use server";

import {
  hasSignedInSession,
  sanitizeBasemapStyle,
} from "@/lib/map/basemap-proxy";
import type { StyleSpecification } from "maplibre-gl";

const MAP_STYLE_URL =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery";

export async function basemapStyle(): Promise<StyleSpecification | null> {
  if (!(await hasSignedInSession())) {
    return null;
  }

  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for the ArcGIS imagery style.");
  }

  const styleUrl = new URL(MAP_STYLE_URL);
  styleUrl.searchParams.set("token", token);

  let response: Response;
  try {
    response = await fetch(styleUrl, { redirect: "manual", cache: "no-store" });
  } catch {
    return null;
  }
  if (!response.ok) {
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
