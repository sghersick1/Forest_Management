import { SignInForm } from "./sign-in-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col bg-surface-canvas px-8 py-16 text-text-primary">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <h1 className="template-title-large">Sign in</h1>
        <SignInForm />
      </div>
    </main>
  );
}
