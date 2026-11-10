import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <h1 className="template-title-large">Forest Management</h1>
      <Link href="/auth/login" className="template-body-medium-link">
        Sign in
      </Link>
      <Link href="/projects" className="template-body-medium-link">
        Projects
      </Link>
    </main>
  );
}
