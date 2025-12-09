// src/auth/auth.js
const TOKEN_KEY = "tc_token";

export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();
