"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const symptomSchema = z.object({
  symptoms: z.string().min(10, "Décrivez vos symptômes en au moins 10 caractères.").max(2000),
  age: z.number({ error: "Entrez votre âge." }).int().min(1).max(120),
  sexe: z.enum(["homme", "femme", "autre"]),
  city: z.string().min(1, "Indiquez votre ville.").max(100),
  duree_jours: z.number().int().min(1).max(3650).nullable(),
  intensite: z.number().int().min(1).max(10).nullable(),
  antecedents: z.array(z.string()).max(20).nullable(),
  mutuelle: z.string().max(100).nullable(),
});

type SymptomForm = z.infer<typeof symptomSchema>;

const INTENSITE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Très léger", color: "text-green-600" },
  2: { label: "Léger", color: "text-green-500" },
  3: { label: "Modéré", color: "text-lime-600" },
  4: { label: "Modéré", color: "text-yellow-600" },
  5: { label: "Gênant", color: "text-yellow-500" },
  6: { label: "Intense", color: "text-orange-500" },
  7: { label: "Intense", color: "text-orange-600" },
  8: { label: "Sévère", color: "text-red-500" },
  9: { label: "Très sévère", color: "text-red-600" },
  10: { label: "Insupportable", color: "text-red-700" },
};

const STEPS = ["Symptômes", "Votre profil", "Précisions"];

export default function NouveauParcoursPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SymptomForm, string>>>({});

  const [form, setForm] = useState<{
    symptoms: string;
    age: string;
    sexe: "homme" | "femme" | "autre" | "";
    city: string;
    duree_jours: string;
    intensite: number | null;
    antecedents: string[];
    antecedentInput: string;
    mutuelle: string;
  }>({
    symptoms: "",
    age: "",
    sexe: "",
    city: "",
    duree_jours: "",
    intensite: null,
    antecedents: [],
    antecedentInput: "",
    mutuelle: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(s: number): boolean {
    const errs: typeof errors = {};
    if (s === 0) {
      if (form.symptoms.trim().length < 10)
        errs.symptoms = "Décrivez vos symptômes en au moins 10 caractères.";
    }
    if (s === 1) {
      const age = parseInt(form.age);
      if (!form.age || isNaN(age) || age < 1 || age > 120)
        errs.age = "Entrez un âge valide (1–120).";
      if (!form.sexe) errs.sexe = "Sélectionnez une option.";
      if (!form.city.trim()) errs.city = "Indiquez votre ville.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1);
  }

  function addAntecedent() {
    const val = form.antecedentInput.trim();
    if (!val || form.antecedents.length >= 20) return;
    set("antecedents", [...form.antecedents, val]);
    set("antecedentInput", "");
  }

  function removeAntecedent(i: number) {
    set("antecedents", form.antecedents.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(step)) return;

    const parsed = symptomSchema.safeParse({
      symptoms: form.symptoms.trim(),
      age: parseInt(form.age),
      sexe: form.sexe || "autre",
      city: form.city.trim(),
      duree_jours: form.duree_jours ? parseInt(form.duree_jours) : null,
      intensite: form.intensite,
      antecedents: form.antecedents.length > 0 ? form.antecedents : null,
      mutuelle: form.mutuelle.trim() || null,
    });

    if (!parsed.success) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/parcours/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error();
      const { parcours_id } = await res.json();
      router.push(`/parcours/${parcours_id}`);
    } catch {
      setErrors({ symptoms: "Erreur lors de la génération. Réessayez." });
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-[#1D9E75]">
            MedRoute
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Nouveau parcours</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Répondez à quelques questions pour générer votre parcours de soin personnalisé.
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i < step
                      ? "bg-[#1D9E75] text-white"
                      : i === step
                      ? "bg-[#1D9E75] text-white ring-4 ring-[#1D9E75]/20"
                      : "bg-zinc-200 text-zinc-400"
                  }`}
                >
                  {i < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    i <= step ? "text-zinc-800" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 sm:w-12 transition-colors ${
                    i < step ? "bg-[#1D9E75]" : "bg-zinc-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* ─── STEP 0 : Symptômes ─── */}
            {step === 0 && (
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                    Décrivez vos symptômes
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Soyez aussi précis que possible : localisation, type de douleur, évolution…
                  </p>
                </div>

                <div>
                  <textarea
                    value={form.symptoms}
                    onChange={(e) => set("symptoms", e.target.value)}
                    maxLength={2000}
                    rows={6}
                    placeholder="Ex : J'ai des douleurs thoraciques depuis 3 jours, principalement le matin, qui irradient vers l'épaule gauche. Pas de fièvre, mais j'ai du mal à respirer profondément."
                    className={`w-full border rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition ${
                      errors.symptoms ? "border-red-400 bg-red-50" : "border-zinc-200"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    {errors.symptoms ? (
                      <p className="text-xs text-red-600">{errors.symptoms}</p>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`text-xs ml-auto ${
                        form.symptoms.length > 1800 ? "text-orange-500" : "text-zinc-400"
                      }`}
                    >
                      {form.symptoms.length}/2000
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    En cas d&apos;urgence (douleur thoracique intense, difficultés respiratoires
                    sévères, perte de conscience), appelez immédiatement le{" "}
                    <strong>15</strong> ou le <strong>112</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* ─── STEP 1 : Profil ─── */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                    Votre profil
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Ces informations permettent de personnaliser votre parcours.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Âge */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Âge
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={form.age}
                      onChange={(e) => set("age", e.target.value)}
                      placeholder="Ex : 34"
                      className={`w-32 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition ${
                        errors.age ? "border-red-400 bg-red-50" : "border-zinc-200"
                      }`}
                    />
                    {errors.age && (
                      <p className="text-xs text-red-600 mt-1">{errors.age}</p>
                    )}
                  </div>

                  {/* Sexe */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Sexe biologique
                    </label>
                    <div className="flex gap-2">
                      {(["homme", "femme", "autre"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => set("sexe", option)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                            form.sexe === option
                              ? "bg-[#1D9E75] text-white border-[#1D9E75]"
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-[#1D9E75]/50"
                          }`}
                        >
                          {option === "homme" ? "Homme" : option === "femme" ? "Femme" : "Autre"}
                        </button>
                      ))}
                    </div>
                    {errors.sexe && (
                      <p className="text-xs text-red-600 mt-1">{errors.sexe}</p>
                    )}
                  </div>

                  {/* Ville */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      maxLength={100}
                      placeholder="Ex : Paris, Lyon, Marseille…"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition ${
                        errors.city ? "border-red-400 bg-red-50" : "border-zinc-200"
                      }`}
                    />
                    {errors.city && (
                      <p className="text-xs text-red-600 mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2 : Précisions (optionnel) ─── */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                    Précisions <span className="text-zinc-400 font-normal text-base">(optionnel)</span>
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Plus vous êtes précis, plus votre parcours sera pertinent.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Durée */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Depuis combien de jours ?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={form.duree_jours}
                        onChange={(e) => set("duree_jours", e.target.value)}
                        placeholder="—"
                        className="w-24 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition"
                      />
                      <span className="text-sm text-zinc-500">jours</span>
                    </div>
                  </div>

                  {/* Intensité */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Intensité de la gêne
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={form.intensite ?? 5}
                        onChange={(e) => set("intensite", parseInt(e.target.value))}
                        className="w-full accent-[#1D9E75]"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">1 — Très léger</span>
                        {form.intensite !== null && (
                          <span
                            className={`text-sm font-semibold ${
                              INTENSITE_LABELS[form.intensite]?.color
                            }`}
                          >
                            {form.intensite}/10 — {INTENSITE_LABELS[form.intensite]?.label}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">10 — Insupportable</span>
                      </div>
                    </div>
                    {form.intensite === null && (
                      <button
                        type="button"
                        onClick={() => set("intensite", 5)}
                        className="mt-1 text-xs text-[#1D9E75] hover:underline"
                      >
                        + Ajouter une intensité
                      </button>
                    )}
                  </div>

                  {/* Antécédents */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Antécédents médicaux
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={form.antecedentInput}
                        onChange={(e) => set("antecedentInput", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addAntecedent();
                          }
                        }}
                        placeholder="Ex : diabète, hypertension…"
                        className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition"
                        disabled={form.antecedents.length >= 20}
                      />
                      <button
                        type="button"
                        onClick={addAntecedent}
                        disabled={!form.antecedentInput.trim() || form.antecedents.length >= 20}
                        className="px-3 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    {form.antecedents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.antecedents.map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 text-xs px-2.5 py-1 rounded-full"
                          >
                            {a}
                            <button
                              type="button"
                              onClick={() => removeAntecedent(i)}
                              className="text-zinc-400 hover:text-zinc-700 transition"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Appuyez sur Entrée pour ajouter. {form.antecedents.length}/20.
                    </p>
                  </div>

                  {/* Mutuelle */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Mutuelle / complémentaire santé
                    </label>
                    <input
                      type="text"
                      value={form.mutuelle}
                      onChange={(e) => set("mutuelle", e.target.value)}
                      maxLength={100}
                      placeholder="Ex : Harmonie Mutuelle, MGEN, Alan…"
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="px-6 sm:px-8 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  ← Précédent
                </button>
              ) : (
                <span />
              )}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={next}
                  className="bg-[#1D9E75] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors"
                >
                  Suivant →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1D9E75] text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#178a65] transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Génération en cours…
                    </>
                  ) : (
                    "Générer mon parcours →"
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-6">
          MedRoute ne remplace pas un avis médical. En cas d&apos;urgence, appelez le{" "}
          <span className="font-bold text-red-600">15</span>.
        </p>
      </main>
    </div>
  );
}
