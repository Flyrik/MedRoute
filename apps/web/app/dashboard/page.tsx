import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: parcours } = await supabase
    .from("parcours")
    .select("id, created_at, urgence_level, ai_confidence, city, etapes, etapes_completees, cout_total_estime")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#1D9E75]">
            MedRoute
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Mes parcours de soin
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Retrouvez et suivez vos parcours générés
            </p>
          </div>
          <Link
            href="/parcours/nouveau"
            className="bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors"
          >
            + Nouveau parcours
          </Link>
        </div>

        {!parcours || parcours.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200">
            <div className="text-4xl mb-4">🗺️</div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">
              Aucun parcours pour l&apos;instant
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Décrivez vos symptômes pour obtenir votre premier parcours de soin.
            </p>
            <Link
              href="/parcours/nouveau"
              className="inline-block bg-[#1D9E75] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors"
            >
              Analyser mes symptômes
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {parcours.map((p) => {
              const etapes = Array.isArray(p.etapes) ? p.etapes.length : 0;
              const done = Array.isArray(p.etapes_completees)
                ? p.etapes_completees.length
                : 0;
              const date = new Date(p.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              const urgenceColor =
                p.urgence_level === "absolu"
                  ? "text-red-600 bg-red-50"
                  : p.urgence_level === "urgent"
                  ? "text-orange-600 bg-orange-50"
                  : "text-green-700 bg-green-50";
              const urgenceLabel =
                p.urgence_level === "absolu"
                  ? "Urgence absolue"
                  : p.urgence_level === "urgent"
                  ? "Urgent"
                  : "Non urgent";

              return (
                <Link
                  key={p.id}
                  href={`/parcours/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-2xl border border-zinc-200 px-6 py-4 hover:border-[#1D9E75]/40 hover:shadow-sm transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center text-lg">
                      🗺️
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 text-sm">
                        {p.city} — {date}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgenceColor}`}
                        >
                          {urgenceLabel}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {done}/{etapes} étapes
                        </span>
                        {p.cout_total_estime && (
                          <span className="text-xs text-zinc-400">
                            ~{p.cout_total_estime}€
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-zinc-300 group-hover:text-[#1D9E75] transition text-xl">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 py-8">
        MedRoute ne remplace pas un avis médical. En cas d&apos;urgence, appelez le{" "}
        <span className="font-bold text-red-600">15</span>.
      </footer>
    </div>
  );
}
