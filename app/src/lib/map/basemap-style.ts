"use server";

const MAP_STYLE_URL =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery";

export async function basemapStyleUrl() {
  const token = process.env.ESRI_API_KEY;
  if (!token) {
    throw new Error("ESRI_API_KEY is required for the ArcGIS imagery style.");
  }

  const styleUrl = new URL(MAP_STYLE_URL);
  styleUrl.searchParams.set("token", token);
  return styleUrl.toString();
}
