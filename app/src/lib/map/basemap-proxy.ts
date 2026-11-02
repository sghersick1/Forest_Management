import { cacheLife } from "next/cache";
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
const DAY_SECONDS = 86400;
const MAX_CACHED_RESOURCES = 200;

export const basemapCacheLife = {
  stale: DAY_SECONDS,
  revalidate: DAY_SECONDS,
  expire: DAY_SECONDS,
};

type BasemapPayload = {
  status: number;
  contentType: string;
  body: string | null;
  encoding: "utf8" | "base64";
};

const resourceCache = new Map<string, { storedAt: number; payload: BasemapPayload }>();

export function clearBasemapCache(): void {
  resourceCache.clear();
}

export async function hasSignedInSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && typeof data?.claims.sub === "string";
}

// ArcGIS style resources stay on ArcGIS until this rewrites them. MapLibre then
// requests this origin, and the byte route attaches ESRI_API_KEY.
export function toProxyUrl(raw: string): string | null {
  const { shielded, restore } = shieldPlaceholders(raw);

  let parsed: URL;
  try {
    parsed = new URL(shielded);
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

  return toResponse(await readBasemap(target.href));
}

async function readBasemap(href: string): Promise<BasemapPayload> {
  const hit = readCachedResource(href);
  if (hit) {
    return hit;
  }

  try {
    const payload = await cachedBasemap(href);
    rememberResource(href, payload);
    return payload;
  } catch (error) {
    if (error instanceof BasemapNotCacheable) {
      return error.payload;
    }
    return fetchBasemapResource(href);
  }
}

async function cachedBasemap(href: string): Promise<BasemapPayload> {
  "use cache";
  cacheLife(basemapCacheLife);
  const payload = await fetchBasemapResource(href);
  if (payload.status !== 200) {
    throw new BasemapNotCacheable(payload);
  }
  return payload;
}

class BasemapNotCacheable extends Error {
  constructor(readonly payload: BasemapPayload) {
    super("basemap response is not cacheable");
  }
}

async function fetchBasemapResource(href: string): Promise<BasemapPayload> {
  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for the ArcGIS imagery style.");
  }

  const upstreamUrl = new URL(href);
  upstreamUrl.searchParams.set("token", token);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return emptyPayload(502);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return emptyPayload(502);
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  if (/json|text|xml|javascript/i.test(contentType)) {
    const rewritten = await rewrittenText(await upstream.text(), token);
    if (rewritten === null) {
      return emptyPayload(502);
    }
    return {
      status: upstream.status,
      contentType,
      body: rewritten,
      encoding: "utf8",
    };
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  return {
    status: upstream.status,
    contentType,
    body: encodeBase64(bytes),
    encoding: "base64",
  };
}

async function rewrittenText(value: string, token: string): Promise<string | null> {
  let body = value;
  try {
    body = JSON.stringify(rewriteUrls(JSON.parse(value)));
  } catch {
    body = value;
  }
  if (containsToken(body, token)) {
    return null;
  }
  return body;
}

function emptyPayload(status: number): BasemapPayload {
  return {
    status,
    contentType: "application/octet-stream",
    body: null,
    encoding: "utf8",
  };
}

function toResponse(payload: BasemapPayload): Response {
  const headers = {
    "content-type": payload.contentType,
    "cache-control":
      payload.status === 200 ? "private, max-age=86400" : "private, no-store",
    "x-content-type-options": "nosniff",
  };
  if (payload.body === null) {
    return new Response(null, { status: payload.status, headers });
  }
  if (payload.encoding === "base64") {
    return new Response(decodeBase64(payload.body), {
      status: payload.status,
      headers,
    });
  }
  return new Response(payload.body, { status: payload.status, headers });
}

function dropExpiredResources(now: number): void {
  for (const [href, entry] of resourceCache) {
    if (now - entry.storedAt > DAY_SECONDS * 1000) {
      resourceCache.delete(href);
    }
  }
}

function readCachedResource(href: string): BasemapPayload | null {
  const now = Date.now();
  dropExpiredResources(now);
  const entry = resourceCache.get(href);
  if (!entry) {
    return null;
  }
  return entry.payload;
}

function rememberResource(href: string, payload: BasemapPayload): void {
  if (payload.status !== 200) {
    return;
  }
  dropExpiredResources(Date.now());
  resourceCache.delete(href);
  resourceCache.set(href, { storedAt: Date.now(), payload });
  if (resourceCache.size <= MAX_CACHED_RESOURCES) {
    return;
  }
  const oldest = resourceCache.keys().next().value;
  if (oldest) {
    resourceCache.delete(oldest);
  }
}

function tokenForms(token: string): string[] {
  const encoded = encodeURIComponent(token);
  return encoded === token ? [token] : [token, encoded];
}

function containsToken(value: string, token: string): boolean {
  return tokenForms(token).some((form) => value.includes(form));
}

function isBasemapUrl(url: URL): boolean {
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return false;
  }
  if (isSpritePath(url.pathname)) {
    return false;
  }
  return (
    BASEMAP_HOSTS.has(url.hostname) &&
    url.pathname.startsWith("/arcgis/rest/services/")
  );
}

function isSpritePath(pathname: string): boolean {
  return /\/sprites\/sprite(?:@2x)?(?:\.(?:json|png))?$/.test(pathname);
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

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
