import uuid
from fastapi import APIRouter, Depends, HTTPException
from ..middleware.auth import verify_jwt
from ..models.parcours import PdfJobResponse

router = APIRouter()

# En MVP : génération PDF async simulée (Puppeteer service à implémenter J17)
_jobs: dict[str, dict] = {}


@router.post("/parcours/{parcours_id}/pdf", status_code=202)
async def trigger_pdf(
    parcours_id: uuid.UUID,
    _user: dict = Depends(verify_jwt),
) -> PdfJobResponse:
    job_id = uuid.uuid4()
    _jobs[str(job_id)] = {"status": "processing", "parcours_id": str(parcours_id)}
    return PdfJobResponse(job_id=job_id, status="processing")


@router.get("/pdf/status/{job_id}")
async def pdf_status(
    job_id: uuid.UUID,
    _user: dict = Depends(verify_jwt),
) -> PdfJobResponse:
    job = _jobs.get(str(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return PdfJobResponse(job_id=job_id, status=job["status"], pdf_url=job.get("pdf_url"))
