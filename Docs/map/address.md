# Address lookup

Both functions are server actions in `app/src/lib/map`. They require a signed-in session (`auth.getClaims().sub`) and `ESRI_API_KEY`.

`suggestAddresses` calls the ArcGIS World Geocoding Service `suggest` endpoint with `category=Address`. Input shorter than 3 characters returns `[]`. A signed-out caller returns `[]`. A missing key throws. The new-project dialog waits 300ms after typing, ignores stale responses, and does not search again after the user picks a suggestion. Suggestions are address strings only. The dialog does not keep Esri `magicKey` values.

`geocodeAddress` calls `findAddressCandidates` with `outSR=4326` and `maxLocations=1`. The address must be non-empty and at most 200 characters. An optional `magicKey` is sent when present; project creation does not pass one. The function returns the highest-scoring candidate's point, score, and extent, or `null` when the caller is signed out, the request fails, or no candidate is usable. The extent is not stored.
