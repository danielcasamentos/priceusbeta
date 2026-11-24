export interface BaseLocationInfo {
  city: string;
  stateName: string;
  stateCode: string;
  countryName: string;
  countryCode: string;
  lat: number;
  lon: number;
}

export interface NearbyCityCandidate {
  name: string;
  stateCode?: string;
  distanceKm: number;
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
}

export function suggestDisplacementFee(
  distanceKm: number,
  freeRadiusKm: number,
  pricePerKm: number,
  roundTrip = true
): number {
  if (distanceKm <= freeRadiusKm) return 0;
  const billableKm = Math.max(0, distanceKm - freeRadiusKm);
  const factor = roundTrip ? 2 : 1;
  const raw = billableKm * pricePerKm * factor;
  return Math.round(raw / 5) * 5;
}

export function getBrowserCoordinates(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Permissão de localização negada. Você pode buscar sua cidade manualmente abaixo.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Tempo esgotado ao obter localização. Tente buscar sua cidade manualmente.'));
        } else {
          reject(new Error('Não foi possível detectar sua localização atual.'));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function parseStateCodeFromAddress(address: Record<string, any>): string {
  const iso = address['ISO3166-2-lvl4'] || address['ISO3166-2-lvl6'] || '';
  if (typeof iso === 'string' && iso.includes('-')) {
    return iso.split('-').pop()!.toUpperCase();
  }
  const state = String(address.state || '').trim();
  return state ? state.slice(0, 2).toUpperCase() : 'UF';
}

export async function reverseGeocodeNominatim(
  lat: number,
  lon: number
): Promise<BaseLocationInfo> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt-BR`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Falha ao identificar cidade pela localização.');
  }
  const data = await res.json();
  const addr = data.address || {};

  const city =
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.village ||
    addr.county ||
    'Cidade Base';
  const stateName = addr.state || addr.region || 'Estado';
  const stateCode = parseStateCodeFromAddress(addr);
  const countryName = addr.country || 'Brasil';
  const countryCode = String(addr.country_code || 'BR').toUpperCase();

  return {
    city,
    stateName,
    stateCode,
    countryName,
    countryCode,
    lat,
    lon,
  };
}

export async function searchCityNominatim(
  query: string
): Promise<BaseLocationInfo[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
    trimmed
  )}&accept-language=pt-BR`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Falha ao buscar cidade.');
  }
  const list = await res.json();
  if (!Array.isArray(list)) return [];

  return list.map((item: any) => {
    const addr = item.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.village ||
      item.name ||
      trimmed;
    return {
      city,
      stateName: addr.state || addr.region || 'Estado',
      stateCode: parseStateCodeFromAddress(addr),
      countryName: addr.country || 'Brasil',
      countryCode: String(addr.country_code || 'BR').toUpperCase(),
      lat: Number(item.lat),
      lon: Number(item.lon),
    };
  });
}

export async function fetchNearbyCitiesOverpass(
  lat: number,
  lon: number,
  radiusKm: number,
  baseCityName?: string
): Promise<NearbyCityCandidate[]> {
  const radiusMeters = Math.max(5000, Math.min(300000, Math.round(radiusKm * 1000)));
  const overpassQuery = `
[out:json][timeout:18];
(
  node["place"~"^(city|town)$"](around:${radiusMeters},${lat},${lon});
);
out body;
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!res.ok) {
    throw new Error('Serviço gratuito de mapa temporariamente ocupado. Tente novamente em alguns segundos.');
  }

  const data = await res.json();
  const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];

  const seen = new Set<string>();
  const baseNormalized = (baseCityName || '').trim().toLowerCase();
  const results: NearbyCityCandidate[] = [];

  for (const el of elements) {
    const name = String(el?.tags?.name || '').trim();
    if (!name) continue;
    const norm = name.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);

    const elLat = Number(el.lat);
    const elLon = Number(el.lon);
    if (!Number.isFinite(elLat) || !Number.isFinite(elLon)) continue;

    const distanceKm =
      norm === baseNormalized ? 0 : calculateHaversineKm(lat, lon, elLat, elLon);

    results.push({
      name,
      stateCode: el?.tags?.['is_in:state_code'] || undefined,
      distanceKm,
      lat: elLat,
      lon: elLon,
    });
  }

  if (baseCityName && !seen.has(baseNormalized)) {
    results.unshift({
      name: baseCityName,
      distanceKm: 0,
      lat,
      lon,
    });
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

