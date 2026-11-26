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

function isInviteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ShareDialog({
  projectId,
  currentEmail,
  onClose,
  tone = "dark",
}: {
  projectId: number;
  currentEmail: string;
  onClose: () => void;
  tone?: "dark" | "light";
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
  const inviteReady = isInviteEmail(email);
  const light = tone === "light";
  const ink = light ? "text-text-primary" : "text-surface-canvas";

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isInviteEmail(email)) {
      return;
    }

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
      className={`fixed inset-auto top-1/2 left-1/2 m-0 w-[min(100%-2rem,400px)] -translate-x-1/2 -translate-y-1/2 overflow-visible! rounded-[16px] p-0 backdrop:bg-black/20 ${light ? "border border-border-map bg-surface-canvas text-text-primary shadow-[0_8px_24px_rgb(0_0_0/0.12)]" : "border-0 bg-text-primary text-surface-canvas"}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-map px-4 py-2">
        <h2
          id="share-heading"
          className="template-body-small min-w-0 truncate"
        >
          {title ? `Share "${title}"` : "Share"}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        >
          <img src="/icons/map/close-outline.svg" alt="" width={18} height={18} />
        </button>
      </div>
      <form
        className="flex flex-col gap-2 border-b border-border-map px-4 py-4"
        onSubmit={(event) => void onInvite(event)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 min-w-0 flex-1 items-center rounded-[4px] bg-surface-translucent-placeholder focus-within:outline-1 focus-within:outline-border-selected">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoFocus
              required
              className={`template-body-small h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-text-secondary ${ink}`}
            />
            {showInviteRole ? (
              <RoleMenu
                role={inviteRoles.includes(inviteRole) ? inviteRole : "viewer"}
                pending={false}
                open={openMenu === "invite"}
                onToggle={() =>
                  setOpenMenu((current) => (current === "invite" ? null : "invite"))
                }
                onClose={() => setOpenMenu(null)}
                onSelect={(next) => {
                  setInviteRole(next);
                  setOpenMenu(null);
                }}
                ink={ink}
                roles={inviteRoles}
                boxed
              />
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!inviteReady || inviting || loading}
            className={`template-body-small h-8 shrink-0 rounded-[4px] px-3 ${
              inviteReady
                ? "cursor-pointer bg-border-selected text-white hover:bg-[color-mix(in_srgb,var(--border-selected)_85%,black)] disabled:cursor-default disabled:opacity-40"
                : "cursor-default bg-text-secondary text-white"
            }`}
          >
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
        {inviteError ? (
          <p className={`template-body-small ${ink}`}>{inviteError}</p>
        ) : null}
        {inviteNotice ? (
          <p className="template-body-small text-text-secondary">{inviteNotice}</p>
        ) : null}
      </form>
      <h3 className="template-label-xs px-4 pt-4 pb-2 text-text-secondary">
        Who has access
      </h3>
      {loading ? (
        <p className="template-body-small px-4 pb-4 text-text-secondary">
          Loading…
        </p>
      ) : null}
      {error ? (
        <p className={`template-body-small px-4 pb-4 ${ink}`}>
          {error}
        </p>
      ) : null}
      {roleError ? (
        <p className={`template-body-small px-4 pb-2 ${ink}`}>
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
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-header font-sans text-[10px] leading-none font-medium text-white"
                >
                  {memberLabel(member.name, member.email).slice(0, 1).toUpperCase()}
                </span>
                <span className="template-body-small min-w-0 flex-1 truncate">
                  {memberLabel(member.name, member.email)}
                  {yours ? (
                    <span className="text-text-secondary"> (you)</span>
                  ) : null}
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
                    ink={ink}
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
  ink,
  roles = menuRoles,
  boxed = false,
}: {
  role: ProjectRole;
  pending: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (role: ProjectRole) => void;
  ink: string;
  roles?: ProjectRole[];
  boxed?: boolean;
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
    <div ref={rootRef} className={`relative shrink-0 ${boxed ? "mr-1" : ""}`}>
      <button
        type="button"
        aria-label="Permission"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        disabled={pending}
        onClick={onToggle}
        className={`template-body-small flex cursor-pointer items-center gap-1 disabled:cursor-default disabled:opacity-40 ${ink} ${
          boxed
            ? "h-6 rounded-[4px] border border-border-map bg-surface-canvas px-1.5"
            : "h-full bg-transparent px-1.5"
        }`}
      >
        {pending ? "Saving…" : roleLabel[role]}
        <Chevron />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+4px)] right-0 z-10 min-w-32 rounded-[8px] border border-border-map bg-surface-canvas p-1 text-text-primary shadow-lg"
        >
          {roles.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              onClick={() => onSelect(option)}
              className={`template-body-small block w-full cursor-pointer rounded-[4px] px-2 py-1 text-left text-text-primary hover:bg-surface-translucent-placeholder-2 ${
                option === role ? "bg-surface-translucent-placeholder-2" : ""
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
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="size-3 shrink-0 text-text-secondary"
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

