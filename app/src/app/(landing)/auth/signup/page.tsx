import { SignUpForm } from "./sign-up-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col bg-surface-canvas px-8 py-16 text-text-primary">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <h1 className="template-title-large">Create an account</h1>
        <SignUpForm />
      </div>
    </main>
  );
}
