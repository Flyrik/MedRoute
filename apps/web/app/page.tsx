import Link from "next/link";

const features = [
  {
    icon: "🧠",
    title: "Analyse IA en quelques secondes",
    description:
      "Décrivez vos symptômes en langage naturel. Notre IA génère un parcours personnalisé basé sur les recommandations HAS et Ameli.",
  },
  {
    icon: "🗺️",
    title: "Les bons spécialistes, dans le bon ordre",
    description:
      "Visualisez chaque étape de votre parcours : quel médecin consulter, dans quel délai, et pourquoi.",
  },
  {
    icon: "💶",
    title: "Estimation financière transparente",
    description:
      "Coût total, remboursement Sécurité Sociale, reste à charge — tout est calculé avant votre premier rendez-vous.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="font-semibold text-lg tracking-tight text-[#1D9E75]">
          MedRoute
        </span>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a65] transition-colors"
          >
            Commencer
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-[#1D9E75]/10 text-[#1D9E75] text-sm font-medium px-3 py-1 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
            Bêta — accès gratuit
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 max-w-3xl mx-auto leading-tight">
            Votre GPS du{" "}
            <span className="text-[#1D9E75]">parcours de soin</span>
          </h1>

          <p className="mt-6 text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            Décrivez vos symptômes. Obtenez en quelques secondes un parcours
            personnalisé — les bons spécialistes, dans le bon ordre, avec le
            coût estimé.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-[#1D9E75] text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-[#178a65] transition-colors shadow-sm"
            >
              Analyser mes symptômes →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-zinc-200 text-zinc-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-zinc-50 transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-400">
            MedRoute ne remplace pas un avis médical. En cas d&apos;urgence, appelez le 15.
          </p>
        </section>

        {/* Features */}
        <section className="bg-zinc-50 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center text-zinc-900 mb-12">
              Comment ça marche
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA bas */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Prêt à trouver votre parcours ?
          </h2>
          <p className="text-zinc-500 mb-8">
            Gratuit, sans carte bancaire, résultats en moins de 10 secondes.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-[#1D9E75] text-white px-10 py-4 rounded-xl font-semibold text-base hover:bg-[#178a65] transition-colors shadow-sm"
          >
            Commencer gratuitement →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-6 text-center text-xs text-zinc-400">
        <p>
          © 2026 MedRoute •{" "}
          <span className="font-medium text-zinc-500">
            MedRoute ne remplace pas un avis médical professionnel.
          </span>{" "}
          • En cas d&apos;urgence vitale, appelez le{" "}
          <span className="font-bold text-red-600">15</span>
        </p>
      </footer>
    </div>
  );
}
