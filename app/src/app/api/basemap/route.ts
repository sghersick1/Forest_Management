import {
  basemapTarget,
  fetchBasemap,
  hasSignedInSession,
} from "@/lib/map/basemap-proxy";

export async function GET(request: Request) {
  if (!(await hasSignedInSession())) {
    return new Response(null, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get("url");
  const target = raw ? basemapTarget(raw) : null;
  if (!target) {
    return new Response(null, { status: 400 });
  }

  try {
    return await fetchBasemap(target);
  } catch {
    return new Response(null, { status: 500 });
  }
}
