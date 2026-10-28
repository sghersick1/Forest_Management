import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Forest Management</h1>
      <Link href="/login" className="underline">
        Sign in
      </Link>
      <Link href="/projects" className="underline">
        Projects
      </Link>
    </main>
  );
}
