"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useParcoursStream,
  type Hypothese,
  type Etape,
  type Financier,
  type SymptomInput,
} from "@/hooks/useParcoursStream";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const URGENCE_CONFIG = {
  non_urgent: { label: "Non urgent", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  urgent: { label: "Urgent", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  absolu: { label: "Urgence absolue", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
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
      <a href="tel:15" className="bg-white text-red-600 px-10 py-4 rounded-2xl font-bold text-2xl shadow-xl hover:bg-red-50 transition">
        📞 Appeler le 15
      </a>
      <p className="text-red-200 text-sm mt-6">
        Ou le <strong className="text-white">112</strong> depuis n&apos;importe quel téléphone
      </p>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-xl animate-pulse ${className}`} />;
}

// ─── Carte étape ──────────────────────────────────────────────────────────────

function EtapeCard({ etape, isLast, nextVisible }: { etape: Etape; isLast: boolean; nextVisible: boolean }) {
  return (
    <div className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center text-lg shrink-0 z-10">
          {praticienIcon(etape.type_praticien)}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 my-1 transition-colors duration-700 ${nextVisible ? "bg-[#1D9E75]/30" : "bg-zinc-200"}`} style={{ minHeight: "24px" }} />
        )}
      </div>
      <div className="flex-1 mb-3">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 hover:border-[#1D9E75]/30 hover:shadow-sm transition">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-xs text-zinc-400 font-medium">Étape {etape.index + 1}</span>
              <h3 className="font-semibold text-zinc-900 text-sm">{etape.type_praticien}</h3>
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
            <span className="text-zinc-500">RAC : {etape.cout_estime - etape.remboursement_secu}€</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Carte hypothèse ──────────────────────────────────────────────────────────

function HypotheseCard({ h, rank }: { h: Hypothese; rank: number }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${h.alerte ? "border-orange-200 bg-orange-50/30" : "border-zinc-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${rank === 0 ? "text-[#1D9E75]" : rank === 1 ? "text-zinc-600" : "text-zinc-400"}`}>
          {Math.round(h.probabilite * 100)}%
        </span>
        {h.alerte && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">À écarter</span>}
      </div>
      <p className="font-semibold text-zinc-900 text-sm mb-1">{h.pathologie}</p>
      <p className="text-xs text-zinc-500 leading-relaxed">{h.description}</p>
    </div>
  );
}

// ─── Bilan financier ──────────────────────────────────────────────────────────

function FinancierCard({ f }: { f: Financier }) {
  const pct = Math.round((f.secu / f.cout_total) * 100);
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
        <div className="px-4">
          <p className="text-2xl font-bold text-zinc-900">{f.cout_total}€</p>
          <p className="text-xs text-zinc-500 mt-1">Coût total estimé</p>
        </div>
        <div className="px-4">
          <p className="text-2xl font-bold text-green-600">{f.secu}€</p>
          <p className="text-xs text-zinc-500 mt-1">Remboursé Sécu</p>
        </div>
        <div className="px-4">
          <p className="text-2xl font-bold text-[#1D9E75]">{f.rac}€</p>
          <p className="text-xs text-zinc-500 mt-1">Reste à charge</p>
        </div>
      </div>
      <div className="mt-4 h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-400 mt-1.5 text-center">{pct}% remboursé par l&apos;Assurance Maladie</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function StreamPage() {
  const router = useRouter();
  const { state, start } = useParcoursStream();
  const { phase, urgence, confidence, hypotheses, etapes, financier, message_utilisateur, disclaimer, parcours_id, error } = state;

  // Lit les données du formulaire stockées en sessionStorage et démarre le stream
  useEffect(() => {
    const raw = sessionStorage.getItem("parcours_pending");
    if (!raw) {
      router.replace("/parcours/nouveau");
      return;
    }
    try {
      const input = JSON.parse(raw) as SymptomInput;
      sessionStorage.removeItem("parcours_pending");
      start(input);
    } catch {
      router.replace("/parcours/nouveau");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mise à jour de l'URL une fois le parcours sauvegardé en base
  useEffect(() => {
    if (phase === "done" && parcours_id && urgence !== "absolu") {
      window.history.replaceState(null, "", `/parcours/${parcours_id}`);
    }
  }, [phase, parcours_id, urgence]);

  if (urgence === "absolu") return <UrgenceAbsolue />;

  const urgenceConf = urgence ? URGENCE_CONFIG[urgence] : null;
  const isStreaming = phase === "connecting" || phase === "streaming";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-[#1D9E75]">MedRoute</Link>
          <div className="flex items-center gap-3">
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
                Génération en cours…
              </span>
            )}
            {phase === "done" && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Parcours généré
              </span>
            )}
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
              ← Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Erreur */}
        {phase === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-red-700 font-medium mb-3">{error}</p>
            <Link href="/parcours/nouveau" className="text-sm text-[#1D9E75] font-medium hover:underline">
              ← Réessayer
            </Link>
          </div>
        )}

        {/* Badges urgence + confiance */}
        {(urgenceConf || confidence !== null) && (
          <div className="flex items-center gap-3 flex-wrap animate-in fade-in duration-300">
            {urgenceConf && (
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${urgenceConf.bg} ${urgenceConf.text} ${urgenceConf.border}`}>
                <span className={`w-2 h-2 rounded-full ${urgenceConf.dot}`} />
                {urgenceConf.label}
              </span>
            )}
            {confidence !== null && (
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
                Confiance IA : <strong className="text-zinc-800 ml-1">{Math.round(confidence * 100)}%</strong>
              </span>
            )}
          </div>
        )}

        {/* Skeletons phase connecting */}
        {phase === "connecting" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <div className="grid sm:grid-cols-3 gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        )}

        {/* Hypothèses */}
        {hypotheses.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Hypothèses probables</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {hypotheses.map((h, i) => <HypotheseCard key={i} h={h} rank={i} />)}
            </div>
          </section>
        )}

        {/* Parcours */}
        {(etapes.length > 0 || (isStreaming && hypotheses.length > 0)) && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Votre parcours de soin</h2>
            <div className="relative">
              {etapes.map((etape, i) => (
                <EtapeCard
                  key={etape.index}
                  etape={etape}
                  isLast={i === etapes.length - 1 && phase === "done"}
                  nextVisible={i < etapes.length - 1}
                />
              ))}
              {/* Étape en cours de chargement */}
              {isStreaming && etapes.length > 0 && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 shrink-0" />
                  <div className="flex-1 mb-3">
                    <div className="bg-white rounded-2xl border border-zinc-100 p-4">
                      <Skeleton className="h-3 w-24 mb-2" />
                      <Skeleton className="h-4 w-40 mb-3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Financier */}
        {financier && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Estimation financière</h2>
            <FinancierCard f={financier} />
          </section>
        )}

        {/* Message utilisateur */}
        {message_utilisateur && (
          <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-8 h-8 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center shrink-0 text-base">💬</div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 mb-1">Recommandation</p>
              <p className="text-sm text-zinc-600 leading-relaxed">{message_utilisateur}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {phase === "done" && urgence !== ("absolu" as string) && (
          <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button className="flex-1 bg-[#1D9E75] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors">
              Télécharger en PDF
            </button>
            <Link href="/parcours/nouveau" className="flex-1 text-center border border-zinc-200 text-zinc-700 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors">
              Nouveau parcours
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        {(disclaimer || phase === "done") && (
          <p className="text-xs text-zinc-400 text-center pb-6 leading-relaxed animate-in fade-in duration-500">
            {disclaimer ?? "MedRoute ne remplace pas un avis médical professionnel."}{" "}
            En cas d&apos;urgence, appelez le <span className="font-bold text-red-600">15</span>.
          </p>
        )}
      </main>
    </div>
  );
}
