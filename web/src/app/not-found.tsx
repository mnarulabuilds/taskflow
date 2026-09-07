import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-gray-600">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="rounded bg-black px-4 py-2 text-sm text-white">
        Go to dashboard
      </Link>
    </main>
  );
}
