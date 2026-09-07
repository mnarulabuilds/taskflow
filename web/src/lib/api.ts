const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type ApiOptions = RequestInit & {
  token?: string;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
  retried = false,
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (
    response.status === 401 &&
    !retried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh')
  ) {
    const refreshed = await tryRefreshSession();

    if (refreshed) {
      return api<T>(path, options, true);
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1';
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message =
      typeof error?.message === 'string'
        ? error.message
        : Array.isArray(error?.message)
          ? error.message.join(', ')
          : `Request failed: ${response.status}`;

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
