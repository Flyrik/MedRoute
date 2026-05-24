from ..models.parcours import Etape

TARIFS_SECU: dict[str, float] = {
    "Médecin généraliste": 26.50,
    "Cardiologue": 54.00,
    "Dermatologue": 54.00,
    "Gynécologue": 54.00,
    "Ophtalmologue": 54.00,
    "Orthopédiste": 54.00,
    "Neurologue": 54.00,
    "Psychiatre": 54.00,
    "Pneumologue": 54.00,
    "Gastro-entérologue": 54.00,
    "Endocrinologue": 54.00,
    "Rhumatologue": 54.00,
    "Kinésithérapeute": 16.13,
    "Infirmier": 12.00,
    "Biologiste": 0.0,
    "Radiologue": 0.0,
}

TAUX_REMBOURSEMENT = 0.70


def get_remboursement(type_praticien: str, cout: float) -> float:
    """Returns estimated sécu reimbursement for a single étape."""
    tp = type_praticien.lower()
    tarif_base: float | None = None
    for key, val in TARIFS_SECU.items():
        if key.lower() in tp or tp in key.lower():
            tarif_base = val
            break
    if tarif_base is None:
        tarif_base = cout * 0.5
    return round(min(tarif_base * TAUX_REMBOURSEMENT, cout), 2)


def calculate_financier(etapes: list[Etape]) -> dict:
    cout_total = sum(e.cout_estime_eur for e in etapes)

    secu = 0.0
    for etape in etapes:
        tarif_base = TARIFS_SECU.get(etape.type_praticien, etape.cout_estime_eur * 0.5)
        secu += min(tarif_base * TAUX_REMBOURSEMENT, etape.cout_estime_eur)

    rac = max(0.0, cout_total - secu)

    return {
        "cout_total": round(cout_total, 2),
        "secu": round(secu, 2),
        "rac": round(rac, 2),
    }
