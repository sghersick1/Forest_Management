"use client";

/*
 * Name and description writes for a feature title or list row.
 * The pending id opens that title after a draw finishes.
 */

import { createContext, useContext, useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from "react";

type FeatureEdits = {
  renameFeature: (id: string, name: string) => void;
  describeFeature: (id: string, description: string) => void;
  renameNewFeature: string | null;
  setRenameNewFeature: (id: string | null) => void;
};

const FeatureEditsContext = createContext<FeatureEdits | null>(null);

// Feature title edits. The map calls the ref when a new polygon should be named.
export function FeatureEditsProvider({
  renameFeature,
  describeFeature,
  renameNewFeatureRef,
  children,
}: {
  renameFeature: (id: string, name: string) => void;
  describeFeature: (id: string, description: string) => void;
  renameNewFeatureRef: MutableRefObject<(id: string | null) => void>;
  children: ReactNode;
}) {
  const [renameNewFeature, setRenameNewFeature] = useState<string | null>(null);
  useEffect(() => {
    renameNewFeatureRef.current = setRenameNewFeature;
  }, [renameNewFeatureRef]);
  const value = useMemo(
    () => ({ renameFeature, describeFeature, renameNewFeature, setRenameNewFeature }),
    [renameFeature, describeFeature, renameNewFeature],
  );
  return <FeatureEditsContext.Provider value={value}>{children}</FeatureEditsContext.Provider>;
}

// Feature title edits. Throws when used outside FeatureEditsProvider.
export function useFeatureEdits() {
  const value = useContext(FeatureEditsContext);
  if (!value) throw new Error("useFeatureEdits must be used within FeatureEditsProvider");
  return value;
}
