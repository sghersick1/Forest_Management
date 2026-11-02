import { createClient } from "@/lib/supabase/server";
import type { StyleSpecification } from "maplibre-gl";

const BASEMAP_HOSTS = new Set([
  "basemaps-api.arcgis.com",
  "ibasemaps-api.arcgis.com",
]);

const PLACEHOLDERS = [
  "bbox-epsg-3857",
  "fontstack",
  "quadkey",
  "prefix",
  "range",
  "ratio",
  "bbox",
  "z",
  "x",
  "y",
];

const PROXY_PATH = "/api/basemap";

export async function hasSignedInSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && typeof data?.claims.sub === "string";
}

// ArcGIS embeds ESRI_API_KEY in tile and glyph URLs. MapLibre requests those
// from the browser, so send them through this origin and attach the key here.
export function toProxyUrl(raw: string): string | null {
  const { shielded, restore } = shieldPlaceholders(raw);

  let parsed: URL;
  try {
    parsed = new URL(shielded);
  } catch {
    return null;
  }
  if (!isBasemapUrl(parsed) || !parsed.searchParams.has("token")) {
    return null;
  }

  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  parsed.searchParams.delete("token");

  let encoded = encodeURIComponent(restore(parsed.href));
  for (const name of PLACEHOLDERS) {
    encoded = encoded.replaceAll(`%7B${name}%7D`, `{${name}}`);
  }
  return `${PROXY_PATH}?url=${encoded}`;
}

export function basemapTarget(raw: string): URL | null {
  if (raw.length === 0 || raw.length > 2000) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!isBasemapUrl(parsed)) {
    return null;
  }

  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  parsed.searchParams.delete("token");
  return parsed;
}

export function sanitizeBasemapStyle(
  body: unknown,
  token: string,
): StyleSpecification | null {
  const rewritten = rewriteUrls(body);
  if (!isStyleSpecification(rewritten)) {
    return null;
  }
  if (containsToken(JSON.stringify(rewritten), token)) {
    return null;
  }
  return rewritten;
}

export async function fetchBasemap(target: URL): Promise<Response> {
  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for the ArcGIS imagery style.");
  }

  const upstreamUrl = new URL(target.href);
  upstreamUrl.searchParams.set("token", token);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return new Response(null, { status: 502 });
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const textual = /json|text|xml|javascript/i.test(contentType);
  const headers = {
    "content-type": contentType,
    "cache-control":
      upstream.ok && !textual ? "private, max-age=86400" : "private, no-store",
    "x-content-type-options": "nosniff",
  };

  if (textual) {
    const body = redactToken(await upstream.text(), token);
    return new Response(body, { status: upstream.status, headers });
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}

function tokenForms(token: string): string[] {
  const encoded = encodeURIComponent(token);
  return encoded === token ? [token] : [token, encoded];
}

function containsToken(value: string, token: string): boolean {
  return tokenForms(token).some((form) => value.includes(form));
}

function redactToken(value: string, token: string): string {
  let redacted = value;
  for (const form of tokenForms(token)) {
    redacted = redacted.split(form).join("");
  }
  return redacted;
}

function isBasemapUrl(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    BASEMAP_HOSTS.has(url.hostname) &&
    url.pathname.startsWith("/arcgis/rest/services/")
  );
}

function shieldPlaceholders(raw: string): {
  shielded: string;
  restore: (value: string) => string;
} {
  let shielded = raw;
  const pairs: Array<[string, string]> = [];
  for (const name of PLACEHOLDERS) {
    const placeholder = `{${name}}`;
    const marker = `___PH${name}___`;
    if (!shielded.includes(placeholder)) {
      continue;
    }
    pairs.push([marker, placeholder]);
    shielded = shielded.split(placeholder).join(marker);
  }

  return {
    shielded,
    restore(value: string) {
      let restored = value;
      for (const [marker, placeholder] of pairs) {
        restored = restored.split(marker).join(placeholder);
      }
      return restored;
    },
  };
}

function rewriteUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return toProxyUrl(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map(rewriteUrls);
  }
  if (value && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "token") {
        continue;
      }
      copy[key] = rewriteUrls(entry);
    }
    return copy;
  }
  return value;
}

function isStyleSpecification(value: unknown): value is StyleSpecification {
  if (!value || typeof value !== "object") {
    return false;
  }
  const style = value as Record<string, unknown>;
  return (
    style.version === 8 &&
    typeof style.sources === "object" &&
    style.sources !== null &&
    Array.isArray(style.layers)
  );
}
