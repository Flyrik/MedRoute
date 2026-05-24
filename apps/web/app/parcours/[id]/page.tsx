import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ParcoursDetail } from "@/components/ParcoursDetail";

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

const URGENCE_CONFIG = {
  non_urgent: { label: "Non urgent", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  urgent: { label: "Urgent", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  absolu: { label: "Urgence absolue", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

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
  const city: string = row.city ?? "Paris";

  const coutTotal: number = row.cout_total_estime ?? 0;
  const rac: number = row.rac_estime ?? 0;
  const secu: number = Math.round((coutTotal - rac) * 100) / 100;
  const hasFinancier = coutTotal > 0;
  const pctSecu = hasFinancier ? Math.round((secu / coutTotal) * 100) : 0;

  const date = new Date(row.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-50">
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
          <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
            📍 {city}
          </span>
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

        {/* Étapes interactives + carte (client component) */}
        {etapes.length > 0 && (
          <ParcoursDetail
            parcoursId={id}
            etapes={etapes}
            etapesCompletees={etapesCompletees}
            city={city}
          />
        )}

        {/* Financier */}
        {hasFinancier && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Estimation financière
            </h2>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
                <div className="px-4">
                  <p className="text-2xl font-bold text-zinc-900">{coutTotal}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Coût total estimé</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-bold text-green-600">{secu}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Remboursé Sécu</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-bold text-[#1D9E75]">{rac}€</p>
                  <p className="text-xs text-zinc-500 mt-1">Reste à charge</p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctSecu}%` }} />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 text-center">
                {pctSecu}% remboursé par l&apos;Assurance Maladie
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

        <p className="text-xs text-zinc-400 text-center pb-6 leading-relaxed">
          MedRoute ne remplace pas un avis médical professionnel. En cas d&apos;urgence, appelez le{" "}
          <span className="font-bold text-red-600">15</span>.
        </p>
      </main>
    </div>
  );
}
