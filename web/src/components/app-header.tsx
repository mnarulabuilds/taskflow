'use client';

interface AppHeaderProps {
  email?: string;
  onLogout: () => void;
}

export function AppHeader({ email, onLogout }: AppHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <a href="/dashboard" className="text-xl font-semibold">
          TaskFlow
        </a>

        <div className="flex items-center gap-4">
          {email && <span className="text-sm text-gray-600">{email}</span>}
          <button
            onClick={onLogout}
            className="rounded border px-4 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
