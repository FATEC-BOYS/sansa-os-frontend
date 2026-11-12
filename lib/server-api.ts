import "server-only";

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.SANSA_BACKEND_URL ?? "http://127.0.0.1:3333";
  const key = process.env.SANSA_API_KEY;
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("Configure SANSA_API_KEY em .env.local para conectar o backend.");
  }
  const headers = new Headers(init?.headers);
  headers.set("x-api-key", key);
  headers.set("content-type", "application/json");
  return fetch(new URL(path, base), {...init,headers,cache:"no-store"});
}
