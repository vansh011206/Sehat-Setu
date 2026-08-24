"""
PDF Generator for SehatSetu Digital e-Prescriptions using ReportLab.
"""

from io import BytesIO
import os
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_prescription_pdf(prescription) -> ContentFile:
    """
    Builds a professional clinical e-prescription PDF using ReportLab
    and returns a Django ContentFile ready to be saved into FileField.
    """
    buffer = BytesIO()

    # Page setup: A4 with 0.4 inch margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    styles = getSampleStyleSheet()

    # Custom clinical palette
    c_primary = colors.HexColor("#0F766E")  # Teal 700
    c_dark = colors.HexColor("#0F172A")     # Slate 900
    c_muted = colors.HexColor("#64748B")    # Slate 500
    c_bg_light = colors.HexColor("#F8FAFC") # Slate 50
    c_border = colors.HexColor("#E2E8F0")   # Slate 200

    # Custom typography styles
    style_brand = ParagraphStyle(
        "BrandHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=c_primary,
    )
    style_subbrand = ParagraphStyle(
        "BrandSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=c_muted,
    )
    style_doc_name = ParagraphStyle(
        "DocName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=c_dark,
        alignment=2,  # Right align
    )
    style_doc_info = ParagraphStyle(
        "DocInfo",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=c_muted,
        alignment=2,  # Right align
    )
    style_section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=c_primary,
    )
    style_body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12.5,
        textColor=c_dark,
    )
    style_body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12.5,
        textColor=c_dark,
    )
    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )
    style_table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=c_dark,
    )
    style_signature = ParagraphStyle(
        "SignatureStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=11,
        leading=14,
        textColor=c_primary,
        alignment=2,
    )
    style_footer = ParagraphStyle(
        "FooterNotice",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=c_muted,
        alignment=1,  # Center
    )

    story = []

    doctor = prescription.doctor
    doctor_user = doctor.user
    patient = prescription.patient
    appointment = prescription.appointment
    issue_date = prescription.created_at or timezone.now()

    # ── 1. Header Banner (Brand + Doctor Details) ──
    header_left = [
        Paragraph("SEHATSETU", style_brand),
        Paragraph("Digital Telehealth & Clinical Network", style_subbrand),
        Paragraph("Government of India Telemedicine Guidelines 2020 Compliant", style_subbrand),
    ]

    doctor_title = f"Dr. {doctor_user.full_name}"
    specialty_name = doctor.specialty.name if hasattr(doctor, "specialty") and doctor.specialty else "General Physician"
    qualification = getattr(doctor, "qualification", "MBBS") or "MBBS, MD"
    reg_no = getattr(doctor, "registration_number", "REG-MCI-2026") or "REG-MCI-2026"
    city = getattr(doctor, "city", "New Delhi")

    header_right = [
        Paragraph(doctor_title, style_doc_name),
        Paragraph(f"{qualification} • {specialty_name}", style_doc_info),
        Paragraph(f"Medical Council Reg No: <b>{reg_no}</b>", style_doc_info),
        Paragraph(f"Clinic / Location: {city}", style_doc_info),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[240, 295],
    )
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceAfter=8))

    # ── 2. Patient & Prescription Metadata Block ──
    booking_code = appointment.booking_code if appointment else "DIRECT-RX"
    patient_name = patient.full_name
    patient_phone = patient.phone or "N/A"
    
    pat_info_data = [
        [
            Paragraph("<b>Patient Name:</b>", style_body),
            Paragraph(patient_name, style_body_bold),
            Paragraph("<b>Date of Issue:</b>", style_body),
            Paragraph(issue_date.strftime("%d %b %Y, %I:%M %p"), style_body),
        ],
        [
            Paragraph("<b>Patient Contact:</b>", style_body),
            Paragraph(patient_phone, style_body),
            Paragraph("<b>Booking Ref:</b>", style_body),
            Paragraph(booking_code, style_body_bold),
        ],
        [
            Paragraph("<b>Prescription ID:</b>", style_body),
            Paragraph(prescription.verification_code, style_body_bold),
            Paragraph("<b>Consultation Mode:</b>", style_body),
            Paragraph("Encrypted Video Telehealth", style_body),
        ],
    ]

    pat_table = Table(pat_info_data, colWidths=[95, 175, 110, 155])
    pat_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_bg_light),
            ("BOX", (0, 0), (-1, -1), 0.5, c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(pat_table)
    story.append(Spacer(1, 12))

    # ── 3. Clinical Diagnosis ──
    diag_box = [
        [
            Paragraph("CLINICAL DIAGNOSIS & ASSESSMENT", style_section_title),
        ],
        [
            Paragraph(prescription.diagnosis or "Clinical assessment completed via telehealth.", style_body),
        ],
    ]
    diag_table = Table(diag_box, colWidths=[535])
    diag_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDFA")), # Teal-50
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#99F6E4")), # Teal-200
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(diag_table)
    story.append(Spacer(1, 14))

    # ── 4. Rx — Prescribed Medications Table ──
    story.append(Paragraph("Rx — PRESCRIBED MEDICATIONS", style_section_title))
    story.append(Spacer(1, 4))

    med_headers = [
        Paragraph("#", style_table_header),
        Paragraph("Medicine Name", style_table_header),
        Paragraph("Dosage", style_table_header),
        Paragraph("Frequency", style_table_header),
        Paragraph("Duration", style_table_header),
        Paragraph("Instructions", style_table_header),
    ]

    med_rows = [med_headers]
    medicines = prescription.medicines if isinstance(prescription.medicines, list) else []

    if medicines:
        for idx, m in enumerate(medicines, start=1):
            med_rows.append([
                Paragraph(str(idx), style_table_cell),
                Paragraph(f"<b>{m.get('name', 'N/A')}</b>", style_table_cell),
                Paragraph(m.get("dosage", "-"), style_table_cell),
                Paragraph(m.get("frequency", "-"), style_table_cell),
                Paragraph(m.get("duration", "-"), style_table_cell),
                Paragraph(m.get("instructions", "-"), style_table_cell),
            ])
    else:
        med_rows.append([
            Paragraph("1", style_table_cell),
            Paragraph("No prescription drugs indicated. Continue supportive care.", style_table_cell),
            Paragraph("-", style_table_cell),
            Paragraph("-", style_table_cell),
            Paragraph("-", style_table_cell),
            Paragraph("-", style_table_cell),
        ])

    med_table = Table(
        med_rows,
        colWidths=[20, 160, 70, 95, 65, 125],
    )
    med_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), c_primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_bg_light]),
            ("BOX", (0, 0), (-1, -1), 0.5, c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
        ])
    )
    story.append(med_table)
    story.append(Spacer(1, 14))

    # ── 5. Physician Advice & Instructions ──
    if prescription.advice:
        advice_box = [
            [Paragraph("PHYSICIAN'S ADVICE & LIFESTYLE GUIDANCE", style_section_title)],
            [Paragraph(prescription.advice.replace("\n", "<br/>"), style_body)],
        ]
        adv_table = Table(advice_box, colWidths=[535])
        adv_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), c_bg_light),
                ("BOX", (0, 0), (-1, -1), 0.5, c_border),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(adv_table)
        story.append(Spacer(1, 10))

    # ── 6. Follow-up ──
    follow_up_days = prescription.follow_up_in_days
    follow_up_text = (
        f"Recommended follow-up in <b>{follow_up_days} days</b> or immediately in case of emergency / SOS."
        if follow_up_days
        else "Follow up with physician if symptoms persist or in case of emergency / SOS."
    )
    story.append(
        Paragraph(
            f"<b>Follow-up Note:</b> {follow_up_text}",
            style_body,
        )
    )
    story.append(Spacer(1, 18))

    # ── 7. Digital Signature & Verification Seal ──
    verify_url = f"http://localhost:5173/verify/{prescription.verification_code}"
    
    sig_left = [
        Paragraph("<b>SECURITY & AUTHENTICITY VALIDATION</b>", style_section_title),
        Paragraph(
            f"Verification Code: <b>{prescription.verification_code}</b>",
            style_body,
        ),
        Paragraph(
            f"Verify online at: <font color='#0F766E'><u>{verify_url}</u></font>",
            style_subbrand,
        ),
    ]

    sig_right = [
        Paragraph(f"<i>Digitally Signed by:</i>", style_doc_info),
        Paragraph(f"<b>{doctor_title}</b>", style_signature),
        Paragraph(f"Reg No: {reg_no}", style_doc_info),
        Paragraph(f"Timestamp: {issue_date.strftime('%Y-%m-%d %H:%M:%S UTC')}", style_doc_info),
        Paragraph("[Authentic Digital Telehealth e-Prescription]", style_doc_info),
    ]

    sig_table = Table([[sig_left, sig_right]], colWidths=[280, 255])
    sig_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_bg_light),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(KeepTogether([sig_table]))
    story.append(Spacer(1, 14))

    # ── 8. Legal Disclaimer Footer ──
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_border, spaceAfter=4))
    story.append(
        Paragraph(
            "This digital e-prescription is generated under the Information Technology Act 2000 and Indian Telemedicine Practice Guidelines 2020. "
            "Not valid for Schedule X / habit-forming narcotics. Dispensation must be verified by licensed pharmacist.",
            style_footer,
        )
    )

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()

    filename = f"Prescription_{prescription.verification_code}.pdf"
    return ContentFile(pdf_data, name=filename)
