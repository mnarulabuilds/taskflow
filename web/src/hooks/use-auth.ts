'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { logout as logoutRequest } from '@/lib/auth';
import { User } from '@/types/user';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await api<User>('/auth/me');
      setUser(currentUser);
    } catch {
      setUser(null);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  return { user, loading, logout, reload: loadUser };
}
