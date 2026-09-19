import { API_BASE } from "./config";
export function getThemeImageFullUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const api = new URL(API_BASE, window.location.origin);
    const image = new URL(value, api.origin);
    return ["http:", "https:"].includes(image.protocol) ? image.href : null;
  } catch { return null; }
}
