import { createClient } from "@/lib/supabase/server";
import { SoilBoundsError, soilFeatures } from "@/lib/soils/soils";

export async function POST(request: Request) {
  if (!(await signedIn())) {
    return new Response(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be JSON.");
  }

  const bounds =
    body !== null && typeof body === "object" && "bounds" in body
      ? (body as { bounds: unknown }).bounds
      : undefined;

  try {
    const features = await soilFeatures(bounds);
    return new Response(JSON.stringify({ type: "FeatureCollection", features }), {
      status: 200,
      headers: {
        "content-type": "application/geo+json",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof SoilBoundsError) {
      return errorResponse(400, error.message);
    }
    return errorResponse(502, "Soil data is unavailable.");
  }
}

async function signedIn(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && typeof data?.claims.sub === "string";
}

function errorResponse(status: number, error: string) {
  return Response.json(
    { error },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}
