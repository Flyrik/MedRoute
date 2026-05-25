import io
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from ..middleware.auth import verify_jwt
from ..db.supabase import get_supabase
from ..services.pdf_service import generate_parcours_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/parcours/{parcours_id}/pdf")
async def download_pdf(
    parcours_id: uuid.UUID,
    user: dict = Depends(verify_jwt),
):
    user_id = user.get("sub", "")
    supabase = get_supabase()

    result = supabase.table("parcours").select("*").eq("id", str(parcours_id)).single().execute()
    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    try:
        pdf_bytes = generate_parcours_pdf(row)
    except Exception as exc:
        logger.error("pdf_generation_error", extra={"parcours_id": str(parcours_id), "error": str(exc)})
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF")

    filename = f"parcours-{parcours_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
