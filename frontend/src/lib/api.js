// src/lib/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Accept": "application/json",
  },
});

// Response interceptor (optional: centralize error handling)
api.interceptors.response.use(
  res => res,
  err => {
    // You can customize error handling/logging here
    return Promise.reject(err);
  }
);

export default api;
