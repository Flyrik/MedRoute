import { NextRequest, NextResponse } from "next/server";

const MOCK_NOMS = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Durand", "Leroy"];
const MOCK_PRENOMS = ["Sophie", "Pierre", "Marie", "Jean", "Claire", "Paul", "Isabelle", "Marc"];
const RUES = ["de la Paix", "Victor Hugo", "de la République", "du Général de Gaulle", "Nationale", "de la Liberté"];

const CITY_COORDS: Record<string, [number, number]> = {
  paris: [2.3522, 48.8566],
  lyon: [4.8357, 45.764],
  marseille: [5.3698, 43.2965],
  toulouse: [1.4442, 43.6047],
  nice: [7.262, 43.7102],
  nantes: [-1.5534, 47.2184],
  bordeaux: [-0.5792, 44.8378],
  montpellier: [3.8767, 43.6109],
  strasbourg: [7.7521, 48.5734],
  lille: [3.0573, 50.6292],
  rennes: [-1.6778, 48.1173],
  grenoble: [5.7245, 45.1885],
  toulon: [5.9289, 43.1242],
};

function seededRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) / 0xffffffff);
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "Médecin généraliste";
  const city = searchParams.get("city") ?? "Paris";

  const cityKey = city.toLowerCase().trim();
  const [baseLng, baseLat] = CITY_COORDS[cityKey] ?? [2.3522, 48.8566];
  const rng = seededRng(`${type}${city}`);

  const praticiens = Array.from({ length: 10 }, (_, i) => {
    const nom = pick(rng, MOCK_NOMS);
    const prenom = pick(rng, MOCK_PRENOMS);
    const delai = Math.floor(rng() * 43) + 3;
    const secteur = rng() > 0.35 ? 2 : 1;
    const num = Math.floor(rng() * 149) + 1;
    const rue = pick(rng, RUES);
    return {
      id: `mock_${i.toString().padStart(3, "0")}`,
      nom: `Dr. ${prenom} ${nom}`,
      specialite: type,
      secteur,
      adresse: `${num} rue ${rue}, ${city}`,
      lat: baseLat + (rng() - 0.5) * 0.08,
      lng: baseLng + (rng() - 0.5) * 0.08,
      prochain_rdv: `2026-${String(Math.floor(rng() * 3) + 5).padStart(2, "0")}-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}`,
      delai_jours: delai,
    };
  }).sort((a, b) => a.delai_jours - b.delai_jours);

  return NextResponse.json({ praticiens, source: "mock" });
}
