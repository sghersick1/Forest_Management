"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "@/lib/auth/signup";

const initialState: SignUpState = { error: null };
const fieldClass =
  "template-body-large rounded-[6px] border border-border-map bg-surface-canvas px-4 py-4 text-text-primary outline-none";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="template-body-small flex flex-col gap-2 text-text-secondary">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </label>
      <label className="template-body-small flex flex-col gap-2 text-text-secondary">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>
      <label className="template-body-small flex flex-col gap-2 text-text-secondary">
        Confirm password
        <input
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>
      {state.error ? (
        <p className="template-body-small text-text-primary">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="template-title-medium mt-4 rounded-[6px] bg-text-primary px-4 py-4 text-surface-canvas disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
