import { basemapStyle } from "@/lib/map/basemap-style";

export async function GET() {
  try {
    const style = await basemapStyle();
    if (!style) {
      return new Response(null, { status: 502 });
    }
    return Response.json(style, {
      headers: {
        "cache-control": "public, max-age=86400, s-maxage=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
