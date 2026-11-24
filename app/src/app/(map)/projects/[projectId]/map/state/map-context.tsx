"use client";

/*
 * Shared map state for the toolbar, sidebar, and sketch session.
 * Feature writes go through insert, update, and delete, one feature at a time.
 */

import { createContext, useContext, useState } from "react";
import type { GeoJSONStoreFeatures } from "terra-draw";
import type { ProjectAction } from "@/lib/actions/actions";
import type { OverviewField } from "../../plan/editable-project-overview";
import type { ProjectDocumentSection } from "@/lib/projects/project-document-sections";
import { updateProjectOverviewField } from "@/lib/projects/update-project-overview";
import { highlightedFeatureIds, linkedFeatureIds, type ActionFeatureLink } from "@/lib/actions/action-feature-links";
import { keptHoverId, keptSelectedId, selectedForTool } from "../sketch/kinds/polygon/hit";
import { useActionFeatures } from "../data/use-action-features";
import { useMapActions } from "../data/use-map-actions";
import { useMapFeatures } from "../data/use-map-features";

export type MapTool = "pointer" | "polygon" | "point";

export type MapMenu = { kind: "feature"; id: string; x: number; y: number } | { kind: "action"; id: number; x: number; y: number };

type MapContextValue = {
  projectId: number;
  projectTitle: string;
  canEditStands: boolean;
  overviewFields: OverviewField[];
  updateOverviewField: (key: OverviewField["key"], value: string) => Promise<void>;
  projectDocumentSections: ProjectDocumentSection[];
  setProjectDocumentSection: (section: ProjectDocumentSection) => void;
  wholeDocumentOpen: boolean;
  setWholeDocumentOpen: (open: boolean) => void;
  standDocuments: Record<string, unknown[]>;
  setStandDocument: (id: string, content: unknown[]) => void;
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
  renameFeature: (id: string, name: string) => void;
  describeFeature: (id: string, description: string) => void;
  renameNewFeature: string | null;
  setRenameNewFeature: (id: string | null) => void;
  selectedFeature: string | null;
  setSelectedFeature: (id: string | null) => void;
  hoverFeature: string | null;
  setHoverFeature: (id: string | null) => void;
  hoverAction: number | null;
  setHoverAction: (id: number | null) => void;
  actionFilterIds: string[];
  setActionFilterIds: (ids: string[]) => void;
  deleteAction: (id: number) => Promise<void>;
  actions: ProjectAction[];
  createAction: (featureId?: string) => Promise<void>;
  renameNewAction: number | null;
  setRenameNewAction: (id: number | null) => void;
  renameAction: (id: number, name: string) => void;
  describeAction: (id: number, description: string) => void;
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
  initialSelectedFeature = null,
  initialStandDocuments = {},
  canEditStands = false,
  initialOverviewFields = [],
  initialProjectDocumentSections = [],
  children,
}: {
  projectId: number;
  initialFeatures?: GeoJSONStoreFeatures[];
  initialActions?: ProjectAction[];
  initialActionFeatures?: ActionFeatureLink[];
  initialSelectedFeature?: string | null;
  initialStandDocuments?: Record<string, unknown[]>;
  canEditStands?: boolean;
  initialOverviewFields?: OverviewField[];
  initialProjectDocumentSections?: ProjectDocumentSection[];
  children: React.ReactNode;
}) {
  const [contextMenu, setContextMenu] = useState<MapMenu | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpenState] = useState(true);
  const [tool, setToolState] = useState<MapTool>("pointer");
  const [linking, setLinkingState] = useState(false);
  const [renameNewFeature, setRenameNewFeature] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeatureState] = useState<string | null>(initialSelectedFeature);
  const [standDocuments, setStandDocuments] = useState(initialStandDocuments);
  const [wholeDocumentOpen, setWholeDocumentOpen] = useState(false);
  const [overviewFields, setOverviewFields] = useState(initialOverviewFields);
  const [projectDocumentSections, setProjectDocumentSections] = useState(initialProjectDocumentSections);
  const [hoverFeature, setHoverFeature] = useState<string | null>(null);
  const [hoverAction, setHoverAction] = useState<number | null>(null);
  const [selectedAction, setSelectedActionState] = useState<number | null>(null);
  const [actionFilterIds, setActionFilterIds] = useState<string[]>([]);
  const [renameNewAction, setRenameNewAction] = useState<number | null>(null);
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
    setRenameNewFeature(id);
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
    setRenameNewAction(id);
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

  const setStandDocument = (id: string, content: unknown[]) => {
    setStandDocuments((current) => ({ ...current, [id]: content }));
  };

  const updateOverviewField = async (key: OverviewField["key"], value: string) => {
    const previous = overviewFields.find((field) => field.key === key)?.value ?? null;
    setOverviewFields((current) => current.map((field) => field.key === key ? { ...field, value } : field));
    try {
      await updateProjectOverviewField(projectId, key, value);
    } catch (error) {
      setOverviewFields((current) => current.map((field) => field.key === key && field.value === value ? { ...field, value: previous } : field));
      throw error;
    }
  };

  const setProjectDocumentSection = (section: ProjectDocumentSection) => {
    setProjectDocumentSections((current) => {
      const exists = current.some((item) => item.id === section.id);
      return exists
        ? current.map((item) => item.id === section.id ? section : item)
        : [...current, section];
    });
  };

  return (
    <MapContext.Provider
      value={{
        projectId,
        projectTitle: overviewFields.find((field) => field.key === "title")?.value || "Untitled",
        canEditStands,
        overviewFields,
        updateOverviewField,
        projectDocumentSections,
        setProjectDocumentSection,
        wholeDocumentOpen,
        setWholeDocumentOpen,
        standDocuments,
        setStandDocument,
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
        renameFeature,
        describeFeature,
        renameNewFeature,
        setRenameNewFeature,
        selectedFeature,
        setSelectedFeature,
        hoverFeature: activeHoverFeature,
        setHoverFeature,
        hoverAction: activeHoverAction,
        setHoverAction,
        actionFilterIds,
        setActionFilterIds,
        deleteAction,
        actions,
        createAction,
        renameNewAction,
        setRenameNewAction,
        renameAction,
        describeAction,
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
      {children}
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
