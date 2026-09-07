import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">TaskFlow</h1>
        <p className="mt-4 text-lg text-gray-600">
          Organize work across workspaces, projects, and kanban boards.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded bg-black px-6 py-3 text-sm font-medium text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded border px-6 py-3 text-sm font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
