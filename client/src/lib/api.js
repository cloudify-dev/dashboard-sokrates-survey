export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Gagal memuat ${url}`);
  }
  return res.json();
}

export function tenantQuery(selected) {
  if (!selected.length) return "";
  return `?tenants=${encodeURIComponent(selected.join("|"))}`;
}
