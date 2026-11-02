"use server";

import { createClient } from "@/lib/supabase/server";

const FIND_URL =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

const MAX_ADDRESS_LENGTH = 200;

export type GeocodeMatch = {
  x: number;
  y: number;
  score: number;
  extent_xmin: number;
  extent_ymin: number;
  extent_xmax: number;
  extent_ymax: number;
};

export async function geocodeAddress(
  address: string,
  magicKey?: string,
): Promise<GeocodeMatch | null> {
  const singleLine = address.trim();
  if (singleLine.length === 0) {
    throw new Error("Address is required.");
  }
  if (singleLine.length > MAX_ADDRESS_LENGTH) {
    throw new Error("Address must be 200 characters or fewer.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (error || typeof authId !== "string") {
    return null;
  }

  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for geocoding.");
  }

  const url = new URL(FIND_URL);
  url.searchParams.set("SingleLine", singleLine);
  url.searchParams.set("f", "json");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("maxLocations", "1");
  url.searchParams.set("token", token);

  const key = magicKey?.trim();
  if (key) {
    url.searchParams.set("magicKey", key);
  }

  let response: Response;
  try {
    response = await fetch(url);
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

  return topMatch(body);
}

function topMatch(body: unknown): GeocodeMatch | null {
  if (!body || typeof body !== "object" || "error" in body) {
    return null;
  }
  if (!("candidates" in body) || !Array.isArray(body.candidates)) {
    return null;
  }

  let best: GeocodeMatch | null = null;
  for (const candidate of body.candidates) {
    const match = candidateMatch(candidate);
    if (!match) {
      continue;
    }
    if (!best || match.score > best.score) {
      best = match;
    }
  }
  return best;
}

function candidateMatch(candidate: unknown): GeocodeMatch | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  if (
    !("location" in candidate) ||
    !("score" in candidate) ||
    !("extent" in candidate)
  ) {
    return null;
  }

  const { location, extent, score } = candidate;
  if (!location || typeof location !== "object") {
    return null;
  }
  if (!extent || typeof extent !== "object") {
    return null;
  }
  if (!("x" in location) || !("y" in location)) {
    return null;
  }
  if (
    !("xmin" in extent) ||
    !("ymin" in extent) ||
    !("xmax" in extent) ||
    !("ymax" in extent)
  ) {
    return null;
  }

  const x = finiteNumber(location.x);
  const y = finiteNumber(location.y);
  const scoreNumber = finiteNumber(score);
  const extent_xmin = finiteNumber(extent.xmin);
  const extent_ymin = finiteNumber(extent.ymin);
  const extent_xmax = finiteNumber(extent.xmax);
  const extent_ymax = finiteNumber(extent.ymax);
  if (
    x === null ||
    y === null ||
    scoreNumber === null ||
    extent_xmin === null ||
    extent_ymin === null ||
    extent_xmax === null ||
    extent_ymax === null
  ) {
    return null;
  }

  return {
    x,
    y,
    score: scoreNumber,
    extent_xmin,
    extent_ymin,
    extent_xmax,
    extent_ymax,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
