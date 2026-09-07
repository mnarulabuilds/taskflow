import { api } from '@/lib/api';

export async function logout() {
  await api('/auth/logout', { method: 'POST' });
}
