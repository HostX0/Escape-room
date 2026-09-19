import axios, { type AxiosError } from "axios";
import { API_BASE } from "../lib/config";

const getUserToken = (): string | null => {
  try {
    return localStorage.getItem("user_token") ?? null;
  } catch {
    return null;
  }
};

const getStaffToken = (): string | null => {
  try {
    return localStorage.getItem("staff_token") ?? null;
  } catch {
    return null;
  }
};

const baseConfig = {
  baseURL: API_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
};

export const publicApi = axios.create(baseConfig);
export const userApi = axios.create(baseConfig);
export const staffApi = axios.create(baseConfig);

userApi.interceptors.request.use((config) => {
  var token = getUserToken();
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

staffApi.interceptors.request.use((config) => {
  var token = getStaffToken();
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

function handleTokenExpiry(type: "user" | "staff") {
  try {
    if (type === "user") {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      return;
    }
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_data");
    if (!window.location.pathname.startsWith("/staff/login")) {
      window.location.href = "/staff/login";
    }
  } catch {
    // ignore storage/navigation failures in non-browser contexts
  }
}

userApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && getUserToken()) {
      handleTokenExpiry("user");
    }
    return Promise.reject(error);
  },
);

staffApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && getStaffToken()) {
      handleTokenExpiry("staff");
    }
    return Promise.reject(error);
  },
);

export function getApiMessage(err: unknown): string {
  const ax = err as AxiosError<{ message?: string }>;
  const msg = ax.response?.data?.message;
  if (typeof msg === "string") return msg;
  return ax.message || "Something went wrong";
}

export function isAuthError(err: unknown): boolean {
  const ax = err as AxiosError;
  const status = ax.response?.status;
  return status === 401 || status === 403;
}
