"""
Celery tasks for asynchronous PDF generation of prescriptions.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_prescription_pdf_task(self, prescription_id: int):
    """
    Background worker task to build and save PDF for a given prescription.
    """
    from .models import Prescription
    from .pdf_generator import generate_prescription_pdf

    try:
        prescription = Prescription.objects.select_related(
            "doctor", "doctor__user", "doctor__specialty", "patient", "appointment"
        ).get(id=prescription_id)

        pdf_content = generate_prescription_pdf(prescription)
        filename = f"Prescription_{prescription.verification_code}.pdf"
        prescription.pdf_file.save(filename, pdf_content, save=True)
        logger.info(f"Successfully generated PDF for Prescription #{prescription_id}")
        return True
    except Exception as exc:
        logger.error(f"Error generating PDF for Prescription #{prescription_id}: {exc}")
        raise self.retry(exc=exc, countdown=5)
