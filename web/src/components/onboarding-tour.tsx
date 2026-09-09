'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useUpdatePreferences, usePreferences } from '@/hooks/use-queries';

const STEPS = [
  {
    title: 'Welcome to TaskFlow',
    body: 'Organize work across workspaces, projects, and tasks.',
  },
  {
    title: 'Navigate quickly',
    body: 'Use the sidebar for Dashboard, My Tasks, and Favorites. Press ⌘K for the command palette.',
  },
  {
    title: 'Manage tasks your way',
    body: 'Switch between Kanban, List, and Calendar views on any project board.',
  },
  {
    title: 'Stay in sync',
    body: 'Drag tasks between columns, set due dates, and get notified when things change.',
  },
];

export function OnboardingTour() {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const shouldShow =
    preferencesQuery.isSuccess &&
    preferencesQuery.data &&
    !preferencesQuery.data.onboardingCompleted;
  const visible = shouldShow && !dismissed;

  if (!visible || !preferencesQuery.data) {
    return null;
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function complete() {
    await updatePreferences.mutateAsync({ onboardingCompleted: true });
    setDismissed(true);
  }

  function next() {
    if (isLast) {
      complete();
      return;
    }
    setStep((currentStep) => currentStep + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-bold text-foreground">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-muted">{current.body}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDismissed(true);
              complete();
            }}
          >
            Skip tour
          </Button>
          <Button size="sm" onClick={next}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
