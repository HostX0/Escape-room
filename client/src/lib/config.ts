const configured = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE = configured ? configured.replace(/\/$/, "") : "/api/v1";
