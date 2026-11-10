"use client";

import { createContext, useContext, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import { useMapFeatures } from "./use-map-features";

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
  selectedFeature: string | null;
  setSelectedFeature: (id: string | null) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  projectId,
  initialFeatures = [],
  children,
}: {
  projectId: number;
  initialFeatures?: GeoJSONStoreFeatures[];
  children: React.ReactNode;
}) {
  const [tool, setToolState] = useState<MapTool>("pointer");
  const [panel, setPanel] = useState<MapPanel>("layers");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const { features, setFeatures } = useMapFeatures(projectId, initialFeatures);

  // Unselect feature when it is no longer in the features list
  if (
    selectedFeature !== null &&
    !features.some((feature) => String(feature.id) === selectedFeature)
  ) {
    setSelectedFeature(null);
  }

  // Unselect feature when changing tool off pointer
  const setTool = (next: MapTool) => {
    setToolState(next);
    if (next !== "pointer") setSelectedFeature(null);
  };

  return (
    <MapContext.Provider
      value={{
        tool,
        setTool,
        panel,
        setPanel,
        features,
        setFeatures,
        selectedFeature,
        setSelectedFeature,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const value = useContext(MapContext);
  if (!value) {
    throw new Error("useMap must be used within MapProvider");
  }
  return value;
}
