"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";

export type MapTool = "pointer" | "polygon" | "point";
export type MapPanel = "layers" | "actions" | "parcels";

export const mapPanel: Record<MapPanel, string> = {
  layers: "Layers",
  actions: "Actions",
  parcels: "Parcels",
};

type MapContextValue = {
  tool: MapTool;
  setTool: (tool: MapTool) => void;
  panel: MapPanel;
  setPanel: (panel: MapPanel) => void;
  features: GeoJSONStoreFeatures[];
  setFeatures: (features: GeoJSONStoreFeatures[]) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<MapTool>("pointer");
  const [panel, setPanel] = useState<MapPanel>("layers");
  const [features, setStoredFeatures] = useState<GeoJSONStoreFeatures[]>([]);
  // Custom setFeatures to only update features upon finalized edits
  const setFeatures = useCallback((next: GeoJSONStoreFeatures[]) => {
    setStoredFeatures((current) => {
      const res = featureSignature(next) === featureSignature(current) ? current : next;
      return res;
    });
  }, []);

  return (
    <MapContext.Provider
      value={{
        tool,
        setTool,
        panel,
        setPanel,
        features,
        setFeatures,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

// Only update features upon finalized edits 
function featureSignature(features: GeoJSONStoreFeatures[]) {
  return JSON.stringify(
    features.map((feature) => ({
      id: feature.id,
      geometry: feature.geometry,
    })),
  );
}

export function useMap() {
  const value = useContext(MapContext);
  if (!value) {
    throw new Error("useMap must be used within MapProvider");
  }
  return value;
}
