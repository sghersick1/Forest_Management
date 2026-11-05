"use client";

import { createContext, useContext, useState } from "react";

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
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<MapTool>("pointer");
  const [panel, setPanel] = useState<MapPanel>("layers");

  return (
    <MapContext.Provider
      value={{
        tool,
        setTool,
        panel,
        setPanel,
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
