export const API = "/__local/investigations";

export async function request(path, options) {
  if (!import.meta.env.DEV) throw new Error("Investigation processing needs the configured local worker or a deployed investigation service. This build has no production worker connection.");
  const response = await fetch(`${API}${path}`, { ...options, headers: options?.body ? { "Content-Type": "application/json" } : undefined });
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("The investigation worker is unavailable. Start the configured local development server.");
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status})`), { status: response.status });
  return data;
}

// Sends one file as raw bytes; the server reads it (or, for images, has a vision model describe it) and adds it to the run's sources.
export async function uploadFile(id, file) {
  if (!import.meta.env.DEV) throw new Error("Uploading needs the configured local worker. This build has no production worker connection.");
  const response = await fetch(`${API}/upload/${id}?name=${encodeURIComponent(file.name)}`, { method: "POST", body: file, headers: { "Content-Type": "application/octet-stream" } });
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("The investigation worker is unavailable. Start the configured local development server.");
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || `Upload failed (${response.status})`), { status: response.status });
  return data;
}

export const ACCEPTED_FILES = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.csv,.json,.txt,.md";
export const fileSize = (bytes) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);
