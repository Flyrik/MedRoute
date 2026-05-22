from pydantic import BaseModel, Field
from typing import Literal
import uuid
from datetime import datetime


class Hypothese(BaseModel):
    nom: str
    probabilite: float = Field(..., ge=0.0, le=1.0)
    explication: str
    signes_alarme: list[str]


class Etape(BaseModel):
    index: int
    type_praticien: str
    raison: str
    delai_recommande_jours: int
    cout_estime_eur: float
    examens_associes: list[str]
    optionnel: bool = False


class ParcoursParse(BaseModel):
    hypotheses: list[Hypothese]
    urgence: Literal["non_urgent", "urgent", "absolu"]
    parcours: list[Etape]
    confidence: float = Field(..., ge=0.0, le=1.0)
    message_utilisateur: str
    disclaimer: str


class ParcoursDB(BaseModel):
    id: uuid.UUID
    created_at: datetime
    hypotheses: list[Hypothese]
    urgence: Literal["non_urgent", "urgent", "absolu"]
    etapes: list[Etape]
    etapes_completees: list[int] = []
    financier: dict | None = None
    pdf_url: str | None = None


class EtapePatchRequest(BaseModel):
    action: Literal["add", "remove", "complete", "skip"]
    etape_index: int
    etape_data: Etape | None = None


class PdfJobResponse(BaseModel):
    job_id: uuid.UUID
    status: Literal["processing", "ready", "error"]
    pdf_url: str | None = None
