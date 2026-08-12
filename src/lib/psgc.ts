// src/lib/psgc.ts

export interface PsgcItem {
  code: string;
  name: string;
}

export async function fetchProvinces(): Promise<PsgcItem[]> {
  const res = await fetch("https://psgc.gitlab.io/api/provinces/");
  if (!res.ok) throw new Error("Failed to fetch provinces");
  const data = await res.json();
  return (data as PsgcItem[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCities(provinceCode: string): Promise<PsgcItem[]> {
  if (!provinceCode) return [];
  const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
  if (!res.ok) throw new Error("Failed to fetch cities");
  const data = await res.json();
  return (data as PsgcItem[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchBarangays(cityCode: string): Promise<PsgcItem[]> {
  if (!cityCode) return [];
  const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
  if (!res.ok) throw new Error("Failed to fetch barangays");
  const data = await res.json();
  return (data as PsgcItem[]).sort((a, b) => a.name.localeCompare(b.name));
}
