const STORAGE_KEY = "ukelele_anon_id";

export function getAnonId(): string {
  if (typeof window === "undefined") {
    throw new Error("getAnonId() must only be called in client-side code");
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
