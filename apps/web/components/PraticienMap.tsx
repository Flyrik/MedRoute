"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Praticien {
  id: string;
  nom: string;
  specialite: string;
  secteur: number;
  adresse: string;
  lat: number;
  lng: number;
  prochain_rdv: string;
  delai_jours: number;
}

interface PraticienMapProps {
  city: string;
  typePraticien: string;
}

export function PraticienMap({ city, typePraticien }: PraticienMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [praticiens, setPraticiens] = useState<Praticien[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Praticien | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/praticiens?type=${encodeURIComponent(typePraticien)}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setPraticiens(data.praticiens ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city, typePraticien]);

  useEffect(() => {
    if (!token || !containerRef.current || loading || praticiens.length === 0) return;

    mapboxgl.accessToken = token;

    const first = praticiens[0];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [first.lng, first.lat],
      zoom: 13,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      praticiens.forEach((p) => {
        const el = document.createElement("div");
        const isS1 = p.secteur === 1;
        el.style.cssText = `
          width: 34px; height: 34px; border-radius: 50%;
          background: ${isS1 ? "#1D9E75" : "#f97316"};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: 700;
          transition: transform 0.15s;
        `;
        el.textContent = `S${p.secteur}`;
        el.onmouseenter = () => { el.style.transform = "scale(1.2)"; };
        el.onmouseleave = () => { el.style.transform = "scale(1)"; };
        el.onclick = () => setSelected(p);

        const marker = new mapboxgl.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, loading, praticiens]);

  if (!token) {
    return (
      <div className="h-56 bg-zinc-100 rounded-2xl border border-zinc-200 flex flex-col items-center justify-center gap-2">
        <span className="text-2xl">🗺️</span>
        <p className="text-zinc-400 text-sm font-medium">Carte non disponible</p>
        <p className="text-zinc-300 text-xs">Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-64 rounded-2xl overflow-hidden border border-zinc-200">
        {loading && (
          <div className="absolute inset-0 bg-zinc-100 animate-pulse z-10 rounded-2xl" />
        )}
        <div ref={containerRef} className="absolute inset-0" />
        {!loading && (
          <div className="absolute bottom-3 left-3 z-10 flex gap-2 text-xs">
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-zinc-200 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" /> Secteur 1
            </span>
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-zinc-200 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Secteur 2
            </span>
          </div>
        )}
      </div>

      {/* Popup praticien sélectionné */}
      {selected && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <p className="font-semibold text-zinc-900 text-sm">{selected.nom}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{selected.adresse}</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${selected.secteur === 1 ? "bg-[#1D9E75]/10 text-[#1D9E75]" : "bg-orange-50 text-orange-600"}`}>
                Secteur {selected.secteur}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">Prochain RDV dans <strong>{selected.delai_jours} jours</strong></span>
            </div>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="text-zinc-300 hover:text-zinc-500 transition text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Liste rapide des 3 premiers praticiens */}
      {!loading && praticiens.length > 0 && !selected && (
        <div className="grid grid-cols-1 gap-2">
          {praticiens.slice(0, 3).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3 text-left hover:border-[#1D9E75]/40 hover:shadow-sm transition"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{p.nom}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{p.adresse}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xs font-medium text-zinc-700">{p.delai_jours}j</p>
                <p className={`text-xs mt-0.5 ${p.secteur === 1 ? "text-[#1D9E75]" : "text-orange-500"}`}>S{p.secteur}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
