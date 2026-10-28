"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";

const initialState: SignInState = { error: null };

const fieldClass =
  "rounded-[6px] border border-[rgba(120,120,120,0.2)] bg-white px-4 py-4 text-base leading-6 tracking-[0.15px] text-black outline-none";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-xs leading-4 tracking-[0.4px] text-[#86868b]">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-xs leading-4 tracking-[0.4px] text-[#86868b]">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </label>
      {state.error ? (
        <p className="text-xs leading-4 tracking-[0.4px] text-black">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-[6px] bg-black px-4 py-4 text-base leading-6 font-medium tracking-[0.15px] text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
