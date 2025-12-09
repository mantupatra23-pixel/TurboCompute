const KEY = "tc_token";

export function saveToken(token) {
  localStorage.setItem(KEY, token);
}

export function getToken() {
  return localStorage.getItem(KEY);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

export function isLoggedIn() {
  return !!getToken();
}
