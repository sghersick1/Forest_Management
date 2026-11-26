"use client";

/*
 * Shared map state for the toolbar, sidebar, and sketch session.
 * Feature writes go through insert, update, and delete, one feature at a time.
 */

import { createContext, useContext, useRef, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import type { ProjectAction } from "@/lib/actions/actions";
import { highlightedFeatureIds, linkedFeatureIds, type ActionFeatureLink } from "@/lib/actions/action-feature-links";
import { keptHoverId, keptSelectedId, selectedForTool } from "../sketch/kinds/polygon/hit";
import { useActionFeatures } from "../data/use-action-features";
import { useMapActions } from "../data/use-map-actions";
import { useMapFeatures } from "../data/use-map-features";
import { ActionEditsProvider } from "./action-edits";
import { FeatureEditsProvider } from "./feature-edits";

export type MapTool = "pointer" | "polygon" | "point";

export type MapMenu = { kind: "feature"; id: string; x: number; y: number } | { kind: "action"; id: number; x: number; y: number };

type MapContextValue = {
  contextMenu: MapMenu | null;
  setContextMenu: (menu: MapMenu | null) => void;
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  tool: MapTool;
  setTool: (tool: MapTool) => void;
  features: GeoJSONStoreFeatures[];
  insertFeature: (feature: GeoJSONStoreFeatures) => void;
  updateFeature: (feature: GeoJSONStoreFeatures) => void;
  deleteFeature: (id: string) => void;
  selectedFeature: string | null;
  setSelectedFeature: (id: string | null) => void;
  hoverFeature: string | null;
  setHoverFeature: (id: string | null) => void;
  hoverAction: number | null;
  setHoverAction: (id: number | null) => void;
  deleteAction: (id: number) => Promise<void>;
  actions: ProjectAction[];
  createAction: (featureId?: string) => Promise<number>;
  selectedAction: number | null;
  setSelectedAction: (id: number | null) => void;
  linking: boolean;
  setLinking: (linking: boolean) => void;
  actionFeatureLinks: ActionFeatureLink[];
  linkedFeatureIds: string[];
  highlightedFeatureIds: string[];
  toggleLinkedFeature: (featureId: string) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

// Provides the tool, panel, feature list, selection, and hover to the map.
export function MapProvider({
  projectId,
  initialFeatures = [],
  initialActions = [],
  initialActionFeatures = [],
  children,
}: {
  projectId: number;
  initialFeatures?: GeoJSONStoreFeatures[];
  initialActions?: ProjectAction[];
  initialActionFeatures?: ActionFeatureLink[];
  children: React.ReactNode;
}) {
  const [contextMenu, setContextMenu] = useState<MapMenu | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpenState] = useState(true);
  const [tool, setToolState] = useState<MapTool>("pointer");
  const [linking, setLinkingState] = useState(false);
  const [selectedFeature, setSelectedFeatureState] = useState<string | null>(null);
  const [hoverFeature, setHoverFeature] = useState<string | null>(null);
  const [hoverAction, setHoverAction] = useState<number | null>(null);
  const [selectedAction, setSelectedActionState] = useState<number | null>(null);
  const renameNewFeatureRef = useRef<(id: string | null) => void>(() => {});
  const { actions, renameAction, describeAction, createAction: insertAction, deleteAction } = useMapActions(projectId, initialActions);
  const { links, toggleLinkedFeature: toggleActionFeature, linkFeature } = useActionFeatures(
    projectId,
    initialActionFeatures,
  );
  const { features, insertFeature: storeFeature, updateFeature, deleteFeature, renameFeature, describeFeature } = useMapFeatures(
    projectId,
    initialFeatures,
  );

  // Finish drawing by opening the new feature for naming.
  const insertFeature = async (feature: GeoJSONStoreFeatures) => {
    const id = String(feature.id);
    if (features.some((item) => String(item.id) === id)) return;
    const linkingAction = linking ? selectedAction : null;
    const saved = storeFeature(feature);
    setToolState("pointer");
    if (linkingAction === null) setLinkingState(false);
    setSelectedFeatureState(id);
    renameNewFeatureRef.current(id);
    if (linkingAction !== null) {
      try {
        await saved;
        toggleActionFeature(linkingAction, id);
      } catch (error) { console.error(error); }
    }
  };

  const createAction = async (featureId?: string) => {
    const featureToLink = featureId ?? selectedFeature;
    const id = await insertAction();
    if (featureToLink !== null) await linkFeature(id, featureToLink);
    setSelectedActionState(id);
    setLinkingState(false);
    return id;
  };

  const featureIds = features.map((feature) => String(feature.id));
  const selectedId = keptSelectedId(selectedFeature, featureIds);
  if (selectedId !== selectedFeature) setSelectedFeatureState(selectedId);
  const hoverId = keptHoverId(hoverFeature, selectedId, featureIds);
  if (hoverId !== hoverFeature) setHoverFeature(hoverId);
  if (selectedAction !== null && !actions.some((action) => action.id === selectedAction)) {
    setSelectedActionState(null);
    setLinkingState(false);
  }

  if (hoverAction !== null && !actions.some((action) => action.id === hoverAction)) {
    setHoverAction(null);
  }

  const featureLinks = linkedFeatureIds(links, selectedAction, featureIds);
  const activeHoverFeature = contextMenu?.kind === "feature" ? contextMenu.id : hoverFeature;
  const activeHoverAction = contextMenu?.kind === "action" ? contextMenu.id : hoverAction;
  const highlightedLinks = highlightedFeatureIds(links, selectedAction, activeHoverAction, featureIds);

  // Hiding Actions also clears action selection and map highlights.
  const setRightSidebarOpen = (open: boolean) => {
    setRightSidebarOpenState(open);
    if (!open) {
      setSelectedActionState(null);
      setHoverAction(null);
      setLinkingState(false);
    }
  };

  // Any feature selection reveals its details, including reselecting the same feature.
  const setSelectedFeature = (id: string | null) => {
    setSelectedFeatureState(id);
  };

  // Changes the tool and clears the selection unless the tool is the pointer.
  const setTool = (next: MapTool) => {
    setToolState(next);
    const nextSelected = selectedForTool(next, selectedFeature);
    if (nextSelected !== selectedFeature) setSelectedFeature(nextSelected);
  };

  // Selects an action and leaves link mode.
  const setSelectedAction = (id: number | null) => {
    setSelectedActionState(id);
    setLinkingState(false);
    if (id === null) setHoverAction(null);
  };

  // Turns link mode on for the selected action. Clears the feature selection first.
  const setLinking = (next: boolean) => {
    if (next && selectedAction === null) return;
    if (next) {
      setSelectedFeature(null);
      setToolState("pointer");
    }
    setLinkingState(next);
  };

  // Links or unlinks one feature on the selected action.
  const toggleLinkedFeature = (featureId: string) => {
    if (selectedAction === null) return;
    toggleActionFeature(selectedAction, featureId);
  };

  return (
    <MapContext.Provider
      value={{
        contextMenu,
        setContextMenu,
        leftSidebarOpen,
        setLeftSidebarOpen,
        rightSidebarOpen,
        setRightSidebarOpen,
        tool,
        setTool,
        features,
        insertFeature,
        updateFeature,
        deleteFeature,
        selectedFeature,
        setSelectedFeature,
        hoverFeature: activeHoverFeature,
        setHoverFeature,
        hoverAction: activeHoverAction,
        setHoverAction,
        deleteAction,
        actions,
        createAction,
        selectedAction,
        setSelectedAction,
        linking,
        setLinking,
        actionFeatureLinks: links,
        linkedFeatureIds: featureLinks,
        highlightedFeatureIds: highlightedLinks,
        toggleLinkedFeature,
      }}
    >
      <FeatureEditsProvider renameFeature={renameFeature} describeFeature={describeFeature} renameNewFeatureRef={renameNewFeatureRef}>
        <ActionEditsProvider renameAction={renameAction} describeAction={describeAction}>
          {children}
        </ActionEditsProvider>
      </FeatureEditsProvider>
    </MapContext.Provider>
  );
}

// The map context. Throws when used outside MapProvider.
export function useMap() {
  const value = useContext(MapContext);
  if (!value) {
    throw new Error("useMap must be used within MapProvider");
  }
  return value;
}
