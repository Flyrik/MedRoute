"use client";

import { useCallback, useRef, useState } from "react";

// ─── Types publics ────────────────────────────────────────────────────────────

export interface SymptomInput {
  symptoms: string;
  age: number;
  sexe: "homme" | "femme" | "autre";
  city: string;
  duree_jours?: number | null;
  intensite?: number | null;
  antecedents?: string[] | null;
  mutuelle?: string | null;
}

export interface Hypothese {
  pathologie: string;
  probabilite: number;
  description: string;
  alerte?: boolean;
}

export interface Etape {
  index: number;
  type_praticien: string;
  motif: string;
  delai: string;
  cout_estime: number;
  remboursement_secu: number;
}

export interface Financier {
  cout_total: number;
  secu: number;
  rac: number;
}

export type StreamPhase = "idle" | "connecting" | "streaming" | "done" | "error";

export interface ParcoursStreamState {
  phase: StreamPhase;
  urgence: "non_urgent" | "urgent" | "absolu" | null;
  confidence: number | null;
  hypotheses: Hypothese[];
  etapes: Etape[];
  financier: Financier | null;
  message_utilisateur: string | null;
  disclaimer: string | null;
  parcours_id: string | null;
  error: string | null;
}

// ─── État initial ─────────────────────────────────────────────────────────────

const INITIAL: ParcoursStreamState = {
  phase: "idle",
  urgence: null,
  confidence: null,
  hypotheses: [],
  etapes: [],
  financier: null,
  message_utilisateur: null,
  disclaimer: null,
  parcours_id: null,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useParcoursStream() {
  const [state, setState] = useState<ParcoursStreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (input: SymptomInput) => {
    // Annule un stream déjà en cours
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, phase: "connecting" });

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/parcours/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const msg =
          res.status === 429
            ? "Limite atteinte : 10 parcours par 24h."
            : res.status >= 500
            ? "Erreur serveur. Réessayez dans quelques instants."
            : "Erreur lors de la génération.";
        throw new Error(msg);
      }

      if (!res.body) throw new Error("Réponse vide du serveur.");

      setState((s) => ({ ...s, phase: "streaming" }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Lecture du stream SSE ligne par ligne
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              const payload = JSON.parse(raw) as Record<string, unknown>;
              applyEvent(eventType, payload);
            } catch {
              // JSON malformé — on ignore
            }
            eventType = "";
          }
        }
      }

      // Stream terminé sans event "complete" explicite
      setState((s) => (s.phase === "streaming" ? { ...s, phase: "done" } : s));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        phase: "error",
        error: (err as Error).message ?? "Erreur inconnue.",
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyEvent(type: string, data: Record<string, unknown>) {
    switch (type) {
      case "hypotheses":
        setState((s) => ({
          ...s,
          hypotheses: (data.hypotheses as Hypothese[]) ?? [],
          urgence: (data.urgence as ParcoursStreamState["urgence"]) ?? s.urgence,
          confidence: (data.confidence as number) ?? s.confidence,
        }));
        break;

      case "etape":
        setState((s) => ({
          ...s,
          // On évite les doublons si le backend rejoue un event
          etapes: s.etapes.some((e) => e.index === (data.index as number))
            ? s.etapes
            : [...s.etapes, data as unknown as Etape],
        }));
        break;

      case "financier":
        setState((s) => ({
          ...s,
          financier: {
            cout_total: data.cout_total as number,
            secu: data.secu as number,
            rac: data.rac as number,
          },
        }));
        break;

      case "complete":
        setState((s) => ({
          ...s,
          phase: "done",
          parcours_id: (data.parcours_id as string) ?? s.parcours_id,
          message_utilisateur: (data.message_utilisateur as string) ?? s.message_utilisateur,
          disclaimer: (data.disclaimer as string) ?? s.disclaimer,
        }));
        break;

      case "urgence_absolue":
        setState((s) => ({ ...s, urgence: "absolu", phase: "done" }));
        break;
    }
  }

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, phase: "idle" }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { state, start, cancel, reset };
}
