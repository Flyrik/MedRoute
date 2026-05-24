"use client";

import { useState, useTransition } from "react";
import { PraticienMap } from "./PraticienMap";
import { toggleEtapeComplete } from "@/app/parcours/[id]/actions";

interface Etape {
  index: number;
  type_praticien: string;
  motif: string;
  delai: string;
  cout_estime: number;
  remboursement_secu: number;
}

interface Props {
  parcoursId: string;
  etapes: Etape[];
  etapesCompletees: number[];
  city: string;
}

const PRATICIEN_ICONS: Record<string, string> = {
  "médecin généraliste": "🩺",
  cardiologue: "❤️",
  kinésithérapeute: "💪",
  dermatologue: "🔬",
  psychiatre: "🧠",
  neurologue: "🧬",
  ophtalmologue: "👁️",
  gastro: "🫁",
  urgences: "🚨",
};

function praticienIcon(type: string) {
  const key = type.toLowerCase();
  for (const [k, icon] of Object.entries(PRATICIEN_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "🏥";
}

export function ParcoursDetail({ parcoursId, etapes, etapesCompletees: init, city }: Props) {
  const [completees, setCompletees] = useState(init);
  const [selectedType, setSelectedType] = useState(etapes[0]?.type_praticien ?? "");
  const [isPending, startTransition] = useTransition();

  const pctDone = etapes.length > 0 ? Math.round((completees.length / etapes.length) * 100) : 0;

  function handleToggle(etapeIndex: number) {
    const optimistic = completees.includes(etapeIndex)
      ? completees.filter((i) => i !== etapeIndex)
      : [...completees, etapeIndex];
    setCompletees(optimistic);

    startTransition(async () => {
      try {
        const result = await toggleEtapeComplete(parcoursId, etapeIndex, completees);
        setCompletees(result);
      } catch {
        setCompletees(completees);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Timeline étapes */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Votre parcours de soin
        </h2>
        <div className="relative">
          {etapes.map((etape, i) => {
            const isLast = i === etapes.length - 1;
            const isDone = completees.includes(etape.index);
            const isSelected = selectedType === etape.type_praticien;

            return (
              <div key={etape.index} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleToggle(etape.index)}
                    disabled={isPending}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 z-10 transition-all duration-200 ${
                      isDone
                        ? "bg-[#1D9E75] text-white shadow-sm"
                        : isSelected
                        ? "bg-[#1D9E75]/20 ring-2 ring-[#1D9E75]/40"
                        : "bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20"
                    } disabled:opacity-60`}
                    title={isDone ? "Marquer comme non complété" : "Marquer comme complété"}
                  >
                    {isDone ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      praticienIcon(etape.type_praticien)
                    )}
                  </button>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 my-1 transition-colors duration-500 ${
                        isDone ? "bg-[#1D9E75]/50" : "bg-zinc-200"
                      }`}
                      style={{ minHeight: "24px" }}
                    />
                  )}
                </div>

                <div className="flex-1 mb-3">
                  <div
                    onClick={() => setSelectedType(etape.type_praticien)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                      isDone
                        ? "border-[#1D9E75]/30 opacity-60"
                        : isSelected
                        ? "border-[#1D9E75]/60 shadow-sm"
                        : "border-zinc-200 hover:border-[#1D9E75]/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-xs text-zinc-400 font-medium">Étape {i + 1}</span>
                        <h3 className={`font-semibold text-sm ${isDone ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                          {etape.type_praticien}
                        </h3>
                      </div>
                      <span className="shrink-0 text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full font-medium">
                        {etape.delai}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mb-3 leading-relaxed">{etape.motif}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-700 font-medium">~{etape.cout_estime}€</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-green-600">Sécu : {etape.remboursement_secu}€</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-500">
                        RAC : {Math.max(0, etape.cout_estime - etape.remboursement_secu)}€
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barre de progression */}
        {etapes.length > 0 && (
          <div className="mt-2 bg-white rounded-2xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-700">Progression du parcours</span>
              <span className="text-xs text-zinc-500 font-medium">{pctDone}%</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1D9E75] rounded-full transition-all duration-700"
                style={{ width: `${pctDone}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {completees.length} sur {etapes.length} étapes complétées
              {isPending && " · Enregistrement…"}
            </p>
          </div>
        )}
      </section>

      {/* Carte praticiens */}
      {selectedType && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Praticiens disponibles — {selectedType}
          </h2>
          <p className="text-xs text-zinc-400 mb-3">
            Cliquez sur une étape pour voir les praticiens correspondants.
          </p>
          <PraticienMap city={city} typePraticien={selectedType} />
        </section>
      )}
    </div>
  );
}
