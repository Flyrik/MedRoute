"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hypothese {
  pathologie: string;
  probabilite: number;
  description: string;
  alerte?: boolean;
}

interface Etape {
  index: number;
  type_praticien: string;
  motif: string;
  delai: string;
  cout_estime: number;
  remboursement_secu: number;
}

interface Financier {
  cout_total: number;
  secu: number;
  rac: number;
}

interface Parcours {
  hypotheses: Hypothese[];
  urgence: "non_urgent" | "urgent" | "absolu";
  confidence: number;
  parcours: Etape[];
  financier: Financier;
  message_utilisateur: string;
  disclaimer: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK: Parcours = {
  hypotheses: [
    {
      pathologie: "Douleur musculo-squelettique",
      probabilite: 0.65,
      description: "Tension ou contracture musculaire intercostale, souvent bénigne.",
    },
    {
      pathologie: "Reflux gastro-œsophagien",
      probabilite: 0.22,
      description: "Remontées acides pouvant mimer une douleur thoracique.",
    },
    {
      pathologie: "Péricardite",
      probabilite: 0.08,
      description: "Inflammation du péricarde à écarter par un cardiologue.",
      alerte: true,
    },
  ],
  urgence: "non_urgent",
  confidence: 0.87,
  parcours: [
    {
      index: 0,
      type_praticien: "Médecin généraliste",
      motif: "Consultation initiale, examen clinique et orientation du bilan.",
      delai: "Dans les 48h",
      cout_estime: 30,
      remboursement_secu: 23,
    },
    {
      index: 1,
      type_praticien: "Cardiologue",
      motif: "ECG et échocardiographie pour écarter une cause cardiaque.",
      delai: "Sous 1 semaine",
      cout_estime: 80,
      remboursement_secu: 56,
    },
    {
      index: 2,
      type_praticien: "Kinésithérapeute",
      motif: "Séances de rééducation si origine musculo-squelettique confirmée.",
      delai: "Sous 2 semaines",
      cout_estime: 120,
      remboursement_secu: 60,
    },
  ],
  financier: { cout_total: 230, secu: 139, rac: 91 },
  message_utilisateur:
    "D'après vos symptômes, il s'agit probablement d'une douleur musculaire intercostale. Commencez par consulter votre médecin généraliste qui orientera la suite de votre prise en charge.",
  disclaimer:
    "MedRoute ne remplace pas un avis médical professionnel. Ces informations sont indicatives et basées sur les recommandations HAS et Ameli.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRATICIEN_ICONS: Record<string, string> = {
  "Médecin généraliste": "🩺",
  Cardiologue: "❤️",
  Kinésithérapeute: "💪",
  Dermatologue: "🔬",
  Psychiatre: "🧠",
  Neurologue: "🧬",
  Ophtalmologue: "👁️",
  Gastro: "🫁",
  Urgences: "🚨",
};

function praticienIcon(type: string) {
  for (const [key, icon] of Object.entries(PRATICIEN_ICONS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🏥";
}

const URGENCE_CONFIG = {
  non_urgent: {
    label: "Non urgent",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  urgent: {
    label: "Urgent",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  absolu: {
    label: "Urgence absolue",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

// ─── Urgence absolue overlay ──────────────────────────────────────────────────

function UrgenceAbsolue() {
  return (
    <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center z-50 px-6 text-center">
      <div className="text-6xl mb-6">🚨</div>
      <h1 className="text-4xl font-bold text-white mb-4">Appelez le 15 immédiatement</h1>
      <p className="text-red-100 text-lg max-w-md mb-8">
        Vos symptômes nécessitent une prise en charge médicale urgente. Ne tardez pas.
      </p>
      <a
        href="tel:15"
        className="bg-white text-red-600 px-10 py-4 rounded-2xl font-bold text-2xl shadow-xl hover:bg-red-50 transition"
      >
        📞 Appeler le 15
      </a>
      <p className="text-red-200 text-sm mt-6">
        Ou le <strong className="text-white">112</strong> depuis n'importe quel téléphone
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParcoursPage() {
  const [phase, setPhase] = useState<"streaming" | "done">("streaming");
  const [visibleHypotheses, setVisibleHypotheses] = useState(false);
  const [visibleEtapes, setVisibleEtapes] = useState<number[]>([]);
  const [visibleFinancier, setVisibleFinancier] = useState(false);
  const [visibleMessage, setVisibleMessage] = useState(false);

  const data = MOCK;
  const urgence = URGENCE_CONFIG[data.urgence];

  // Simule l'arrivée des événements SSE avec 400ms entre chaque étape
  useEffect(() => {
    if (data.urgence === "absolu") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setVisibleHypotheses(true), 300));

    data.parcours.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleEtapes((prev) => [...prev, i]);
      }, 900 + i * 500));
    });

    timers.push(setTimeout(() => setVisibleFinancier(true), 900 + data.parcours.length * 500 + 200));
    timers.push(setTimeout(() => setVisibleMessage(true), 900 + data.parcours.length * 500 + 500));
    timers.push(setTimeout(() => setPhase("done"), 900 + data.parcours.length * 500 + 800));

    return () => timers.forEach(clearTimeout);
  }, []);

  if (data.urgence === "absolu") return <UrgenceAbsolue />;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-[#1D9E75]">
            MedRoute
          </Link>
          <div className="flex items-center gap-3">
            {phase === "streaming" && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
                Génération en cours…
              </span>
            )}
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              ← Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Badges urgence + confiance */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${urgence.bg} ${urgence.text} ${urgence.border}`}
          >
            <span className={`w-2 h-2 rounded-full ${urgence.dot}`} />
            {urgence.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
            Confiance IA : <strong className="text-zinc-800">{Math.round(data.confidence * 100)}%</strong>
          </span>
        </div>

        {/* Hypothèses */}
        <section
          className={`transition-all duration-500 ${
            visibleHypotheses ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Hypothèses probables
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {data.hypotheses.map((h, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border p-4 ${
                  h.alerte ? "border-orange-200 bg-orange-50/30" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-lg font-bold ${
                      i === 0
                        ? "text-[#1D9E75]"
                        : i === 1
                        ? "text-zinc-600"
                        : "text-zinc-400"
                    }`}
                  >
                    {Math.round(h.probabilite * 100)}%
                  </span>
                  {h.alerte && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                      À écarter
                    </span>
                  )}
                </div>
                <p className="font-semibold text-zinc-900 text-sm mb-1">{h.pathologie}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{h.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Parcours timeline */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
            Votre parcours de soin
          </h2>

          <div className="relative">
            {data.parcours.map((etape, i) => {
              const visible = visibleEtapes.includes(i);
              const isLast = i === data.parcours.length - 1;
              return (
                <div
                  key={i}
                  className={`relative flex gap-4 transition-all duration-500 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                >
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 z-10 transition-colors duration-300 ${
                        visible ? "bg-[#1D9E75]/10 shadow-sm" : "bg-zinc-100"
                      }`}
                    >
                      {praticienIcon(etape.type_praticien)}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-1 transition-colors duration-700 ${
                          visibleEtapes.includes(i + 1) ? "bg-[#1D9E75]/30" : "bg-zinc-200"
                        }`}
                        style={{ minHeight: "24px" }}
                      />
                    )}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 mb-3 ${isLast ? "" : ""}`}>
                    <div className="bg-white rounded-2xl border border-zinc-200 p-4 hover:border-[#1D9E75]/30 hover:shadow-sm transition group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-xs text-zinc-400 font-medium">
                            Étape {i + 1}
                          </span>
                          <h3 className="font-semibold text-zinc-900 text-sm">
                            {etape.type_praticien}
                          </h3>
                        </div>
                        <span className="shrink-0 text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full font-medium">
                          {etape.delai}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 mb-3 leading-relaxed">{etape.motif}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-700 font-medium">
                          ~{etape.cout_estime}€
                        </span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-green-600">
                          Sécu : {etape.remboursement_secu}€
                        </span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-zinc-500">
                          RAC : {etape.cout_estime - etape.remboursement_secu}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Financier */}
        <section
          className={`transition-all duration-500 ${
            visibleFinancier ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Estimation financière
          </h2>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4">
                <p className="text-2xl font-bold text-zinc-900">{data.financier.cout_total}€</p>
                <p className="text-xs text-zinc-500 mt-1">Coût total estimé</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-bold text-green-600">{data.financier.secu}€</p>
                <p className="text-xs text-zinc-500 mt-1">Remboursé Sécu</p>
              </div>
              <div className="px-4">
                <p className="text-2xl font-bold text-[#1D9E75]">{data.financier.rac}€</p>
                <p className="text-xs text-zinc-500 mt-1">Reste à charge</p>
              </div>
            </div>
            {/* Barre visuelle */}
            <div className="mt-4 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{
                  width: visibleFinancier
                    ? `${(data.financier.secu / data.financier.cout_total) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 text-center">
              {Math.round((data.financier.secu / data.financier.cout_total) * 100)}% remboursé par l'Assurance Maladie
            </p>
          </div>
        </section>

        {/* Message utilisateur */}
        <section
          className={`transition-all duration-500 ${
            visibleMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 flex gap-4">
            <div className="w-8 h-8 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center shrink-0 text-base">
              💬
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 mb-1">Recommandation</p>
              <p className="text-sm text-zinc-600 leading-relaxed">{data.message_utilisateur}</p>
            </div>
          </div>
        </section>

        {/* Actions */}
        {phase === "done" && (
          <section
            className="flex flex-col sm:flex-row gap-3 transition-all duration-500 animate-in"
          >
            <button className="flex-1 bg-[#1D9E75] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors">
              Télécharger en PDF
            </button>
            <Link
              href="/parcours/nouveau"
              className="flex-1 text-center border border-zinc-200 text-zinc-700 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors"
            >
              Nouveau parcours
            </Link>
          </section>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-zinc-400 text-center pb-6 leading-relaxed">
          {data.disclaimer} En cas d&apos;urgence, appelez le{" "}
          <span className="font-bold text-red-600">15</span>.
        </p>
      </main>
    </div>
  );
}
