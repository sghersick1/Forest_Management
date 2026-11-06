# Basemap

The imagery style is fetched from:

`https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery`

The request sets `token` from `ESRI_API_KEY` and `echoToken=false`. Redirects are not followed. A missing key throws. A network error, a non-OK response, invalid JSON, or a body that is not a MapLibre style (version 8, with `sources` and `layers`) becomes a null style.

### Proxy

ArcGIS tile and glyph URLs in the style are rewritten to this app before the style is sent to the browser.

Allowed targets are `https` URLs on `basemaps-api.arcgis.com` or `ibasemaps-api.arcgis.com`, with no user, password, or port, whose path starts with `/arcgis/rest/services/`. Sprite URLs are left on their original host, including `.../sprites/sprite` and `sprite@2x` `.json` and `.png` files. Other hosts, including `geocode-api.arcgis.com` and the ArcGIS CDN, are not proxied.

`toProxyUrl` drops any `token` query parameter and keeps MapLibre placeholders unencoded: `{z}`, `{x}`, `{y}`, `{bbox}`, `{bbox-epsg-3857}`, `{quadkey}`, `{fontstack}`, `{range}`, `{ratio}`, and `{prefix}`. The client URL is `/api/basemap?url=...`.

`GET /api/basemap/style` returns the sanitized style. It does not check a session. Success is cached with `cache-control: public, max-age=86400, s-maxage=86400`. A null style is 502. A thrown error, including a missing key, is 500. The style is refused if the raw or percent-encoded key still appears after rewriting. A `token` property anywhere in the JSON is removed.

`GET /api/basemap` serves tiles, glyphs, and other allowed resources.

1. The caller must have a signed-in session. Otherwise the route returns 401 and does not fetch.
2. `url` must be an allowed target, between 1 and 2000 characters. Otherwise the route returns 400.
3. The server deletes any client-supplied token, then adds `ESRI_API_KEY` on the upstream request.
4. Redirects are not followed. A redirect becomes an empty 502 so a `Location` header cannot carry the key.
5. JSON, text, XML, and JavaScript bodies are rewritten the same way as the style. If the key remains, the response is an empty 502.
6. Other bodies, such as imagery tiles, are returned as bytes.

The session proxy matcher skips `/api/basemap` and `/api/basemap/style`, so tile traffic does not refresh the Supabase session. The byte route still checks claims itself. The style route does not.

### Caching

`basemapCacheLife` is one day for `stale`, `revalidate`, and `expire`.

The style uses Next.js `"use cache"` plus an in-memory copy in `basemap-style.ts`. Upstream style fetches use `cache: "no-store"`.

Tile and glyph payloads use the same Next.js cache, and an in-memory map of at most 200 successful responses. Only HTTP 200 responses are stored. Entries older than one day are dropped. A cache hit does not call ArcGIS again. Successful responses use `cache-control: private, max-age=86400`. Other statuses use `private, no-store`.
