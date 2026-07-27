import { getCreatorIdToken } from "./firebase-client";

export async function creatorAuthHeaders(): Promise<HeadersInit> {
  const token = await getCreatorIdToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function creatorFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const authHeaders = await creatorAuthHeaders();
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(authHeaders)) {
    if (typeof value === "string") headers.set(key, value);
  }
  return fetch(input, { ...init, headers });
}
