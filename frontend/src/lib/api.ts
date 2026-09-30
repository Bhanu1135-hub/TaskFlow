import { supabase } from "@/lib/supabase";

const apiBaseUrl = (import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000").replace(/\/$/, "");

type ApiError = { detail?: string };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Your session has expired. Please sign in again.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "detail" in payload
      ? (payload as ApiError).detail
      : undefined;
    throw new Error(detail ?? `API request failed with status ${response.status}.`);
  }

  return payload as T;
}
