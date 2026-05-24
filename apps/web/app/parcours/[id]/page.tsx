import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParcoursPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("parcours")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!row) notFound();

  const hypotheses: Hypothese[] = Array.isArray(row.hypotheses) ? row.hypotheses : [];
  const etapes: Etape[] = Array.isArray(row.etapes) ? row.etapes : [];
  const etapesCompletees: number[] = Array.isArray(row.etapes_completees) ? row.etapes_completees : [];
  const urgenceKey = (row.urgence_level ?? "non_urgent") as keyof typeof URGENCE_CONFIG;
  const urgenceConf = URGENCE_CONFIG[urgenceKey] ?? URGENCE_CONFIG.non_urgent;
  const confidence: number = row.ai_confidence ?? 1;

  const financier: Financier | null =
    row.cout_total_estime != null
      ? {
          cout_total: row.cout_total_estime,
          secu: row.cout_total_estime - (row.rac_estime ?? 0),
          rac: row.rac_estime ?? 0,
        }
      : null;

  const date = new Date(row.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pctDone = etapes.length > 0 ? Math.round((etapesCompletees.length / etapes.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-[#1D9E75]">
            MedRoute
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{date}</span>
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
              ← Mes parcours
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${urgenceConf.bg} ${urgenceConf.text} ${urgenceConf.border}`}>
            <span className={`w-2 h-2 rounded-full ${urgenceConf.dot}`} />
            {urgenceConf.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
            Confiance IA : <strong className="text-zinc-800 ml-1">{Math.round(confidence * 100)}%</strong>
          </span>
          {etapes.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
              Progression : <strong className="text-zinc-800 ml-1">{etapesCompletees.length}/{etapes.length}</strong>
            </span>
          )}
        </div>

        {/* Hypothèses */}
        {hypotheses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Hypothèses probables
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {hypotheses.map((h, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border p-4 ${h.alerte ? "border-orange-200 bg-orange-50/30" : "border-zinc-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-lg font-bold ${i === 0 ? "text-[#1D9E75]" : i === 1 ? "text-zinc-600" : "text-zinc-400"}`}>
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
        )}

        {/* Parcours timeline */}
        {etapes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Votre parcours de soin
            </h2>
            <div className="relative">
              {etapes.map((etape, i) => {
                const isLast = i === etapes.length - 1;
                const isDone = etapesCompletees.includes(etape.index);
                return (
                  <div key={etape.index} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 z-10 ${isDone ? "bg-[#1D9E75]/20" : "bg-[#1D9E75]/10"}`}>
                        {isDone ? "✓" : praticienIcon(etape.type_praticien)}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 my-1 ${isDone ? "bg-[#1D9E75]/40" : "bg-zinc-200"}`}
                          style={{ minHeight: "24px" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 mb-3">
                      <div className={`bg-white rounded-2xl border p-4 ${isDone ? "border-[#1D9E75]/30 opacity-70" : "border-zinc-200"} hover:border-[#1D9E75]/30 hover:shadow-sm transition`}>
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
                          <span className="text-zinc-500">RAC : {Math.max(0, etape.cout_estime - etape.remboursement_secu)}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barre de progression */}
            {etapes.length > 0 && (
              <div className="mt-4 bg-white rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-700">Progression du parcours</span>
                  <span className="text-xs text-zinc-500">{pctDone}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D9E75] rounded-full transition-all duration-700"
                    style={{ width: `${pctDone}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Financier */}
        {financier && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Estimation financière
            </h2>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
                <div className="px-4">
                  <p className="text-2xl font-bold text-zinc-900">{financier.cout_total}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Coût total estimé</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-bold text-green-600">{Math.round(financier.secu)}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Remboursé Sécu</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-bold text-[#1D9E75]">{financier.rac}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Reste à charge</p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.round((financier.secu / financier.cout_total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 text-center">
                {Math.round((financier.secu / financier.cout_total) * 100)}% remboursé par l&apos;Assurance Maladie
              </p>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 bg-[#1D9E75] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors">
            Télécharger en PDF
          </button>
          <Link
            href="/parcours/nouveau"
            className="flex-1 text-center border border-zinc-200 text-zinc-700 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors"
          >
            Nouveau parcours
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-zinc-400 text-center pb-6 leading-relaxed">
          MedRoute ne remplace pas un avis médical professionnel. En cas d&apos;urgence, appelez le{" "}
          <span className="font-bold text-red-600">15</span>.
        </p>
      </main>
    </div>
  );
}
