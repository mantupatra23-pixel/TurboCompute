// src/api.js
import axios from "axios";
import { getToken, removeToken } from "./auth/auth";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // from .env
  timeout: 15000,
});

// attach token on requests
api.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// response interceptor to handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401) {
      removeToken(); // force logout on invalid token
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
