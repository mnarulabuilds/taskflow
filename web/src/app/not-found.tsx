import Link from 'next/link';

import { buttonLinkClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8">
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <Link href="/dashboard" className={buttonLinkClasses('primary')}>
        Go to dashboard
      </Link>
    </main>
  );
}
