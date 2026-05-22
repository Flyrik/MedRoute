from ..models.parcours import Etape

# Grille tarifaire sécu 2025 par type de praticien (tarif de base remboursable)
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
    "Biologiste": 0.0,   # remboursement variable selon les actes
    "Radiologue": 0.0,   # remboursement variable selon les actes
}

TAUX_REMBOURSEMENT = 0.70


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
