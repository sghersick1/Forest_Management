import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Map } from "@/components/map/Map";

const IMAGERY_STYLE =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery";

// Next only auto-loads .env from the app directory. The key is in the repo root .env.
loadEnvConfig(path.join(process.cwd(), ".."), process.env.NODE_ENV !== "production", {
  info() {},
  error() {},
});

export default function Home() {
  // Dynamic lookup so Next does not inline a missing compile-time value.
  const token = process.env["ESRI_API_KEY"];
  if (!token) {
    throw new Error(
      "ESRI_API_KEY is not set. Add it to the repo root .env file.",
    );
  }

  const styleUrl = new URL(IMAGERY_STYLE);
  styleUrl.searchParams.set("token", token);

  return (
    <main className="h-dvh w-full">
      <Map
        styleUrl={styleUrl.toString()}
        longitude={-80.1299}
        latitude={40.7874}
        zoom={15}
      />
    </main>
  );
}
