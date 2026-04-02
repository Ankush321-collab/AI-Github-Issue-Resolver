const TOKEN_KEY = 'auth_token';

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
};
