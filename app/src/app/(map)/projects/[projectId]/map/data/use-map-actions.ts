"use client";

/*
 * Action list for one project.
 * A finished rename or description writes that one action row.
 */

import { useCallback, useRef, useState } from "react";
import type { ProjectAction } from "@/lib/actions/actions";
import type { ActionStatus } from "@/lib/actions/action-status";
import { deleteProjectAction, createProjectAction, describeProjectAction, renameProjectAction, statusProjectAction } from "@/lib/actions/update-action";

// Holds the action list and queues one row write after each finished change.
export function useMapActions(projectId: number, initialActions: ProjectAction[]) {
  const [actions, setActions] = useState(initialActions);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const saveQueue = useRef(Promise.resolve());

  // Renames one action and writes that name.
  const renameAction = useCallback((id: number, name: string) => {
    const nextName = name.trim();
    if (nextName === "") return;
    const current = actionsRef.current.find((action) => action.id === id);
    if (!current || current.name === nextName) return;
    const next = replaceAction(actionsRef.current, id, { name: nextName });
    actionsRef.current = next;
    setActions(next);
    enqueue(saveQueue, () => renameProjectAction(projectId, id, nextName));
  }, [projectId]);

  // Sets one action description and writes that text.
  const describeAction = useCallback((id: number, description: string) => {
    const nextDescription = description.trim();
    const current = actionsRef.current.find((action) => action.id === id);
    if (!current || current.description === nextDescription) return;
    const next = replaceAction(actionsRef.current, id, { description: nextDescription });
    actionsRef.current = next;
    setActions(next);
    enqueue(saveQueue, () => describeProjectAction(projectId, id, nextDescription));
  }, [projectId]);

  // Sets one action status and writes that value. Available to every member.
  const setStatusAction = useCallback((id: number, status: ActionStatus) => {
    const current = actionsRef.current.find((action) => action.id === id);
    if (!current || current.status === status) return;
    const next = replaceAction(actionsRef.current, id, { status });
    actionsRef.current = next;
    setActions(next);
    enqueue(saveQueue, () => statusProjectAction(projectId, id, status));
  }, [projectId]);

  const createAction = useCallback(async () => {
    const action = await createProjectAction(projectId);
    const next = [...actionsRef.current, action];
    actionsRef.current = next;
    setActions(next);
    return action.id;
  }, [projectId]);

  const deleteAction = useCallback(async (id: number) => {
    await saveQueue.current;
    await deleteProjectAction(projectId, id);
    const next = actionsRef.current.filter((action) => action.id !== id);
    actionsRef.current = next;
    setActions(next);
  }, [projectId]);

  return { actions, renameAction, describeAction, setStatusAction, createAction, deleteAction };
}

function replaceAction(
  actions: ProjectAction[],
  id: number,
  patch: Partial<Pick<ProjectAction, "name" | "description" | "status">>,
) {
  const editedAt = new Date().toISOString();
  return actions.map((action) => (action.id === id ? { ...action, ...patch, editedAt } : action));
}

// Runs action writes one after another.
function enqueue(
  saveQueue: { current: Promise<void> },
  write: () => Promise<void>,
) {
  saveQueue.current = saveQueue.current
    .catch(() => undefined)
    .then(write)
    .catch((error: unknown) => {
      console.error(error);
    });
}
