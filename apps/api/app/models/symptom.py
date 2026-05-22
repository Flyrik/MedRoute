from pydantic import BaseModel, Field
from typing import Literal


class SymptomInput(BaseModel):
    symptoms: str = Field(..., min_length=10, max_length=2000)
    age: int = Field(..., ge=1, le=120)
    sexe: Literal["homme", "femme", "autre"]
    city: str = Field(..., max_length=100)
    duree_jours: int | None = Field(None, ge=0, le=3650)
    intensite: int | None = Field(None, ge=1, le=10)
    antecedents: list[str] | None = Field(None, max_length=20)
    mutuelle: str | None = Field(None, max_length=100)
