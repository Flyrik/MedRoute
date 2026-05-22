import random
from fastapi import APIRouter, Depends, Query
from ..middleware.auth import verify_jwt

router = APIRouter()

MOCK_NOMS = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Durand", "Leroy"]
MOCK_PRENOMS = ["Sophie", "Pierre", "Marie", "Jean", "Claire", "Paul", "Isabelle", "Marc"]


def _generate_mock_praticiens(type_praticien: str, city: str, count: int = 10) -> list[dict]:
    rng = random.Random(f"{type_praticien}{city}")
    praticiens = []
    for i in range(count):
        nom = rng.choice(MOCK_NOMS)
        prenom = rng.choice(MOCK_PRENOMS)
        delai = rng.randint(3, 45)
        praticiens.append({
            "id": f"mock_{i:03d}",
            "nom": f"Dr. {prenom} {nom}",
            "specialite": type_praticien,
            "secteur": rng.choice([1, 1, 2]),
            "adresse": f"{rng.randint(1, 150)} rue de la Paix, {city}",
            "lat": 48.8566 + rng.uniform(-0.05, 0.05),
            "lng": 2.3522 + rng.uniform(-0.05, 0.05),
            "prochain_rdv": f"2026-{rng.randint(5,7):02d}-{rng.randint(1,28):02d}",
            "delai_jours": delai,
            "doctolib_url": f"https://doctolib.fr/mock/{nom.lower()}-{i}",
        })
    return sorted(praticiens, key=lambda p: p["delai_jours"])


@router.get("")
async def get_praticiens(
    type: str = Query(...),
    city: str = Query(...),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    _user: dict = Depends(verify_jwt),
):
    praticiens = _generate_mock_praticiens(type, city)
    return {"praticiens": praticiens, "source": "mock", "cached": False}
