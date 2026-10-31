"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { inviteToProject } from "@/lib/projects/invite-to-project";
import { loadProjectMembers } from "@/lib/projects/load-project-members";
import { loadProjectTitle } from "@/lib/projects/load-project-title";
import {
  canChangeMemberRole,
  memberLabel,
  type ProjectMember,
} from "@/lib/projects/project-members";
import type { ProjectRole } from "@/lib/projects/projects";

const roleLabel: Record<ProjectRole, string> = {
  owner: "owner",
  editor: "can edit",
  viewer: "can view",
};

const menuRoles: ProjectRole[] = ["editor", "viewer"];

export function ShareDialog({
  projectId,
  currentEmail,
  onClose,
}: {
  projectId: number;
  currentEmail: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const currentRole = members.find(
    (member) => member.email.toLowerCase() === currentEmail.toLowerCase(),
  )?.role;
  const canChangeRoles = currentRole === "owner" || currentRole === "editor";
  const inviteRoles: ProjectRole[] = canChangeRoles
    ? ["editor", "viewer"]
    : ["viewer"];
  const showInviteRole = email.trim().length > 0 && inviteRoles.length > 1;

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError(null);
    setInviteNotice(null);
    setInviting(true);
    const result = await inviteToProject(projectId, email, inviteRole);
    setInviting(false);
    if (result.error) {
      setInviteError(result.error);
      return;
    }

    setEmail("");
    if (result.status === "member") {
      setInviteNotice("Added to the project.");
      const loaded = await loadProjectMembers(projectId);
      setMembers(loaded.members);
      setError(loaded.error);
      return;
    }

    setInviteNotice("Invitation sent.");
  }

  async function onRoleSelect(member: ProjectMember, next: ProjectRole) {
    setOpenMenu(null);
    if (next === member.role) {
      return;
    }

    setRoleError(null);
    setSavingId(member.userId);
    const result = await inviteToProject(projectId, member.email, next);
    setSavingId(null);
    if (result.error) {
      setRoleError(result.error);
      return;
    }

    setMembers((current) =>
      current.map((row) =>
        row.userId === member.userId ? { ...row, role: next } : row,
      ),
    );
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadProjectMembers(projectId).then((result) => {
      if (cancelled) {
        return;
      }

      setMembers(result.members);
      setError(result.error);
      setLoading(false);
    });

    void loadProjectTitle(projectId).then((result) => {
      if (!cancelled) {
        setTitle(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-heading"
      onClose={onClose}
      onCancel={(event) => {
        if (openMenu !== null) {
          event.preventDefault();
          setOpenMenu(null);
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current.close();
        }
      }}
      className="fixed inset-auto top-1/2 left-1/2 m-0 w-[min(100%-2rem,400px)] -translate-x-1/2 -translate-y-1/2 overflow-visible! rounded-[16px] border-0 bg-text-primary p-0 text-surface-canvas backdrop:bg-black/20"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-map px-4 py-2">
        <h2
          id="share-heading"
          className="template-body-medium-emphasized min-w-0 truncate"
        >
          {title ? `Share ${title}` : "Share"}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="flex size-8 cursor-pointer items-center justify-center bg-transparent text-surface-canvas"
        >
          <CloseIcon />
        </button>
      </div>
      <form
        className="flex flex-col gap-2 border-b border-border-map px-4 py-4"
        onSubmit={(event) => void onInvite(event)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 min-w-0 flex-1 items-center rounded-[4px] bg-surface-translucent-placeholder">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoFocus
              required
              className="template-body-small h-full min-w-0 flex-1 bg-transparent px-2 text-surface-canvas outline-none placeholder:text-text-secondary"
            />
            {showInviteRole ? (
              <select
                aria-label="Permission"
                value={inviteRoles.includes(inviteRole) ? inviteRole : "viewer"}
                onChange={(event) =>
                  setInviteRole(event.target.value as ProjectRole)
                }
                className="template-body-small h-full shrink-0 cursor-pointer bg-transparent pr-1 text-surface-canvas outline-none"
              >
                {inviteRoles.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel[option]}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={inviting || loading}
            className="template-body-small h-8 shrink-0 cursor-pointer rounded-[4px] bg-surface-header px-2 text-white disabled:cursor-default disabled:opacity-40"
          >
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
        {inviteError ? (
          <p className="template-body-small text-surface-canvas">{inviteError}</p>
        ) : null}
        {inviteNotice ? (
          <p className="template-body-small text-text-secondary">{inviteNotice}</p>
        ) : null}
      </form>
      <h3 className="template-body-medium px-4 pt-4 pb-2 text-text-secondary">
        Who has access
      </h3>
      {loading ? (
        <p className="template-body-small px-4 pb-4 text-text-secondary">
          Loading…
        </p>
      ) : null}
      {error ? (
        <p className="template-body-small px-4 pb-4 text-surface-canvas">
          {error}
        </p>
      ) : null}
      {roleError ? (
        <p className="template-body-small px-4 pb-2 text-surface-canvas">
          {roleError}
        </p>
      ) : null}
      {loading || error ? null : (
        <ul className="px-4 pb-2">
          {members.map((member) => {
            const yours =
              member.email.toLowerCase() === currentEmail.toLowerCase();
            const canChange = canChangeMemberRole(
              currentRole,
              member.role,
              yours,
            );

            return (
              <li
                key={member.userId}
                className="flex items-center gap-2 py-2"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-header font-sans text-[12px] leading-4 font-medium text-white"
                >
                  {memberLabel(member.name, member.email).slice(0, 1).toUpperCase()}
                </span>
                <span className="template-body-medium min-w-0 flex-1 truncate">
                  {memberLabel(member.name, member.email)}
                  {yours ? " (you)" : ""}
                </span>
                {canChange ? (
                  <RoleMenu
                    role={member.role}
                    pending={savingId === member.userId}
                    open={openMenu === member.userId}
                    onToggle={() =>
                      setOpenMenu((current) =>
                        current === member.userId ? null : member.userId,
                      )
                    }
                    onClose={() => setOpenMenu(null)}
                    onSelect={(next) => void onRoleSelect(member, next)}
                  />
                ) : (
                  <span className="template-body-small shrink-0">
                    {roleLabel[member.role]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </dialog>
  );
}

function RoleMenu({
  role,
  pending,
  open,
  onToggle,
  onClose,
  onSelect,
}: {
  role: ProjectRole;
  pending: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (role: ProjectRole) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={pending}
        onClick={onToggle}
        className="template-body-small flex cursor-pointer items-center gap-2 bg-transparent text-surface-canvas disabled:cursor-default disabled:opacity-40"
      >
        {pending ? "Saving…" : roleLabel[role]}
        <Chevron />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+4px)] right-0 z-10 min-w-32 rounded-[8px] border border-border-map bg-surface-canvas p-1 text-text-primary"
        >
          {menuRoles.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              onClick={() => onSelect(option)}
              className={`template-body-small block w-full cursor-pointer rounded-[4px] px-2 py-2 text-left ${
                option === role
                  ? "bg-surface-translucent-placeholder"
                  : "bg-transparent"
              }`}
            >
              {roleLabel[option]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      width="6"
      height="3"
      viewBox="0 0 6 3"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M0.125526 0.109835C0.292893 -0.0366117 0.56425 -0.0366117 0.731617 0.109835L3 2.09467L5.26838 0.109835C5.43575 -0.0366117 5.70711 -0.0366117 5.87447 0.109835C6.04184 0.256282 6.04184 0.493718 5.87447 0.640165L3.30305 2.89017C3.13568 3.03661 2.86432 3.03661 2.69695 2.89017L0.125526 0.640165C-0.0418419 0.493718 -0.0418419 0.256282 0.125526 0.109835Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
