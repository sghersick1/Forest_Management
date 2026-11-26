"use client";

/*
 * Name and description writes for the open action.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

type ActionEdits = {
  renameAction: (id: number, name: string) => void;
  describeAction: (id: number, description: string) => void;
};

const ActionEditsContext = createContext<ActionEdits | null>(null);

// Action field edits for the actions sidebar.
export function ActionEditsProvider({
  renameAction,
  describeAction,
  children,
}: {
  renameAction: (id: number, name: string) => void;
  describeAction: (id: number, description: string) => void;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ renameAction, describeAction }), [renameAction, describeAction]);
  return <ActionEditsContext.Provider value={value}>{children}</ActionEditsContext.Provider>;
}

// Action field edits. Throws when used outside ActionEditsProvider.
export function useActionEdits() {
  const value = useContext(ActionEditsContext);
  if (!value) throw new Error("useActionEdits must be used within ActionEditsProvider");
  return value;
}
