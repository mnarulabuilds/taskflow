'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { CardDescription, CardTitle, cardClasses } from '@/components/ui/card';
import { DashboardSkeleton } from '@/components/skeleton';
import { useFavorites } from '@/hooks/use-queries';
import { useAuth } from '@/providers/auth-provider';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const favoritesQuery = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || favoritesQuery.isLoading) {
    return (
      <AppShell breadcrumbs={[{ label: 'Favorites' }]}>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  const favorites = favoritesQuery.data ?? [];

  return (
    <AppShell breadcrumbs={[{ label: 'Favorites' }]}>
      <h1 className="text-3xl font-bold text-foreground">Favorites</h1>
      <p className="mt-1 text-muted">Your starred projects.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => (
          <Link
            key={favorite.id}
            href={`/projects/${favorite.project.id}`}
            className={cardClasses(true)}
          >
            <CardTitle className="text-base">{favorite.project.name}</CardTitle>
            {favorite.project.workspace && (
              <CardDescription className="mt-2">
                {favorite.project.workspace.name}
              </CardDescription>
            )}
            {favorite.project._count && (
              <CardDescription className="mt-4">
                {favorite.project._count.tasks} tasks
              </CardDescription>
            )}
          </Link>
        ))}
      </div>

      {favorites.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-muted">
          Star projects from the project board to see them here.
        </p>
      )}
    </AppShell>
  );
}
