const KEY = 'promo_session_token';

export const getToken   = ()      => localStorage.getItem(KEY);
export const setToken   = (token) => localStorage.setItem(KEY, token);
export const clearToken = ()      => localStorage.removeItem(KEY);
export const isLoggedIn = ()      => Boolean(getToken());
