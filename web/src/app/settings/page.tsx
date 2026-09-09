'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app-shell';
import { LoadingScreen } from '@/components/loading-screen';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/providers/theme-provider';
import {
  usePreferences,
  useProfile,
  useUpdatePreferences,
} from '@/hooks/use-queries';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { UserPreferences } from '@/types/user';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const profileQuery = useProfile();
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const nameId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();

  const [name, setName] = useState('');
  const profileName = profileQuery.data?.name ?? '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await api('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: (name || profileName).trim() }),
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Profile updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      await api('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to change password');
    } finally {
      setSavingPassword(false);
    }
  }

  async function updateNotificationPrefs(
    key: keyof UserPreferences,
    value: boolean,
  ) {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      showToast('Preferences saved', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to save preferences',
      );
    }
  }

  if (authLoading || profileQuery.isLoading || preferencesQuery.isLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  const preferences = preferencesQuery.data;

  return (
    <AppShell breadcrumbs={[{ label: 'Settings' }]}>
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      <p className="mt-1 text-muted">Manage your profile and preferences.</p>

      <div className="mt-8 space-y-8">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4 max-w-md">
            <div>
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={name || profileName}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
              />
            </div>
            <p className="text-sm text-muted">Email: {user?.email}</p>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Change password</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-4 max-w-md">
            <div>
              <Label htmlFor={currentPasswordId}>Current password</Label>
              <Input
                id={currentPasswordId}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor={newPasswordId}>New password</Label>
              <Input
                id={newPasswordId}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Theme</h2>
          <div className="mt-4">
            <ThemeToggle className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          </div>
        </section>

        {preferences && (
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Notification preferences
            </h2>
            <ul className="mt-4 space-y-3">
              {(
                [
                  ['notifyTaskAssigned', 'Task assigned to me'],
                  ['notifyTaskComment', 'Comments on my tasks'],
                  ['notifyDueSoon', 'Tasks due soon'],
                  ['notifyInvite', 'Workspace invites'],
                  ['notifyMention', '@mentions in comments'],
                ] as const
              ).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) =>
                      updateNotificationPrefs(key, event.target.checked)
                    }
                    aria-label={label}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
