"use server";

import { createClient } from "@/lib/supabase/server";

const SUGGEST_URL =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";

export async function suggestAddresses(text: string): Promise<string[]> {
  const query = text.trim();
  if (query.length < 3) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authId = data?.claims.sub;
  if (error || typeof authId !== "string") {
    return [];
  }

  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for address suggestions.");
  }

  const url = new URL(SUGGEST_URL);
  url.searchParams.set("text", query);
  url.searchParams.set("category", "Address");
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return [];
  }

  return suggestionTexts(body);
}

function suggestionTexts(body: unknown): string[] {
  if (!body || typeof body !== "object" || "error" in body) {
    return [];
  }

  if (!("suggestions" in body) || !Array.isArray(body.suggestions)) {
    return [];
  }

  return body.suggestions.flatMap((item) => {
    if (!item || typeof item !== "object" || !("text" in item)) {
      return [];
    }
    return typeof item.text === "string" && item.text.length > 0
      ? [item.text]
      : [];
  });
}
