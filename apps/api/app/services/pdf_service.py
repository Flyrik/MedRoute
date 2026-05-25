from datetime import datetime
from fpdf import FPDF

MONTHS_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "août",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
}

URGENCE_LABELS = {
    "non_urgent": "Non urgent",
    "urgent": "Urgent",
    "absolu": "Urgence absolue",
}

GREEN = (29, 158, 117)
GREEN_600 = (22, 163, 74)
ZINC_900 = (24, 24, 27)
ZINC_600 = (82, 82, 91)
ZINC_500 = (113, 113, 122)
ZINC_400 = (161, 161, 170)
ZINC_200 = (228, 228, 231)
ZINC_100 = (244, 244, 245)


def _fr_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return f"{dt.day} {MONTHS_FR[dt.month]} {dt.year}"
    except Exception:
        return iso[:10] if len(iso) >= 10 else iso


class _MedRoutePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 17)
        self.set_text_color(*GREEN)
        self.cell(40, 10, "MedRoute", new_x="RIGHT", new_y="TOP")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*ZINC_400)
        self.cell(0, 10, "GPS du parcours de soin", new_x="LMARGIN", new_y="NEXT", align="R")
        self.set_draw_color(*ZINC_200)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-18)
        self.set_draw_color(*ZINC_200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(*ZINC_400)
        self.multi_cell(
            0, 4,
            "MedRoute ne remplace pas un avis medical professionnel. "
            "Ces informations sont indicatives. En cas d'urgence, appelez le 15.",
            align="C",
        )


def _section_title(pdf: _MedRoutePDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*ZINC_500)
    pdf.cell(0, 5, title.upper(), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)


def generate_parcours_pdf(row: dict) -> bytes:
    pdf = _MedRoutePDF()
    pdf.set_doc_option("core_fonts_encoding", "windows-1252")
    pdf.set_margins(14, 22, 14)
    pdf.set_auto_page_break(auto=True, margin=28)
    pdf.add_page()

    # ── Méta ──────────────────────────────────────────────────────────────────
    city = row.get("city", "")
    urgence_key = row.get("urgence_level", "non_urgent")
    urgence_label = URGENCE_LABELS.get(urgence_key, urgence_key)
    confidence = row.get("ai_confidence", 1.0)
    date_str = _fr_date(row.get("created_at", ""))

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*ZINC_500)
    meta_parts = [p for p in [
        f"Genere le {date_str}" if date_str else "",
        f"Ville : {city}" if city else "",
        f"Urgence : {urgence_label}",
        f"Confiance IA : {round(confidence * 100)}%",
    ] if p]
    pdf.cell(0, 5, "  .  ".join(meta_parts), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(7)

    # ── Hypothèses ────────────────────────────────────────────────────────────
    hypotheses = row.get("hypotheses", [])
    if hypotheses:
        _section_title(pdf, "Hypotheses probables")
        for h in hypotheses:
            proba = round(h.get("probabilite", 0) * 100)
            pathologie = h.get("pathologie", "")
            description = h.get("description", "")
            alerte = h.get("alerte", False)
            alerte_suffix = "  [A ecarter]" if alerte else ""

            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(*GREEN)
            pdf.cell(16, 7, f"{proba}%", new_x="RIGHT", new_y="TOP")

            pdf.set_text_color(*ZINC_900)
            pdf.cell(0, 7, f"{pathologie}{alerte_suffix}", new_x="LMARGIN", new_y="NEXT")

            if description:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(*ZINC_500)
                pdf.set_x(pdf.l_margin + 16)
                pdf.multi_cell(0, 5, description)
            pdf.ln(3)
        pdf.ln(2)

    # ── Parcours ──────────────────────────────────────────────────────────────
    etapes = row.get("etapes", [])
    completees = set(row.get("etapes_completees", []))

    if etapes:
        _section_title(pdf, "Votre parcours de soin")

        for i, etape in enumerate(etapes):
            idx = etape.get("index", i)
            type_praticien = etape.get("type_praticien", "")
            motif = etape.get("motif", "")
            delai = etape.get("delai", "")
            cout = etape.get("cout_estime", 0)
            secu = etape.get("remboursement_secu", 0)
            rac = max(0, cout - secu)
            is_done = idx in completees

            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_text_color(*ZINC_400)
            pdf.cell(0, 4.5, f"Etape {i + 1}", new_x="LMARGIN", new_y="NEXT")

            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*ZINC_500 if is_done else ZINC_900)
            checkbox = "[OK] " if is_done else "[  ] "
            pdf.cell(14, 7, checkbox, new_x="RIGHT", new_y="TOP")

            available_w = pdf.w - pdf.l_margin - pdf.r_margin - 14
            badge_w = min(pdf.get_string_width(delai) + 8, 45)

            pdf.cell(available_w - badge_w, 7, type_praticien, new_x="RIGHT", new_y="TOP")

            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*ZINC_500)
            pdf.set_fill_color(*ZINC_100)
            pdf.cell(badge_w, 7, delai, new_x="LMARGIN", new_y="NEXT", align="C", fill=True)

            if motif:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(*ZINC_600)
                pdf.set_x(pdf.l_margin + 14)
                pdf.multi_cell(0, 5, motif)

            pdf.set_x(pdf.l_margin + 14)
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*ZINC_900)
            pdf.cell(30, 5.5, f"~{cout}EUR", new_x="RIGHT", new_y="TOP")
            pdf.set_text_color(*GREEN_600)
            pdf.cell(35, 5.5, f"Secu : {secu}EUR", new_x="RIGHT", new_y="TOP")
            pdf.set_text_color(*ZINC_500)
            pdf.cell(0, 5.5, f"RAC : {rac}EUR", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        pdf.ln(1)

    # ── Financier ─────────────────────────────────────────────────────────────
    cout_total = row.get("cout_total_estime", 0) or 0
    rac_total = row.get("rac_estime", 0) or 0
    secu_total = round(cout_total - rac_total, 2)

    if cout_total > 0:
        _section_title(pdf, "Estimation financiere")

        col_w = (pdf.w - pdf.l_margin - pdf.r_margin) / 3

        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(*ZINC_900)
        pdf.cell(col_w, 9, f"{cout_total}EUR", new_x="RIGHT", new_y="TOP", align="C")
        pdf.set_text_color(*GREEN_600)
        pdf.cell(col_w, 9, f"{secu_total}EUR", new_x="RIGHT", new_y="TOP", align="C")
        pdf.set_text_color(*GREEN)
        pdf.cell(col_w, 9, f"{rac_total}EUR", new_x="LMARGIN", new_y="NEXT", align="C")

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*ZINC_500)
        pdf.cell(col_w, 5, "Cout total estime", new_x="RIGHT", new_y="TOP", align="C")
        pdf.cell(col_w, 5, "Rembourse Secu", new_x="RIGHT", new_y="TOP", align="C")
        pdf.cell(col_w, 5, "Reste a charge", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)

        bar_w = pdf.w - pdf.l_margin - pdf.r_margin
        pct = min(1.0, secu_total / cout_total if cout_total > 0 else 0)
        y = pdf.get_y()
        pdf.set_fill_color(*ZINC_200)
        pdf.rect(pdf.l_margin, y, bar_w, 5, "F")
        if pct > 0:
            pdf.set_fill_color(34, 197, 94)
            pdf.rect(pdf.l_margin, y, bar_w * pct, 5, "F")
        pdf.ln(8)

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*ZINC_400)
        pdf.cell(
            0, 5,
            f"{round(pct * 100)}% rembourse par l'Assurance Maladie",
            new_x="LMARGIN", new_y="NEXT", align="C",
        )

    return bytes(pdf.output())
