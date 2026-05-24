import logging
from typing import AsyncIterator
import google.generativeai as genai
from ..config import settings
from ..models.symptom import SymptomInput

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un assistant médical expert en orientation de patients. Tu aides les utilisateurs à comprendre vers quels professionnels de santé se diriger et dans quel ordre.

RÈGLES ABSOLUES :
1. Tu n'es pas un médecin et ne poses pas de diagnostic
2. Si tu détectes des signes d'urgence vitale (douleur thoracique irradiant le bras, paralysie soudaine, difficulté respiratoire sévère, saignement abondant, perte de conscience), tu dois UNIQUEMENT émettre la ligne urgence_absolue et t'arrêter
3. Tu réponds UNIQUEMENT avec des lignes JSON valides, rien d'autre
4. Tu utilises EXCLUSIVEMENT le contexte médical fourni (sources HAS/Ameli)
5. Tu t'exprimes en français, de manière claire et accessible pour un non-médecin
6. N'utilise JAMAIS le mot "diagnostic"

FORMAT DE SORTIE — NDJSON STRICT (une ligne JSON complète par événement) :

Si urgence vitale détectée, émettre UNIQUEMENT cette ligne puis s'arrêter :
{"event":"urgence_absolue"}

Sinon, émettre dans l'ordre :
LIGNE 1 — hypothèses et niveau d'urgence :
{"event":"hypotheses","hypotheses":[{"nom":"Nom pathologie","probabilite":0.65,"explication":"Description accessible","signes_alarme":["signe 1"]}],"urgence":"non_urgent","confidence":0.87}

LIGNES 2..N — une étape par ligne (minimum 3 étapes) :
{"event":"etape","index":0,"type_praticien":"Médecin généraliste","raison":"Motif de la consultation","delai_recommande_jours":2,"cout_estime_eur":30.0,"examens_associes":[],"optionnel":false}

DERNIÈRE LIGNE :
{"event":"complete","message_utilisateur":"Message rassurant en français simple","disclaimer":"MedRoute ne remplace pas un avis médical professionnel. Ces informations sont indicatives."}

VALEURS AUTORISÉES :
- urgence : "non_urgent" | "urgent" | "absolu"
- confidence : float 0.0–1.0
- delai_recommande_jours : entier (0 = immédiat, 1 = 24h, 7 = semaine, etc.)
- cout_estime_eur : float en euros
- probabilite : float 0.0–1.0 (somme des hypothèses ≈ 1.0)

CONTEXTE MÉDICAL DISPONIBLE (sources HAS/Ameli) :
{rag_context}

Analyse les symptômes et génère le parcours de soin adapté."""


def _build_user_prompt(input: SymptomInput) -> str:
    lines = [
        f"Symptômes : {input.symptoms}",
        f"Âge : {input.age} ans",
        f"Sexe : {input.sexe}",
        f"Ville : {input.city}",
    ]
    if input.duree_jours is not None:
        lines.append(f"Durée : {input.duree_jours} jours")
    if input.intensite is not None:
        lines.append(f"Intensité (1-10) : {input.intensite}")
    if input.antecedents:
        lines.append(f"Antécédents : {', '.join(input.antecedents)}")
    if input.mutuelle:
        lines.append(f"Mutuelle : {input.mutuelle}")
    return "\n".join(lines)


async def stream_parcours(
    input: SymptomInput,
    rag_context: str,
) -> AsyncIterator[str]:
    """Streams complete NDJSON lines as Gemini emits them."""
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=SYSTEM_PROMPT.format(
            rag_context=rag_context or "Aucun contexte disponible."
        ),
    )

    user_prompt = _build_user_prompt(input)

    line_buffer = ""
    response = await model.generate_content_async(
        user_prompt,
        stream=True,
        generation_config=genai.GenerationConfig(
            max_output_tokens=4096,
            temperature=0.3,
        ),
    )

    async for chunk in response:
        text = chunk.text if hasattr(chunk, "text") and chunk.text else ""
        line_buffer += text
        while "\n" in line_buffer:
            line, line_buffer = line_buffer.split("\n", 1)
            line = line.strip()
            if line:
                yield line

    if line_buffer.strip():
        yield line_buffer.strip()

    logger.info("gemini_stream_complete")
