export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('accessToken');
}

export function removeAccessToken() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
}