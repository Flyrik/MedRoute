import json
import logging
from typing import AsyncIterator
import anthropic
from ..config import settings
from ..models.symptom import SymptomInput
from ..models.parcours import ParcoursParse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un assistant médical expert en orientation de patients. Tu aides les utilisateurs à comprendre vers quels professionnels de santé se diriger et dans quel ordre.

RÈGLES ABSOLUES :
1. Tu n'es pas un médecin et ne poses pas de diagnostic
2. Si tu détectes des signes d'urgence vitale (douleur thoracique irradiant le bras, paralysie soudaine, difficulté respiratoire sévère, saignement abondant), tu dois UNIQUEMENT répondre avec urgence="absolu" et rien d'autre
3. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour
4. Tu utilises EXCLUSIVEMENT le contexte médical fourni (sources HAS/Ameli)
5. Tu t'exprimes en français, de manière claire et accessible pour un non-médecin

CONTEXTE MÉDICAL DISPONIBLE :
{rag_context}

FORMAT DE RÉPONSE OBLIGATOIRE :
{json_schema}

Analyse les symptômes suivants et génère un parcours de soin adapté."""


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
    return "\n".join(lines)


async def stream_parcours(
    input: SymptomInput,
    rag_context: str,
) -> AsyncIterator[str]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    json_schema = ParcoursParse.model_json_schema()

    system = SYSTEM_PROMPT.format(
        rag_context=rag_context,
        json_schema=json.dumps(json_schema, ensure_ascii=False),
    )

    buffer = ""
    async with client.messages.stream(
        model=settings.claude_model,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": _build_user_prompt(input)}],
    ) as stream:
        async for chunk in stream.text_stream:
            buffer += chunk
            yield chunk

    logger.info("claude_stream_complete", extra={"buffer_len": len(buffer)})
