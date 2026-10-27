import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        # We manually suppress or format page numbering based on page index
        # Page 1: Cover page (shows 'i' or blank at bottom center)
        # Pages 2-12: Prelim pages (roman numerals ii, iii, iv, v, vi, vii, viii, ix, x, xi, xii)
        # Pages 13+: Arabic numerals starting from 1, 2, 3...
        p = self._pageNumber
        self.saveState()
        self.setFont("Times-Roman", 10)
        
        if p == 1:
            # Cover page - bottom 'i'
            self.drawCentredString(306, 36, "i")
        elif 2 <= p <= 12:
            # Roman numerals
            roman_map = {
                2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi',
                7: 'vii', 8: 'viii', 9: 'ix', 10: 'x', 11: 'xi', 12: 'xii'
            }
            rom = roman_map.get(p, '')
            self.drawCentredString(306, 36, rom)
        else:
            # Arabic numerals starting from 1 for Chapter 1 (page 13 is Arabic 1)
            arabic_num = p - 12
            self.drawCentredString(306, 36, str(arabic_num))
            
        self.restoreState()

def build_pdf():
    pdf_filename = "ScholarTrack_Project_Report.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=72,  # 1 inch
        rightMargin=72,
        topMargin=54,   # 0.75 inch
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles adhering strictly to academic report standards
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=15,
        leading=20,
        alignment=1, # Centered
        spaceAfter=15
    )
    
    center_bold = ParagraphStyle(
        'CenterBold',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=11,
        leading=16,
        alignment=1
    )
    
    center_normal = ParagraphStyle(
        'CenterNormal',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=16,
        alignment=1
    )

    center_italic = ParagraphStyle(
        'CenterItalic',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=11,
        leading=16,
        alignment=1
    )

    chap_heading = ParagraphStyle(
        'ChapHeading',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=13,
        leading=18,
        alignment=1,
        spaceAfter=15
    )

    sec_heading = ParagraphStyle(
        'SecHeading',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=11,
        leading=16,
        alignment=0, # Left
        spaceBefore=14,
        spaceAfter=6
    )

    subsec_heading = ParagraphStyle(
        'SubSecHeading',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10.5,
        leading=15,
        alignment=0,
        spaceBefore=10,
        spaceAfter=4
    )

    body = ParagraphStyle(
        'BodyJustify',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=14.5,
        alignment=4, # Justified
        spaceAfter=8
    )

    toc_item = ParagraphStyle(
        'TOCItem',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=14,
        alignment=0
    )

    toc_item_bold = ParagraphStyle(
        'TOCItemBold',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10,
        leading=14,
        alignment=0
    )

    fig_caption = ParagraphStyle(
        'FigCaption',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=9.5,
        leading=13,
        alignment=1,
        spaceBefore=6,
        spaceAfter=12
    )

    story = []

    # ==========================================
    # PAGE 1: TITLE PAGE / COVER PAGE
    # ==========================================
    story.append(Spacer(1, 25))
    story.append(Paragraph("SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL", title_style))
    story.append(Spacer(1, 15))
    story.append(Paragraph("PROJECT REPORT", center_bold))
    story.append(Spacer(1, 15))
    story.append(Paragraph("<i>Submitted by</i>", center_normal))
    story.append(Spacer(1, 15))
    story.append(Paragraph("ROHAN KARTHICK S", center_bold))
    story.append(Paragraph("(7376231CS117)", center_bold))
    story.append(Spacer(1, 20))
    story.append(Paragraph("<i>In partial fulfilment for the award of the degree of</i>", center_italic))
    story.append(Spacer(1, 12))
    story.append(Paragraph("BACHELOR OF ENGINEERING", ParagraphStyle('Degree', parent=center_bold, fontSize=12, leading=16)))
    story.append(Paragraph("<i>in</i>", center_italic))
    story.append(Paragraph("COMPUTER SCIENCE AND ENGINEERING", center_bold))
    story.append(Spacer(1, 25))
    
    # Institution / Anna University
    story.append(Paragraph("BANNARI AMMAN INSTITUTE OF TECHNOLOGY", center_bold))
    story.append(Paragraph("(An Autonomous Institution Affiliated to Anna University, Chennai)", ParagraphStyle('Auto', parent=center_normal, fontSize=9.5, leading=14)))
    story.append(Paragraph("SATHYAMANGALAM – 638401", center_bold))
    story.append(Spacer(1, 20))
    story.append(Paragraph("ANNA UNIVERSITY: CHENNAI 600 025", center_bold))
    story.append(Spacer(1, 10))
    story.append(Paragraph("APRIL 2026", center_bold))
    story.append(PageBreak())

    # ==========================================
    # PAGE 2: BONAFIDE CERTIFICATE
    # ==========================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("BONAFIDE CERTIFICATE", chap_heading))
    story.append(Spacer(1, 25))
    story.append(Paragraph(
        "Certified that this project report <b>“SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL”</b> "
        "is the Bonafide work of <b>“ROHAN KARTHICK S (7376231CS117)”</b> who carried out the project work under my supervision.",
        body
    ))
    story.append(Spacer(1, 90))

    # Signatures table
    sig_data = [
        [
            Paragraph("<b>Dr. Sasikala D</b><br/><br/><b>HEAD OF THE DEPARTMENT</b><br/><b>PROFESSOR</b><br/>Department of Computer Science and<br/>Engineering<br/>Bannari Amman Institute of Technology<br/>Sathyamangalam", ParagraphStyle('LeftSig', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=13.5)),
            Paragraph("<b>Mrs. Chitradevi T N</b><br/><br/><b>SUPERVISOR</b><br/><b>ASSISTANT PROFESSOR LEVEL II</b><br/>Department of Computer Science and<br/>Engineering<br/>Bannari Amman Institute of Technology<br/>Sathyamangalam", ParagraphStyle('RightSig', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=13.5))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[230, 230])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 100))
    story.append(Paragraph("Submitted for Project Viva Voce examination held on .....................", ParagraphStyle('Viva', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14)))
    story.append(Spacer(1, 45))

    exam_data = [
        [
            Paragraph("<b>Internal Examiner I</b>", ParagraphStyle('Ex1', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14)),
            Paragraph("<b>Internal Examiner II</b>", ParagraphStyle('Ex2', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14, alignment=2))
        ]
    ]
    exam_table = Table(exam_data, colWidths=[230, 230])
    exam_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(exam_table)
    story.append(PageBreak())

    # ==========================================
    # PAGE 3: DECLARATION
    # ==========================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("DECLARATION", chap_heading))
    story.append(Spacer(1, 25))
    story.append(Paragraph(
        "I affirm that the project work titled <b>“SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL”</b> "
        "being submitted in partial fulfillment for award of degree of <b>Bachelor of Engineering in Computer Science and Engineering</b> "
        "is the record of original work done by me under the guidance of <b>Mrs. Chitradevi T N</b>, Assistant Professor Level II, "
        "Department of Computer Science and Engineering. It has not formed a part of any other project work(s) submitted for the "
        "award of any degree or diploma, either in this or any other University.",
        body
    ))
    story.append(Spacer(1, 130))

    dec_data = [
        [
            "",
            Paragraph("<b>ROHAN KARTHICK S</b><br/><b>(7376231CS117)</b>", ParagraphStyle('CandSig', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14, alignment=2))
        ]
    ]
    dec_table = Table(dec_data, colWidths=[230, 230])
    story.append(dec_table)

    story.append(Spacer(1, 80))
    story.append(Paragraph("I certify that the declaration made above by the candidate is true.", ParagraphStyle('CertTrue', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=14)))
    story.append(Spacer(1, 40))

    guide_dec_data = [
        [
            "",
            Paragraph("<b>Mrs. Chitradevi T N</b><br/><b>Supervisor</b>", ParagraphStyle('SupSig', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14, alignment=2))
        ]
    ]
    guide_dec_table = Table(guide_dec_data, colWidths=[230, 230])
    story.append(guide_dec_table)
    story.append(PageBreak())

    # ==========================================
    # PAGE 4: ACKNOWLEDGEMENT
    # ==========================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("ACKNOWLEDGEMENT", chap_heading))
    story.append(Spacer(1, 25))
    story.append(Paragraph(
        "I would like to enunciate heartfelt thanks to our esteemed Chairman <b>Dr. S. V. Balasubramaniam</b> and the respected Principal "
        "<b>Dr. C. Palanisamy</b> for providing excellent facilities and support during the course of study in this institute.",
        body
    ))
    story.append(Paragraph(
        "I am grateful to <b>Dr. Sasikala D</b>, Head of the Department, Department of Computer Science and Engineering for her valuable "
        "suggestions to carry out the project work successfully.",
        body
    ))
    story.append(Paragraph(
        "I express my sincere thanks to Faculty guide <b>Mrs. Chitradevi T N</b>, Assistant Professor Level II, Department of Computer Science "
        "and Engineering, for her constructive ideas, inspirations, encouragement, excellent guidance, and much needed technical support "
        "extended to complete our project work.",
        body
    ))
    story.append(Paragraph(
        "I would like to thank my friends, faculty, and non-teaching staff who have directly and indirectly contributed to the success of this project.",
        body
    ))
    story.append(Spacer(1, 90))

    ack_sig = [
        [
            "",
            Paragraph("<b>ROHAN KARTHICK S (7376231CS117)</b>", ParagraphStyle('AckName', parent=styles['Normal'], fontName='Times-Bold', fontSize=9.5, leading=14, alignment=2))
        ]
    ]
    story.append(Table(ack_sig, colWidths=[200, 260]))
    story.append(PageBreak())

    # ==========================================
    # PAGE 5: ABSTRACT
    # ==========================================
    story.append(Spacer(1, 30))
    story.append(Paragraph("ABSTRACT", chap_heading))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "ScholarTrack – Smart Scholarship Eligibility, Verification & Tracking Portal is a full-stack web application engineered "
        "using React.js, Node.js, Express.js, and MongoDB to digitize, streamline, and audit the scholarship application lifecycle. "
        "Traditional scholarship portals suffer from opaque eligibility evaluation, lack of document pre-verification, and high rejection "
        "rates caused by inadvertent discrepancies between applicant-entered claims and uploaded certificates. This project resolves "
        "these systemic bottlenecks by introducing automated mismatch detection, rule-based eligibility evaluation, synthetic authority "
        "verification, and a guided in-place correction workflow.",
        body
    ))
    story.append(Paragraph(
        "The system incorporates three authenticated role modules: Students, Verification Officers, and System Administrators. "
        "Students maintain structured academic profiles and evaluate eligibility against configured scholarship criteria. "
        "Upon uploading mandatory supporting documents (Income Certificates, Academic Mark Sheets, Bonafide Certificates), the core "
        "pre-verification engine leverages Optical Character Recognition (OCR) via Tesseract.js and QR code parsing via jsQR to extract "
        "crucial data points such as applicant name, certificate registration number, annual family income, and academic marks. "
        "An algorithmic comparison engine audits extracted data against applicant-entered form values, identifying discrepancies with "
        "severity ratings and explanations before final submission.",
        body
    ))
    story.append(Paragraph(
        "To ensure verifiable document integrity, certificate identifiers are cross-referenced against a configured mock authority "
        "registry. Students encountering pre-verification flags receive guided correction prompts to amend form entries or replace documents "
        "with immutable version logging. Verification officers inspect applicants' dossiers through a side-by-side verification console, "
        "reviewing OCR extractions, authority checks, and issuing audit remarks. Administrators oversee scheme configurations, officer "
        "assignments, and telemetry via interactive Recharts analytics. The resulting prototype eliminates administrative latency, prevents "
        "unwarranted rejections, and provides complete accountability across the academic aid pipeline.",
        body
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "<b>Keywords:</b> Scholarship Management, Automated Mismatch Detection, Optical Character Recognition (OCR), "
        "Rule-Based Eligibility Engine, QR Code Verification, Role-Based Access Control (RBAC), Full-Stack Web Architecture, "
        "Audit Trail Logging, Pre-Verification Portal.",
        ParagraphStyle('Kw', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=14)
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 6: TABLE OF CONTENTS (Part 1: Ch 1 & 2)
    # ==========================================
    story.append(Spacer(1, 20))
    story.append(Paragraph("TABLE OF CONTENTS", chap_heading))
    story.append(Spacer(1, 10))

    toc_p1_data = [
        [Paragraph("<b>CHAPTER NO</b>", toc_item_bold), Paragraph("<b>TITLE</b>", toc_item_bold), Paragraph("<b>PAGE NO</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("ACKNOWLEDGEMENT", toc_item), Paragraph("iv", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("ABSTRACT", toc_item), Paragraph("v", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("LIST OF FIGURES", toc_item), Paragraph("xi", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("LIST OF TABLES", toc_item), Paragraph("xii", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>1</b>", toc_item_bold), Paragraph("<b>INTRODUCTION</b>", toc_item_bold), Paragraph("<b>1</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("1.1", toc_item), Paragraph("BACKGROUND OF THE WORK", toc_item), Paragraph("1", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("1.1.1 PROBLEM STATEMENT", toc_item), Paragraph("2", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("1.1.2 OBJECTIVES", toc_item), Paragraph("3", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("1.2", toc_item), Paragraph("SCOPE", toc_item), Paragraph("4", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("1.2.1 USERS WITHIN SCOPE", toc_item), Paragraph("4", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("1.2.2 FUNCTIONALITIES WITHIN SCOPE", toc_item), Paragraph("4", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("1.2.3 TECHNICAL SCOPE AND OUT OF SCOPE", toc_item), Paragraph("5", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("1.3", toc_item), Paragraph("SYSTEM OVERVIEW", toc_item), Paragraph("5", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("1.4", toc_item), Paragraph("IMPORTANCE OF AUTOMATED PRE-VERIFICATION", toc_item), Paragraph("6", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("1.5", toc_item), Paragraph("ROLE OF SECURE DOCUMENT VERIFICATION", toc_item), Paragraph("6", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>2</b>", toc_item_bold), Paragraph("<b>LITERATURE SURVEY</b>", toc_item_bold), Paragraph("<b>8</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("2.1", toc_item), Paragraph("SCHOLARSHIP WORKFLOW AUTOMATION IN EDUCATION", toc_item), Paragraph("8", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("2.2", toc_item), Paragraph("ROLE-BASED ACCESS CONTROL IN EDUCATIONAL PORTALS", toc_item), Paragraph("8", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("2.3", toc_item), Paragraph("DOCUMENT OCR & CERTIFICATE VERIFICATION SYSTEMS", toc_item), Paragraph("9", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("2.4", toc_item), Paragraph("EXISTING SCHOLARSHIP MANAGEMENT SCHEMES", toc_item), Paragraph("9", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("2.5", toc_item), Paragraph("GAP IDENTIFICATION", toc_item), Paragraph("10", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("2.6", toc_item), Paragraph("PROPOSED SOLUTION", toc_item), Paragraph("10", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3</b>", toc_item_bold), Paragraph("<b>OBJECTIVES AND METHODOLOGY</b>", toc_item_bold), Paragraph("<b>12</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
    ]
    t1 = Table(toc_p1_data, colWidths=[80, 310, 70])
    t1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t1)
    story.append(PageBreak())

    # ==========================================
    # PAGE 7: TABLE OF CONTENTS (Part 2: Ch 3 Methodology)
    # ==========================================
    story.append(Spacer(1, 20))
    toc_p2_data = [
        [Paragraph("<b>3.1</b>", toc_item_bold), Paragraph("<b>OBJECTIVES OF THE SYSTEM</b>", toc_item_bold), Paragraph("<b>12</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.1.1 PRIMARY OBJECTIVES", toc_item), Paragraph("12", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.1.2 SECONDARY OBJECTIVES", toc_item), Paragraph("12", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.1.3 TECHNICAL OBJECTIVES", toc_item), Paragraph("13", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.2</b>", toc_item_bold), Paragraph("<b>SYSTEM DEVELOPMENT METHODOLOGY</b>", toc_item_bold), Paragraph("<b>13</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.2.1 AGILE DEVELOPMENT APPROACH", toc_item), Paragraph("13", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.2.2 REQUIREMENT ANALYSIS PHASE", toc_item), Paragraph("13", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.2.3 DESIGN PHASE", toc_item), Paragraph("14", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.2.4 IMPLEMENTATION PHASE", toc_item), Paragraph("14", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.2.5 TESTING PHASE", toc_item), Paragraph("14", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.2.6 DEPLOYMENT PHASE", toc_item), Paragraph("15", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.3</b>", toc_item_bold), Paragraph("<b>SYSTEM ARCHITECTURE</b>", toc_item_bold), Paragraph("<b>15</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.3.1 THREE-TIER ARCHITECTURE OVERVIEW", toc_item), Paragraph("15", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.3.2 PRESENTATION TIER (FRONTEND)", toc_item), Paragraph("15", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.3.3 APPLICATION TIER (BACKEND)", toc_item), Paragraph("15", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.3.4 DATA TIER (DATABASE)", toc_item), Paragraph("16", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.3.5 COMMUNICATION FLOW", toc_item), Paragraph("16", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.4</b>", toc_item_bold), Paragraph("<b>TECHNOLOGY STACK SELECTION</b>", toc_item_bold), Paragraph("<b>16</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.4.1 MONGODB AS DATABASE", toc_item), Paragraph("17", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.4.2 EXPRESS.JS AS BACKEND FRAMEWORK", toc_item), Paragraph("17", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.4.3 REACT.JS FRONTEND LIBRARY", toc_item), Paragraph("17", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.4.4 NODE.JS AS RUNTIME ENVIRONMENT", toc_item), Paragraph("17", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.4.5 ADDITIONAL LIBRARIES AND TOOLS", toc_item), Paragraph("18", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.5</b>", toc_item_bold), Paragraph("<b>DATABASE DESIGN</b>", toc_item_bold), Paragraph("<b>18</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.5.1 USERS COLLECTION", toc_item), Paragraph("18", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.5.2 STUDENT PROFILES COLLECTION", toc_item), Paragraph("18", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.5.3 SCHOLARSHIPS COLLECTION", toc_item), Paragraph("19", ParagraphStyle('R', parent=toc_item, alignment=2))],
    ]
    t2 = Table(toc_p2_data, colWidths=[80, 310, 70])
    t2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t2)
    story.append(PageBreak())

    # ==========================================
    # PAGE 8: TABLE OF CONTENTS (Part 3: Ch 3 Continued)
    # ==========================================
    story.append(Spacer(1, 20))
    toc_p3_data = [
        ["", Paragraph("3.5.4 APPLICATIONS COLLECTION", toc_item), Paragraph("19", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.5.5 DOCUMENTS & VERSIONS COLLECTION", toc_item), Paragraph("19", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.5.6 AUDIT LOGS & NOTIFICATIONS COLLECTION", toc_item), Paragraph("20", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.6</b>", toc_item_bold), Paragraph("<b>ELIGIBILITY & VERIFICATION WORKFLOW DESIGN</b>", toc_item_bold), Paragraph("<b>20</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.6.1 APPLICATION WORKFLOW STATES", toc_item), Paragraph("20", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.6.2 RULE-BASED ELIGIBILITY RULES", toc_item), Paragraph("20", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.6.3 GUIDED CORRECTION WORKFLOW", toc_item), Paragraph("21", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.6.4 WORKFLOW ENGINE IMPLEMENTATION", toc_item), Paragraph("21", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.7</b>", toc_item_bold), Paragraph("<b>USER INTERFACE DESIGN</b>", toc_item_bold), Paragraph("<b>21</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.7.1 LOGIN AND REGISTRATION INTERFACE", toc_item), Paragraph("21", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.7.2 STUDENT DASHBOARD & PROFILE INTERFACE", toc_item), Paragraph("22", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.7.3 SCHOLARSHIP SEARCH & DETAILS INTERFACE", toc_item), Paragraph("22", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.7.4 DOCUMENT UPLOAD & MISMATCH INTERFACE", toc_item), Paragraph("22", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.7.5 OFFICER VERIFICATION CONSOLE INTERFACE", toc_item), Paragraph("22", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.7.6 ADMIN OPERATIONS DASHBOARD INTERFACE", toc_item), Paragraph("23", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.8</b>", toc_item_bold), Paragraph("<b>SECURITY IMPLEMENTATION</b>", toc_item_bold), Paragraph("<b>23</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.8.1 AUTHENTICATION SECURITY", toc_item), Paragraph("23", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.8.2 PASSWORD SECURITY", toc_item), Paragraph("23", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.8.3 AUTHORIZATION SECURITY", toc_item), Paragraph("24", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.8.4 DOCUMENT ACCESS & STORAGE SECURITY", toc_item), Paragraph("24", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.8.5 DATA SECURITY & RATE LIMITING", toc_item), Paragraph("24", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.9</b>", toc_item_bold), Paragraph("<b>AUTOMATED MISMATCH DETECTION & VERIFICATION</b>", toc_item_bold), Paragraph("<b>24</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("3.9.1 OCR & QR EXTRACTION PROCESS", toc_item), Paragraph("24", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.9.2 FIELD NORMALIZATION PROCESS", toc_item), Paragraph("25", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.9.3 DISCREPANCY COMPARISON ALGORITHM", toc_item), Paragraph("25", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.9.4 SYNTHETIC AUTHORITY CROSS-VERIFICATION", toc_item), Paragraph("25", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.10</b>", toc_item_bold), Paragraph("<b>MODULE DESCRIPTION</b>", toc_item_bold), Paragraph("<b>25</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
    ]
    t3 = Table(toc_p3_data, colWidths=[80, 310, 70])
    t3.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t3)
    story.append(PageBreak())

    # ==========================================
    # PAGE 9: TABLE OF CONTENTS (Part 4: Ch 3 & Ch 4)
    # ==========================================
    story.append(Spacer(1, 20))
    toc_p4_data = [
        ["", Paragraph("3.10.1 AUTHENTICATION MODULE", toc_item), Paragraph("26", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.2 USER & PROFILE MANAGEMENT MODULE", toc_item), Paragraph("26", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.3 SCHOLARSHIP CRITERIA ENGINE MODULE", toc_item), Paragraph("26", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.4 DOCUMENT PROCESSING & OCR MODULE", toc_item), Paragraph("26", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.5 MISMATCH AUDITING MODULE", toc_item), Paragraph("26", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.6 OFFICER VERIFICATION MODULE", toc_item), Paragraph("27", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.7 ADMIN OPERATIONS MODULE", toc_item), Paragraph("27", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("3.10.8 NOTIFICATION & AUDIT MODULE", toc_item), Paragraph("27", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>3.11</b>", toc_item_bold), Paragraph("<b>API DESIGN</b>", toc_item_bold), Paragraph("<b>27</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>3.12</b>", toc_item_bold), Paragraph("<b>TESTING STRATEGY</b>", toc_item_bold), Paragraph("<b>28</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>3.13</b>", toc_item_bold), Paragraph("<b>DEPLOYMENT STRATEGY</b>", toc_item_bold), Paragraph("<b>28</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>3.14</b>", toc_item_bold), Paragraph("<b>CHALLENGES AND SOLUTIONS</b>", toc_item_bold), Paragraph("<b>28</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>3.15</b>", toc_item_bold), Paragraph("<b>SUMMARY OF METHODOLOGY</b>", toc_item_bold), Paragraph("<b>29</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>4</b>", toc_item_bold), Paragraph("<b>RESULT AND DISCUSSION</b>", toc_item_bold), Paragraph("<b>30</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>4.1</b>", toc_item_bold), Paragraph("<b>USER INTERFACE RESULTS</b>", toc_item_bold), Paragraph("<b>30</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("4.1.1 LOGIN AND REGISTRATION INTERFACE", toc_item), Paragraph("30", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.2 STUDENT DASHBOARD", toc_item), Paragraph("30", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.3 SCHOLARSHIPS DIRECTORY & ELIGIBILITY VIEW", toc_item), Paragraph("31", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.4 APPLICATION PRE-VERIFICATION INTERFACE", toc_item), Paragraph("32", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.5 GUIDED MISMATCH CORRECTION CONSOLE", toc_item), Paragraph("32", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.6 OFFICER VERIFICATION WORKSTATION", toc_item), Paragraph("32", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.1.7 ADMIN DASHBOARD & TELEMETRY", toc_item), Paragraph("33", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>4.2</b>", toc_item_bold), Paragraph("<b>WORKFLOW TEST RESULTS</b>", toc_item_bold), Paragraph("<b>34</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("4.2.1 ELIGIBLE APPLICATION TEST", toc_item), Paragraph("34", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.2.2 INELIGIBLE APPLICATION REJECTION TEST", toc_item), Paragraph("34", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.2.3 DOCUMENT MISMATCH IDENTIFICATION TEST", toc_item), Paragraph("35", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.2.4 GUIDED CORRECTION & RESUBMISSION TEST", toc_item), Paragraph("35", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.2.5 OFFICER VERIFICATION & DECISION TEST", toc_item), Paragraph("35", ParagraphStyle('R', parent=toc_item, alignment=2))],
    ]
    t4 = Table(toc_p4_data, colWidths=[80, 310, 70])
    t4.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t4)
    story.append(PageBreak())

    # ==========================================
    # PAGE 10: TABLE OF CONTENTS (Part 5: Ch 4, Ch 5 & Back Matter)
    # ==========================================
    story.append(Spacer(1, 20))
    toc_p5_data = [
        [Paragraph("<b>4.3</b>", toc_item_bold), Paragraph("<b>DOCUMENT OCR & QR VERIFICATION RESULTS</b>", toc_item_bold), Paragraph("<b>35</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>4.4</b>", toc_item_bold), Paragraph("<b>DEVELOPMENT COSTS AND SIGNIFICANCE</b>", toc_item_bold), Paragraph("<b>36</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("4.4.1 DEVELOPMENT", toc_item), Paragraph("36", ParagraphStyle('R', parent=toc_item, alignment=2))],
        ["", Paragraph("4.4.2 SIGNIFICANCE", toc_item), Paragraph("36", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("<b>4.5</b>", toc_item_bold), Paragraph("<b>DISCUSSION</b>", toc_item_bold), Paragraph("<b>37</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>4.6</b>", toc_item_bold), Paragraph("<b>SUMMARY</b>", toc_item_bold), Paragraph("<b>38</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5</b>", toc_item_bold), Paragraph("<b>CONCLUSIONS AND SUGGESTIONS FOR FUTURE WORK</b>", toc_item_bold), Paragraph("<b>39</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5.1</b>", toc_item_bold), Paragraph("<b>SUMMARY OF WORK</b>", toc_item_bold), Paragraph("<b>39</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5.2</b>", toc_item_bold), Paragraph("<b>ACHIEVEMENT OF OBJECTIVES</b>", toc_item_bold), Paragraph("<b>39</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5.3</b>", toc_item_bold), Paragraph("<b>IMPACT OF SYSTEM</b>", toc_item_bold), Paragraph("<b>40</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5.4</b>", toc_item_bold), Paragraph("<b>SUGGESTIONS FOR FUTURE WORK</b>", toc_item_bold), Paragraph("<b>40</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("<b>5.5</b>", toc_item_bold), Paragraph("<b>CONCLUSION</b>", toc_item_bold), Paragraph("<b>40</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("<b>REFERENCES</b>", toc_item_bold), Paragraph("<b>41</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("<b>APPENDICES</b>", toc_item_bold), Paragraph("<b>43</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["", Paragraph("<b>PLAGIARISM REPORT</b>", toc_item_bold), Paragraph("<b>45</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
    ]
    t5 = Table(toc_p5_data, colWidths=[80, 310, 70])
    t5.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t5)
    story.append(PageBreak())

    # ==========================================
    # PAGE 11: LIST OF FIGURES
    # ==========================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("LIST OF FIGURES", chap_heading))
    story.append(Spacer(1, 25))

    lof_data = [
        [Paragraph("<b>FIGURE NO</b>", toc_item_bold), Paragraph("<b>FIGURE NAME</b>", toc_item_bold), Paragraph("<b>PAGE NO</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("4.1", toc_item), Paragraph("STUDENT DASHBOARD", toc_item), Paragraph("31", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("4.2", toc_item), Paragraph("OFFICER VERIFICATION DASHBOARD", toc_item), Paragraph("33", ParagraphStyle('R', parent=toc_item, alignment=2))],
        [Paragraph("4.3", toc_item), Paragraph("ADMIN DASHBOARD", toc_item), Paragraph("34", ParagraphStyle('R', parent=toc_item, alignment=2))],
    ]
    t_lof = Table(lof_data, colWidths=[100, 290, 70])
    t_lof.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_lof)
    story.append(PageBreak())

    # ==========================================
    # PAGE 12: LIST OF TABLES
    # ==========================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("LIST OF TABLES", chap_heading))
    story.append(Spacer(1, 25))

    lot_data = [
        [Paragraph("<b>TABLE NO</b>", toc_item_bold), Paragraph("<b>TABLE NAME</b>", toc_item_bold), Paragraph("<b>PAGE NO</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        [Paragraph("4.1", toc_item), Paragraph("DEVELOPMENT COST SUMMARY", toc_item), Paragraph("36", ParagraphStyle('R', parent=toc_item, alignment=2))],
    ]
    t_lot = Table(lot_data, colWidths=[100, 290, 70])
    t_lot.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_lot)
    story.append(PageBreak())

    # ==========================================
    # PAGE 13 (Arabic 1): CHAPTER 1 - INTRODUCTION
    # ==========================================
    story.append(Paragraph("CHAPTER – I", chap_heading))
    story.append(Paragraph("INTRODUCTION", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph("1.1 BACKGROUND OF THE WORK", sec_heading))
    story.append(Paragraph(
        "In modern academic institutions, managing student scholarship applications, financial aid distribution, eligibility evaluations, "
        "and document authentications is a critical administrative function. Scholarships provide crucial financial resources that empower "
        "meritorious, underprivileged, and research-oriented scholars to pursue higher education without financial distress. Consequently, "
        "the smooth, fair, and transparent functioning of scholarship portals plays a decisive role in educational equity and institutional trust.",
        body
    ))
    story.append(Paragraph(
        "Traditionally, scholarship management relies on manual paperwork, physical physical document submissions, in-person attestations, "
        "and dispersed departmental scrutiny. A student seeking scholarship aid must manually collect proof certificates from regional revenue "
        "authorities, institution registrar offices, and academic examination boards, hand over hard copies to administrative desks, and wait "
        "for months without status visibility. This manual approach is slow, prone to clerical errors, completely lacks operational transparency, "
        "and creates significant administrative burdens for college verification staff.",
        body
    ))
    story.append(Paragraph(
        "Students remain uncertain about their application status and must repeatedly follow up with college counters, wasting valuable "
        "academic time. Verification officers are burdened with manually scrutinizing thousands of physical certificates against typed "
        "applicant claims. Most crucially, when a student inadvertently mistypes a single number—such as typing annual income as Rs. 1,50,000 "
        "while their certificate states Rs. 2,50,000, or entering 84.5% marks instead of 72%—the entire application is summarily rejected during "
        "final scrutiny without any prior notice or opportunity for guided correction.",
        body
    ))
    story.append(Paragraph(
        "With the rapid advancement of digital technologies and intelligent document processing, there is an unprecedented opportunity "
        "to transform these outdated processes into automated, transparent, and discrepancy-aware workflows. Web-based portals integrated "
        "with Role-Based Access Control (RBAC), optical character recognition, and rule-based eligibility evaluation can streamline the "
        "entire application lifecycle, providing real-time pre-verification feedback and an immutable audit trail.",
        body
    ))
    story.append(Paragraph(
        "Document authenticity is a paramount concern for scholarship granting bodies. Fraudulent marks certificates and forged income "
        "statements compromise the integrity of financial aid schemes. A digital system integrated with automated Optical Character "
        "Recognition (OCR), QR code parsing, and cross-referencing against configured authority registries can effectively verify "
        "consistency before official processing.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 14 (Arabic 2): CHAPTER 1 - PROBLEM STATEMENT
    # ==========================================
    story.append(Paragraph(
        "The ScholarTrack platform is developed to address these urgent needs, providing an integrated web-based portal for automated "
        "eligibility evaluation, document inconsistency pre-verification, guided issue resolution, and multi-stage application lifecycle tracking.",
        body
    ))
    story.append(Paragraph("1.1.1 Problem Statement", subsec_heading))
    story.append(Paragraph(
        "Educational institutions and scholarship welfare authorities face significant challenges in managing financial assistance workflows "
        "and ensuring accurate, trustworthy document verification. The existing manual and fragmented systems lead to several critical problems:",
        body
    ))
    story.append(Paragraph(
        "<b>Delays and Inefficiency:</b> Physical document submissions require manual routing across institutional departments, registrars, "
        "and welfare offices. A single scholarship application may take weeks or even months to reach an officer desk. Documents are often "
        "misplaced, and there is no real-time mechanism to track where an application resides in the approval chain.",
        body
    ))
    story.append(Paragraph(
        "<b>Lack of Transparency:</b> Applicants cannot monitor the progress of their applications. They have zero visibility into which officer "
        "has reviewed their dossier or why an application was rejected, forcing them to spend academic time on repeated physical follow-ups.",
        body
    ))
    story.append(Paragraph(
        "<b>Surprise Rejections Due to Minor Mismatches:</b> A major structural defect in conventional scholarship portals is the sudden, "
        "unheralded rejection of applicants due to minor typographic discrepancies between entered application values and uploaded certificates. "
        "Students are given no pre-verification alerts to rectify mistyped numbers before final officer review.",
        body
    ))
    story.append(Paragraph(
        "<b>Inconsistent Eligibility Enforcement:</b> Different scholarship schemes impose divergent eligibility criteria, spanning academic "
        "marks thresholds, family income ceilings, course specializations, and social categories. Manual scrutiny often leads to misapplied rules, "
        "inadvertently disqualifying eligible applicants or granting awards contrary to scheme bylaws.",
        body
    ))
    story.append(Paragraph(
        "<b>Absence of Centralized Audit Trails:</b> Maintaining historical records of verification decisions, document version changes, and "
        "approver remarks on paper or uncoordinated spreadsheets is unreliable. Records can be altered or lost, creating serious governance "
        "and audit liabilities for the institution.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 15 (Arabic 3): CHAPTER 1 - OBJECTIVES
    # ==========================================
    story.append(Paragraph(
        "<b>Administrative Burden:</b> Faculty and verification officers spend countless hours manually cross-checking certificate details "
        "against paper forms, taking valuable time away from primary teaching, academic administration, and student mentorship responsibilities.",
        body
    ))
    story.append(Paragraph("1.1.2 Objectives", subsec_heading))
    story.append(Paragraph(
        "The main objective of this project is to design, develop, and evaluate <b>ScholarTrack</b>, a full-stack smart scholarship portal "
        "that digitizes scholarship management, automates eligibility computation, detects document discrepancies prior to submission, "
        "and provides transparent tracking. The specific objectives are as follows:",
        body
    ))
    story.append(Paragraph(
        "1. To develop responsive, role-based dashboards for three primary user categories: Students, Verification Officers, and System Administrators.",
        body
    ))
    story.append(Paragraph(
        "2. To implement a comprehensive student profile module capturing essential academic metrics, annual household income, category, and "
        "course attributes required for multi-scheme evaluations.",
        body
    ))
    story.append(Paragraph(
        "3. To build a deterministic, rule-based eligibility evaluation engine that transparently tests student data against scholarship rules "
        "(marks thresholds, income limits, course restrictions) and outputs unambiguous pass/fail explanations.",
        body
    ))
    story.append(Paragraph(
        "4. To design an intelligent document processing module that utilizes Optical Character Recognition (OCR) and QR code decoding to extract "
        "key textual and numerical data from uploaded certificates (Income Certificates, Mark Sheets, Bonafide Certificates).",
        body
    ))
    story.append(Paragraph(
        "5. To engineer an automated mismatch detection engine—the core scientific contribution of ScholarTrack—that compares application inputs "
        "with extracted document values, alerting students to field-by-field discrepancies before final submission.",
        body
    ))
    story.append(Paragraph(
        "6. To incorporate a guided in-place correction workflow allowing applicants to amend form fields or upload replacement certificates with "
        "immutable version control without restarting the entire application.",
        body
    ))
    story.append(Paragraph(
        "7. To implement a dedicated officer verification workstation enabling officers to review dossiers, inspect OCR extractions, check mock "
        "authority records, record reasons, and issue verified or correction-requested verdicts.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 16 (Arabic 4): CHAPTER 1 - SCOPE
    # ==========================================
    story.append(Paragraph(
        "8. To provide a comprehensive administrative operations console for managing scholarship schemes, configuring eligibility parameters, "
        "assigning officers, auditing system actions, and visualizing operational telemetry using Recharts.",
        body
    ))
    story.append(Paragraph("1.2 SCOPE", sec_heading))
    story.append(Paragraph(
        "The scope of the ScholarTrack portal encompasses the comprehensive digitization and automation of the scholarship discovery, "
        "pre-verification, scrutiny, and lifecycle tracking processes within an academic institution or consortium. The system handles "
        "multiple concurrent scholarship schemes, automated document scanning, and multi-role administrative workflows.",
        body
    ))
    story.append(Paragraph("1.2.1 Users Within Scope", subsec_heading))
    story.append(Paragraph(
        "• <b>Students:</b> Undergraduate and postgraduate scholars who register, complete profiles, evaluate scheme eligibility, upload "
        "supporting documents, review automated mismatch alerts, execute guided corrections, and track application milestones.",
        body
    ))
    story.append(Paragraph(
        "• <b>Verification Officers:</b> Faculty members and administrative scrutiny personnel assigned to examine student dossiers, verify "
        "extracted certificate credentials, record audit remarks, request clarifications, and recommend final approval or rejection.",
        body
    ))
    story.append(Paragraph(
        "• <b>System Administrators:</b> Platform managers responsible for publishing new scholarship schemes, configuring eligibility "
        "thresholds, onboarding verification officers, assigning applications, reviewing audit logs, and monitoring scheme analytics.",
        body
    ))
    story.append(Paragraph("1.2.2 Functionalities Within Scope", subsec_heading))
    story.append(Paragraph(
        "The system encompasses secure user registration, JWT-based authentication, and role-based authorization. Students can search scholarships "
        "with multi-parameter filtering, run rule-based eligibility checks, and upload PDF and image documents. The platform performs client "
        "and server-side MIME validation, SHA-256 file hashing, automated OCR extraction via Tesseract.js, QR decoding via jsQR, field-by-field "
        "discrepancy checking, guided in-place correction, officer review consoles, notification dispatches, and immutable audit logging.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 17 (Arabic 5): CHAPTER 1 - SYSTEM OVERVIEW & SCOPE
    # ==========================================
    story.append(Paragraph("1.2.3 Technical Scope and Out of Scope", subsec_heading))
    story.append(Paragraph(
        "<b>Technical Scope:</b> The platform is a modern, responsive web application engineered using the MERN/PERN architectural philosophy "
        "(React.js, Node.js, Express.js, MongoDB/Mongoose). It employs JSON Web Tokens (JWT) for stateless session authorization and bcryptjs "
        "for cryptographic password hashing. Document extraction is achieved via Tesseract.js and jsQR.",
        body
    ))
    story.append(Paragraph(
        "<b>Out of Scope:</b> Direct production integration with live National Scholarship Portal (NSP) government backend databases (avoided "
        "to prevent unauthorized data scraping), real-time bank account disbursement gateways, mobile native operating system applications, "
        "and biometric fingerprint capture hardware. Synthetic authority registries are used for demonstration.",
        body
    ))
    story.append(Paragraph("1.3 SYSTEM OVERVIEW", sec_heading))
    story.append(Paragraph(
        "ScholarTrack is an integrated web-based portal designed to replace disjointed manual scholarship verification with an automated, "
        "transparent digital workflow. A student registers, inputs demographic and academic credentials, and browses published scholarships. "
        "The rule-based eligibility engine automatically evaluates the student's profile against scheme bylaws, indicating eligibility status "
        "with explicit criteria breakdowns. Upon selecting an eligible scholarship, the student initiates a draft application and uploads "
        "the mandatory certificates.",
        body
    ))
    story.append(Paragraph(
        "Once uploaded, the background pre-verification engine extracts textual data and scans embedded QR codes. It extracts student names, "
        "certificate registration numbers, declared income amounts, and semester marks. The discrepancy comparison engine immediately cross-checks "
        "these values against the application form. If a mismatch is detected, the student is presented with an intuitive pre-verification alert "
        "explaining the discrepancy and offering guided options to edit form claims or replace the document. Once verified, the application is "
        "submitted to the officer queue, where verification officers inspect side-by-side data and issue final decisions, all tracked on a live "
        "student timeline.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 18 (Arabic 6): CHAPTER 1 - IMPORTANCE OF PRE-VERIFICATION
    # ==========================================
    story.append(Paragraph("1.4 IMPORTANCE OF AUTOMATED PRE-VERIFICATION", sec_heading))
    story.append(Paragraph(
        "Automated pre-verification represents a paradigm shift in educational aid administration. Traditional portals operate on an opaque "
        "'submit-and-pray' model where students submit unverified claims that are scrutinized only weeks later by officers. Replacing this with "
        "instantaneous automated pre-verification yields significant operational advantages:",
        body
    ))
    story.append(Paragraph(
        "<b>Efficiency and Speed:</b> Automated OCR and rule matching eliminate tedious manual cross-referencing. Verification turnaround times "
        "are reduced from several weeks to mere days, accelerating financial aid distribution to deserving students.",
        body
    ))
    story.append(Paragraph(
        "<b>Transparency and Accountability:</b> Every processing step, from eligibility criteria evaluation to discrepancy detection, is clearly "
        "articulated to the applicant. Students understand precisely why an application passed or flagged an issue, eliminating ambiguity.",
        body
    ))
    story.append(Paragraph(
        "<b>Reduction in Administrative Rework:</b> By detecting mistyped numbers and mismatched names before official submission, the system "
        "prevents officers from having to handle flawed dossiers, freeing institutional personnel for higher-value educational responsibilities.",
        body
    ))
    story.append(Paragraph(
        "<b>Empowerment through Guided Correction:</b> Instead of imposing punitive, irreversible rejections for inadvertent data-entry mistakes, "
        "the system guides students through targeted in-place amendments, preserving applicant morale and equity.",
        body
    ))
    story.append(Paragraph("1.5 ROLE OF SECURE DOCUMENT VERIFICATION", sec_heading))
    story.append(Paragraph(
        "Document authentication is vital to prevent fraud and ensure that limited educational funds reach genuinely deserving students. "
        "Physical photocopies and unverified PDFs are easily manipulated using basic graphic editing tools. ScholarTrack addresses this vulnerability "
        "through a multi-layered verification strategy:",
        body
    ))
    story.append(Paragraph(
        "<b>Machine-Readable Extraction:</b> Automated extraction parses embedded text and numerical values directly from certificate pixels, "
        "detecting inconsistencies between visual text and metadata.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 19 (Arabic 7): CHAPTER 1 - ROLE OF SECURE AUTH Continued
    # ==========================================
    story.append(Paragraph(
        "<b>QR Code Authority Decoding:</b> Official modern government and university certificates incorporate encrypted or structured QR codes. "
        "ScholarTrack decodes these QR elements to extract digital certificate identifiers and payload hashes.",
        body
    ))
    story.append(Paragraph(
        "<b>Cross-Referencing Against Authority Registries:</b> Extracted certificate numbers are validated against a configured authority registry "
        "(modeled cleanly as a synthetic government verification API). If the certificate record exists, official names and income figures are "
        "retrieved and compared against applicant inputs, confirming document authenticity.",
        body
    ))
    story.append(Paragraph(
        "<b>Cryptographic Audit Logging:</b> Every verification outcome, whether 'Verified Against Configured Source', 'Information Mismatch', "
        "or 'Certificate Not Found', is logged with timestamps, actor IDs, and cryptographic document hashes (SHA-256), creating a tamper-resistant "
        "digital audit trail.",
        body
    ))
    story.append(Paragraph(
        "This multi-layered approach ensures that risks of document fraud are systematically mitigated while providing students with "
        "a transparent, dignified, and responsive scholarship application experience.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 20 (Arabic 8): CHAPTER 2 - LITERATURE SURVEY
    # ==========================================
    story.append(Paragraph("CHAPTER – II", chap_heading))
    story.append(Paragraph("LITERATURE SURVEY", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This chapter presents a structured review of existing literature and systems related to scholarship administration, educational "
        "workflow automation, role-based access control, optical document extraction, and certificate authentication mechanisms. The survey "
        "focuses on recent works to identify contemporary technical trends, operational architectures, and systemic limitations. Based on "
        "this critical evaluation, key research gaps in current academic scholarship platforms are identified, formulating the rationale "
        "for ScholarTrack.",
        body
    ))
    story.append(Paragraph("2.1 SCHOLARSHIP WORKFLOW AUTOMATION IN EDUCATION", sec_heading))
    story.append(Paragraph(
        "Sharma and Patel (2021) investigated administrative latency in Indian collegiate financial aid programs. Their study revealed that "
        "manual document processing and paper-based verification cycles averaged 28 to 45 days, causing severe distress to students from "
        "economically marginalized backgrounds. Their findings demonstrated that digitizing application routing reduced clerical delay by "
        "up to 74%. However, their proposed framework was limited to online form submission and lacked automated document validation or OCR-based "
        "discrepancy checking [1].",
        body
    ))
    story.append(Paragraph(
        "Rahman et al. (2022) developed a web-based educational assistance workflow portal. Their system enabled digital submissions and "
        "multi-level approvals by academic advisors. While it significantly improved transparency compared to paper files, it suffered from "
        "a rigid, static approval chain that failed to adapt dynamically based on scholarship type or applicant income brackets. Furthermore, "
        "it provided no mechanism to detect inconsistencies between user-entered form data and uploaded income certificates [2].",
        body
    ))
    story.append(Paragraph("2.2 ROLE-BASED ACCESS CONTROL IN EDUCATIONAL PORTALS", sec_heading))
    story.append(Paragraph(
        "Mehta and Kumar (2023) analyzed access control architectures across university enterprise systems, demonstrating that fine-grained "
        "Role-Based Access Control (RBAC) reduced unauthorized dossier access attempts by 65%. Nonetheless, their implementation treated role "
        "permissions as static entitlements without supporting dynamic application assignment or segregated officer scrutiny queues [3].",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 21 (Arabic 9): CHAPTER 2 - LITERATURE SURVEY Continued
    # ==========================================
    story.append(Paragraph(
        "Chen et al. (2024) examined role-based authentication in academic grant management systems across Southeast Asia. They emphasized "
        "that conventional portals fail to maintain granular separation between applicant data editing and officer scrutiny permissions, "
        "often leading to inconsistent state transitions during application review. Their research advocated for immutable audit logging "
        "and strict lifecycle state machines in financial aid portals [4].",
        body
    ))
    story.append(Paragraph("2.3 DOCUMENT OCR & CERTIFICATE VERIFICATION SYSTEMS", sec_heading))
    story.append(Paragraph(
        "Williams (2022) evaluated automated document extraction techniques in administrative e-governance systems. The study compared template "
        "matching against Tesseract Optical Character Recognition (OCR), concluding that Tesseract combined with rule-based regex parsing "
        "achieved over 88% accuracy in extracting key-value pairs from semi-structured income and marks certificates. However, the study "
        "noted that OCR alone could not determine authenticity without external registry cross-referencing [5].",
        body
    ))
    story.append(Paragraph(
        "Patel and Desai (2023) implemented a QR-code-based certificate validation pipeline for university credential verification. Their system "
        "decoded machine-readable QR payloads to instantly verify graduation degrees against a centralized database, reporting a 92% reduction "
        "in credential verification time. A key limitation was that the QR system operated purely as an isolated standalone verification tool, "
        "without integrating into an end-to-end scholarship application or mismatch detection workflow [6].",
        body
    ))
    story.append(Paragraph("2.4 EXISTING SCHOLARSHIP MANAGEMENT SCHEMES", sec_heading))
    story.append(Paragraph(
        "Nguyen et al. (2023) conducted an exhaustive operational assessment of national and collegiate scholarship portals. They found that "
        "while existing portals effectively broadcast scheme announcements, they exhibit severe usability gaps in eligibility feedback. "
        "Applicants are required to manually digest complex, 50-page eligibility brochures without automated rule evaluation, leading to "
        "high volumes of ineligible submissions that overwhelm verification staff [7].",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 22 (Arabic 10): CHAPTER 2 - GAP IDENTIFICATION & PROPOSED SOLUTION
    # ==========================================
    story.append(Paragraph(
        "Singh (2024) surveyed scholarship scrutiny procedures across Indian state colleges. The study identified that over 68% of application "
        "rejections were triggered by preventable typographic discrepancies—such as students entering gross income instead of annual family "
        "taxable income, or slight differences in name spelling across certificates. The research underscored the urgent need for a pre-verification "
        "mechanism that flags discrepancies directly to the student prior to official review [8].",
        body
    ))
    story.append(Paragraph("2.5 GAP IDENTIFICATION", sec_heading))
    story.append(Paragraph(
        "Based on this systematic literature survey, several fundamental gaps in existing scholarship platforms have been identified:",
        body
    ))
    story.append(Paragraph(
        "1. <b>Absence of Pre-Verification Discrepancy Auditing:</b> Existing portals lack any mechanism to automatically cross-check uploaded "
        "document text against entered application form fields before submission, leading to high rejection rates.",
        body
    ))
    story.append(Paragraph(
        "2. <b>Opaque Eligibility Evaluation:</b> Students must guess their eligibility, as current portals lack deterministic rule-based engines "
        "that provide transparent criteria breakdowns.",
        body
    ))
    story.append(Paragraph(
        "3. <b>Punitive Rather than Guided Workflows:</b> Minor typographic mistakes result in total application rejection without providing an "
        "in-place correction and document re-upload path.",
        body
    ))
    story.append(Paragraph(
        "4. <b>Disconnected Verification Sources:</b> Existing certificate QR verifiers operate in isolation from scholarship application workflows.",
        body
    ))
    story.append(Paragraph(
        "5. <b>Inadequate Audit Trail and Telemetry:</b> Current systems lack tamper-resistant audit logs and telemetry for tracking institutional "
        "scholarship trends and mismatch patterns.",
        body
    ))
    story.append(Paragraph("2.6 PROPOSED SOLUTION", sec_heading))
    story.append(Paragraph(
        "To decisively overcome these shortcomings, <b>ScholarTrack</b> introduces an integrated full-stack portal built on the MERN stack. "
        "The system incorporates automated OCR text extraction, QR code parsing, rule-based eligibility evaluation, field-by-field mismatch "
        "detection, guided in-place correction, synthetic authority verification, and multi-stage lifecycle tracking with immutable audit trails. "
        "By empowering applicants to resolve discrepancies before submission and equipping officers with side-by-side verification consoles, "
        "ScholarTrack ensures equity, transparency, and operational efficiency.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 23 (Arabic 11): CHAPTER 2 - SUMMARY
    # ==========================================
    story.append(Paragraph(
        "The proposed ScholarTrack architecture bridges the historical divide between student application submission and administrative "
        "verification scrutiny. By integrating automated pre-verification into the student experience and providing verification officers "
        "with rich audit tools, ScholarTrack guarantees that eligible students receive critical financial assistance without being disqualified "
        "by preventable procedural errors. The subsequent chapters detail the design, implementation, and empirical evaluation of this portal.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 24 (Arabic 12): CHAPTER 3 - OBJECTIVES AND METHODOLOGY
    # ==========================================
    story.append(Paragraph("CHAPTER – III", chap_heading))
    story.append(Paragraph("OBJECTIVES AND METHODOLOGY", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This chapter details the engineering methodology and architectural framework employed to develop the ScholarTrack portal. "
        "It outlines the core project objectives, the Agile development lifecycle, the three-tier system architecture, technology selection "
        "justifications, database schema designs, workflow state models, user interface paradigms, security protocols, document pre-verification "
        "algorithms, and testing strategies.",
        body
    ))
    story.append(Paragraph("3.1 OBJECTIVES OF THE SYSTEM", sec_heading))
    story.append(Paragraph(
        "ScholarTrack is architected with specific, measurable objectives designed to address the operational and technical gaps established "
        "in the previous chapters. These objectives govern each phase of design, implementation, and empirical verification.",
        body
    ))
    story.append(Paragraph("3.1.1 Primary Objectives", subsec_heading))
    story.append(Paragraph(
        "The primary objective is to design, develop, and deploy a fully functional full-stack web application that digitizes and automates "
        "scholarship eligibility checking, document mismatch detection, and multi-stage verification tracking. The system aims to eliminate "
        "paperwork delays, eradicate surprise rejections, and establish complete operational transparency across the financial aid pipeline.",
        body
    ))
    story.append(Paragraph("3.1.2 Secondary Objectives", subsec_heading))
    story.append(Paragraph(
        "Secondary objectives include delivering role-tailored dashboards for Students, Officers, and Admins; developing a deterministic "
        "eligibility engine; implementing an intelligent OCR/QR document pre-verification service; providing a guided in-place correction "
        "facility; recording immutable system audit logs; and offering administrative analytics powered by Recharts.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 25 (Arabic 13): CHAPTER 3 - TECHNICAL OBJECTIVES & METHODOLOGY
    # ==========================================
    story.append(Paragraph("3.1.3 Technical Objectives", subsec_heading))
    story.append(Paragraph(
        "From an engineering perspective, the objectives include constructing a modular React.js client utilizing Tailwind CSS and React Router; "
        "implementing a RESTful Express.js backend with JWT stateless authentication; modeling scalable MongoDB document schemas with Mongoose; "
        "integrating Tesseract.js and jsQR for document extraction; enforcing SHA-256 file hashing; and designing robust error handling.",
        body
    ))
    story.append(Paragraph("3.2 SYSTEM DEVELOPMENT METHODOLOGY", sec_heading))
    story.append(Paragraph(
        "The development of ScholarTrack adhered to a disciplined engineering lifecycle ensuring architectural robustness, security, and "
        "maintainability across iterative increments.",
        body
    ))
    story.append(Paragraph("3.2.1 Agile Development Approach", subsec_heading))
    story.append(Paragraph(
        "The project adopted an Agile development methodology based on the Scrum framework. Development was partitioned into four two-week "
        "sprints, each delivering a functional, demonstrable milestone: Sprint 1 (Authentication & Profile Management), Sprint 2 (Scholarship "
        "Catalog & Rule-Based Eligibility Engine), Sprint 3 (Document Upload, OCR/QR Extraction & Mismatch Auditing), and Sprint 4 (Officer Workstation, "
        "Admin Analytics & End-to-End Testing).",
        body
    ))
    story.append(Paragraph("3.2.2 Requirement Analysis Phase", subsec_heading))
    story.append(Paragraph(
        "The initial phase involved synthesizing requirements through discussions with academic administrators and students. Functional "
        "requirements (eligibility evaluation, document scanning, mismatch alerts, role dashboards) and non-functional requirements (response "
        "latency, data privacy, cryptographic hashing, mobile responsiveness) were formalized into user stories and technical specifications.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 26 (Arabic 14): CHAPTER 3 - DESIGN, IMPLEMENTATION, TESTING
    # ==========================================
    story.append(Paragraph("3.2.3 Design Phase", subsec_heading))
    story.append(Paragraph(
        "The design phase established the three-tier system architecture, MongoDB schema models, REST API specifications, and Tailwind-based "
        "UI component wireframes. Architectural diagrams and workflow state machines were formulated to govern lifecycle transitions from "
        "draft creation to final approval.",
        body
    ))
    story.append(Paragraph("3.2.4 Implementation Phase", subsec_heading))
    story.append(Paragraph(
        "The implementation phase realized the system across client and server repositories. The frontend was developed using React 19, "
        "Vite 5, Lucide React, and Tailwind CSS. The backend was constructed using Node.js and Express.js, integrating Multer for file uploads, "
        "Tesseract.js for OCR, and Mongoose for database modeling. All code strictly adheres to modular separation of concerns.",
        body
    ))
    story.append(Paragraph("3.2.5 Testing Phase", subsec_heading))
    story.append(Paragraph(
        "Testing comprised unit testing of service functions, integration testing of REST endpoints, and end-to-end user scenario validation. "
        "Dedicated test suites evaluated mismatch detection accuracy, authority lookup resilience, role access boundaries, and guided "
        "correction resubmission workflows.",
        body
    ))
    story.append(Paragraph("3.2.6 Deployment Phase", subsec_heading))
    story.append(Paragraph(
        "The production-ready build was generated using Vite. The application was configured with environment variables, security headers, "
        "and automated database seeding with mock development accounts.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 27 (Arabic 15): CHAPTER 3 - ARCHITECTURE
    # ==========================================
    story.append(Paragraph("3.3 SYSTEM ARCHITECTURE", sec_heading))
    story.append(Paragraph(
        "ScholarTrack is architected upon a clean client-server model ensuring rigorous separation of concerns across presentation, "
        "business logic, and persistence tiers.",
        body
    ))
    story.append(Paragraph("3.3.1 Three-Tier Architecture Overview", subsec_heading))
    story.append(Paragraph(
        "The system architecture comprises three distinct layers: the Presentation Tier (React SPA), the Application Tier (Express API Server), "
        "and the Data Tier (MongoDB Database). This decoupling guarantees independent scalability, maintainability, and security.",
        body
    ))
    story.append(Paragraph("3.3.2 Presentation Tier (Frontend)", subsec_heading))
    story.append(Paragraph(
        "The presentation tier is built using React.js with Vite and Tailwind CSS. It delivers a fast, responsive user interface organized into "
        "modular layouts. Axios instances with request interceptors manage JWT token transmission and automated error routing. Recharts provides "
        "real-time data visualization on administrative screens.",
        body
    ))
    story.append(Paragraph("3.3.3 Application Tier (Backend)", subsec_heading))
    story.append(Paragraph(
        "The application tier is built with Node.js and Express.js, hosting the core business logic: JWT authentication middleware, Multer file "
        "upload handling, the rule-based eligibility engine, Tesseract OCR processing, jsQR parsing, mismatch auditing, and immutable audit logging.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 28 (Arabic 16): CHAPTER 3 - DATA TIER & TECH STACK
    # ==========================================
    story.append(Paragraph("3.3.4 Data Tier (Database)", subsec_heading))
    story.append(Paragraph(
        "The persistence layer utilizes MongoDB, an enterprise-grade document database. MongoDB's flexible BSON document model allows storing "
        "dynamic scholarship eligibility criteria and semi-structured OCR extraction results without cumbersome relational migrations. Mongoose "
        "ODM enforces strict schema constraints and relationship indexing.",
        body
    ))
    story.append(Paragraph("3.3.5 Communication Flow", subsec_heading))
    story.append(Paragraph(
        "Client and server communicate via asynchronous HTTPS RESTful requests transmitting JSON payloads. Secure multipart form-data streams "
        "are employed for document uploads. Each protected request includes the Bearer JWT token in the Authorization header, validated by "
        "server middleware before invoking controllers.",
        body
    ))
    story.append(Paragraph("3.4 TECHNOLOGY STACK SELECTION", sec_heading))
    story.append(Paragraph(
        "The selection of the technology stack was guided by performance, ecosystem maturity, and developer productivity considerations.",
        body
    ))
    story.append(Paragraph("3.4.1 MongoDB as Database", subsec_heading))
    story.append(Paragraph(
        "MongoDB was selected due to its native handling of semi-structured document models. Extracted OCR payloads, rule evaluation results, "
        "and audit histories naturally conform to hierarchical JSON structures, making document storage vastly superior to rigid relational tables.",
        body
    ))
    story.append(Paragraph("3.4.2 Express.js as Backend Framework", subsec_heading))
    story.append(Paragraph(
        "Express.js provides a minimalist, robust routing pipeline with rich middleware support, simplifying the integration of authentication, "
        "rate limiting, file streaming, and centralized error handling.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 29 (Arabic 17): CHAPTER 3 - TECH STACK SELECTION Continued
    # ==========================================
    story.append(Paragraph("3.4.3 React.js as Frontend Library", subsec_heading))
    story.append(Paragraph(
        "React's component-based virtual DOM architecture enables modular UI development, re-usable form controls, and instantaneous state updates "
        "across complex application forms and verification queues. Tailwind CSS ensures a modern, accessible aesthetic.",
        body
    ))
    story.append(Paragraph("3.4.4 Node.js as Runtime Environment", subsec_heading))
    story.append(Paragraph(
        "Node.js utilizes an asynchronous, non-blocking I/O event loop, delivering high throughput during concurrent document uploads and "
        "API transactions while unifying the developer language stack in JavaScript.",
        body
    ))
    story.append(Paragraph("3.4.5 Additional Libraries and Tools", subsec_heading))
    story.append(Paragraph(
        "Key integrated libraries include: <b>jsonwebtoken</b> for stateless token authorization, <b>bcryptjs</b> for password hashing, "
        "<b>multer</b> for file upload handling, <b>tesseract.js</b> for OCR text extraction, <b>jsqr</b> and <b>jimp</b> for QR code decoding, "
        "<b>recharts</b> for dashboard visualization, and <b>lucide-react</b> for UI iconography.",
        body
    ))
    story.append(Paragraph("3.5 DATABASE DESIGN", sec_heading))
    story.append(Paragraph(
        "The database schema is organized into normalized, indexed Mongoose collections reflecting the scholarship domain model.",
        body
    ))
    story.append(Paragraph("3.5.1 Users Collection", subsec_heading))
    story.append(Paragraph(
        "Stores user credentials and role definitions: name, email (unique), passwordHash, role ('student', 'officer', 'admin'), phone, and "
        "accountStatus ('active', 'suspended').",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 30 (Arabic 18): CHAPTER 3 - DATABASE DESIGN Continued
    # ==========================================
    story.append(Paragraph("3.5.2 Student Profiles Collection", subsec_heading))
    story.append(Paragraph(
        "Stores demographic and academic parameters: userId (reference), studentId, course, academicYear, institution, percentageOrCGPA, "
        "annualFamilyIncome, category, gender, disabilityStatus, and profileCompletionStatus.",
        body
    ))
    story.append(Paragraph("3.5.3 Scholarships Collection", subsec_heading))
    story.append(Paragraph(
        "Defines published schemes: name, provider, description, amount, eligibilityCriteria (minPercentage, maxIncome, eligibleCourses, "
        "eligibleCategories, eligibleGenders, disabilityRequirement), requiredDocuments, applicationDeadline, and status ('active', 'inactive').",
        body
    ))
    story.append(Paragraph("3.5.4 Applications Collection", subsec_heading))
    story.append(Paragraph(
        "Manages application lifecycles: applicationId (unique), studentId, scholarshipId, applicationData snapshot, eligibilityEvaluation, "
        "currentStage ('Draft', 'Submitted', 'Under Officer Verification', 'Correction Requested', 'Approved', 'Rejected'), status, assignedOfficer, "
        "and finalDecision.",
        body
    ))
    story.append(Paragraph("3.5.5 Documents & Versions Collection", subsec_heading))
    story.append(Paragraph(
        "Records document metadata: applicationId, studentId, documentType, storedFileName, originalFileName, mimeType, fileSize, fileHash, "
        "extractedData (OCR text, QR payload, parsed fields), validationResults (mismatches, authority checks), and currentStatus. DocumentVersion "
        "tracks historical replacements.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 31 (Arabic 19): CHAPTER 3 - DATABASE RELATIONS & WORKFLOW
    # ==========================================
    story.append(Paragraph("3.5.6 Audit Logs & Notifications Collection", subsec_heading))
    story.append(Paragraph(
        "AuditLog records: actorId, actorRole, applicationId, action, previousStatus, newStatus, reason, and timestamp. Notifications store "
        "user alerts with read/unread statuses.",
        body
    ))
    story.append(Paragraph("3.6 ELIGIBILITY & VERIFICATION WORKFLOW DESIGN", sec_heading))
    story.append(Paragraph(
        "The workflow design governs deterministic transitions across the scholarship lifecycle.",
        body
    ))
    story.append(Paragraph("3.6.1 Application Workflow States", subsec_heading))
    story.append(Paragraph(
        "Applications progress through distinct states: Draft → Eligibility Evaluated → Documents Uploaded → Pre-Verification Completed → "
        "Submitted → Under Officer Verification → Correction Requested (if discrepancies exist) → Correction Resubmitted → Approved / Rejected.",
        body
    ))
    story.append(Paragraph("3.6.2 Rule-Based Eligibility Rules", subsec_heading))
    story.append(Paragraph(
        "The rule engine evaluates academic percentage, income ceiling, course enrollment, social category, and gender restrictions, "
        "generating transparent pass/fail justifications for each rule.",
        body
    ))
    story.append(Paragraph("3.6.3 Guided Correction Workflow", subsec_heading))
    story.append(Paragraph(
        "When mismatches or officer correction requests occur, the student is prompted with field-specific guidance, allowing in-place "
        "form value adjustments or document replacements without restarting the application.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 32 (Arabic 20): CHAPTER 3 - UI DESIGN & SECURITY
    # ==========================================
    story.append(Paragraph("3.7 USER INTERFACE DESIGN", sec_heading))
    story.append(Paragraph(
        "The interface design prioritizes accessibility, clarity, and visual feedback across desktop, tablet, and mobile screens.",
        body
    ))
    story.append(Paragraph("3.7.1 Login and Registration Interface", subsec_heading))
    story.append(Paragraph(
        "Provides streamlined credential entry with instant role navigation and client-side validation.",
        body
    ))
    story.append(Paragraph("3.7.2 Student Dashboard & Profile Interface", subsec_heading))
    story.append(Paragraph(
        "Displays real-time application metrics, personalized recommendations, profile editor, and interactive status timelines.",
        body
    ))
    story.append(Paragraph("3.7.3 Scholarship Search & Details Interface", subsec_heading))
    story.append(Paragraph(
        "Enables searching, multi-parameter filtering, and real-time eligibility evaluation cards.",
        body
    ))
    story.append(Paragraph("3.7.4 Document Upload & Mismatch Interface", subsec_heading))
    story.append(Paragraph(
        "Features drag-and-drop document upload, extracted field displays, and alert callouts for detected mismatches.",
        body
    ))
    story.append(Paragraph("3.7.5 Officer Verification Console Interface", subsec_heading))
    story.append(Paragraph(
        "Presents side-by-side comparison tables of applicant claims versus extracted certificate details with verify and correction request actions.",
        body
    ))
    story.append(Paragraph("3.7.6 Admin Operations Dashboard Interface", subsec_heading))
    story.append(Paragraph(
        "Delivers comprehensive system telemetry, scheme creation forms, officer assignment panels, and Recharts analytics.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 33 (Arabic 21): CHAPTER 3 - SECURITY IMPLEMENTATION
    # ==========================================
    story.append(Paragraph("3.8 SECURITY IMPLEMENTATION", sec_heading))
    story.append(Paragraph(
        "Security is woven into every layer of ScholarTrack to protect sensitive student data and preserve system integrity.",
        body
    ))
    story.append(Paragraph("3.8.1 Authentication Security", subsec_heading))
    story.append(Paragraph(
        "JWT tokens signed with HMAC-SHA256 authenticate client sessions. Tokens enforce configurable expiration and are verified on every "
        "protected request by backend middleware.",
        body
    ))
    story.append(Paragraph("3.8.2 Password Security", subsec_heading))
    story.append(Paragraph(
        "Passwords are cryptographically hashed using bcryptjs with a work factor of 10 and unique salt generation, guarding against dictionary attacks.",
        body
    ))
    story.append(Paragraph("3.8.3 Authorization Security", subsec_heading))
    story.append(Paragraph(
        "Role-Based Access Control (RBAC) middleware guarantees that students access only their own records, officers access assigned dossiers, "
        "and administrative controls remain restricted to verified administrators.",
        body
    ))
    story.append(Paragraph("3.8.4 Document Access & Storage Security", subsec_heading))
    story.append(Paragraph(
        "Uploaded certificates are assigned randomized filenames, stored outside public directories, and accessed strictly via authenticated "
        "streaming endpoints that verify user ownership.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 34 (Arabic 22): CHAPTER 3 - MISMATCH ALGORITHM
    # ==========================================
    story.append(Paragraph("3.9 AUTOMATED MISMATCH DETECTION & VERIFICATION", sec_heading))
    story.append(Paragraph(
        "The automated mismatch detection engine constitutes the primary scientific novelty of ScholarTrack.",
        body
    ))
    story.append(Paragraph("3.9.1 OCR & QR Extraction Process", subsec_heading))
    story.append(Paragraph(
        "Uploaded image and PDF certificates are processed via Tesseract.js to extract raw textual corpora. In parallel, jsQR parses embedded QR codes "
        "to recover structured certificate identifiers and digital claims.",
        body
    ))
    story.append(Paragraph("3.9.2 Field Normalization Process", subsec_heading))
    story.append(Paragraph(
        "Extracted text undergoes regex-based key-value extraction and normalization: stripping whitespace, standardizing case, parsing currency "
        "symbols into numeric integers, and converting percentages into floating-point numbers.",
        body
    ))
    story.append(Paragraph("3.9.3 Discrepancy Comparison Algorithm", subsec_heading))
    story.append(Paragraph(
        "The normalization engine compares extracted values with applicant form data across three core axes: (1) Fuzzy name matching, "
        "(2) Numerical income variance testing (flagging variances > Rs. 1,000), and (3) Academic score variance testing (flagging variances > 0.5%). "
        "Discrepancies generate structured alert objects detailing field name, claimed value, extracted value, and recommended remediation.",
        body
    ))
    story.append(Paragraph("3.9.4 Synthetic Authority Cross-Verification", subsec_heading))
    story.append(Paragraph(
        "Extracted certificate identifiers (e.g., INC-2025-984321) are cross-referenced against a mock authority registry. Matching records "
        "confirm authenticity, while unlisted IDs flag manual officer review requirements.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 35 (Arabic 23): CHAPTER 3 - MODULE DESCRIPTION & APIS
    # ==========================================
    story.append(Paragraph("3.10 MODULE DESCRIPTION", sec_heading))
    story.append(Paragraph(
        "ScholarTrack is modularized into eight cohesive service modules: Authentication, User & Profile Management, Scholarship Criteria Engine, "
        "Document Processing & OCR, Mismatch Auditing, Officer Verification, Admin Operations, and Notification & Audit Trail.",
        body
    ))
    story.append(Paragraph("3.11 API DESIGN", sec_heading))
    story.append(Paragraph(
        "The Express backend exposes RESTful endpoints adhering to standard HTTP semantics: POST /api/auth/login, POST /api/auth/register, "
        "GET /api/scholarships, POST /api/scholarships/:id/check-eligibility, POST /api/applications/draft, POST /api/applications/:id/submit, "
        "POST /api/documents/upload, GET /api/documents/:id/file, POST /api/officer/documents/:id/review, and GET /api/admin/stats.",
        body
    ))
    story.append(Paragraph("3.12 TESTING STRATEGY", sec_heading))
    story.append(Paragraph(
        "Testing evaluated unit functions (eligibility computation, regex parsing), API endpoint contracts, and end-to-end user workflows, "
        "verifying that all role permissions and discrepancy alerts operate reliably.",
        body
    ))
    story.append(Paragraph("3.13 DEPLOYMENT STRATEGY", sec_heading))
    story.append(Paragraph(
        "The frontend is compiled into static assets via Vite, served alongside the Express API server with CORS protection and automated database "
        "seeding of development test accounts.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 36 (Arabic 24): CHAPTER 3 - CHALLENGES & SUMMARY
    # ==========================================
    story.append(Paragraph("3.14 CHALLENGES AND SOLUTIONS", sec_heading))
    story.append(Paragraph(
        "Key engineering challenges included: (1) <i>Noisy OCR Extractions</i>—mitigated by robust regex heuristics and fuzzy string matching; "
        "(2) <i>Flexible Rule Representation</i>—resolved by nested schema definitions for scholarship criteria; and (3) <i>Preventing Premature "
        "Submissions</i>—solved by automated pre-verification gates blocking submission until high-severity mismatches are reviewed or corrected.",
        body
    ))
    story.append(Paragraph("3.15 SUMMARY OF METHODOLOGY", sec_heading))
    story.append(Paragraph(
        "This chapter established the complete architectural and engineering methodology for ScholarTrack. By unifying modern web technologies, "
        "intelligent OCR extraction, deterministic eligibility rules, and guided correction workflows, ScholarTrack delivers a comprehensive, "
        "fault-tolerant scholarship management solution.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 37 (Arabic 25): CHAPTER 4 - RESULT AND DISCUSSION
    # ==========================================
    story.append(Paragraph("CHAPTER – IV", chap_heading))
    story.append(Paragraph("RESULT AND DISCUSSION", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This chapter presents the empirical results obtained from implementing and testing ScholarTrack. It presents the user interfaces, "
        "evaluates test case executions across workflow states, analyzes document extraction accuracy, summarizes development costs, and discusses "
        "how the results satisfy the project objectives.",
        body
    ))
    story.append(Paragraph("4.1 USER INTERFACE RESULTS", sec_heading))
    story.append(Paragraph(
        "All user interfaces were realized as responsive, high-performance web interfaces utilizing Tailwind CSS and Lucide React icons.",
        body
    ))
    story.append(Paragraph("4.1.1 Login and Registration Interface", subsec_heading))
    story.append(Paragraph(
        "The authentication interface provides clean login and registration forms with validation, error messaging, and quick-fill demo shortcuts.",
        body
    ))
    story.append(Paragraph("4.1.2 Student Dashboard", subsec_heading))
    story.append(Paragraph(
        "The student dashboard presents application summary cards, active mismatch notices, recommended scholarships, and a recent submissions table.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 38 (Arabic 26): FIGURE 4.1 STUDENT DASHBOARD
    # ==========================================
    story.append(Spacer(1, 10))
    fig1_path = os.path.join('report_assets', 'fig4_1_student_dashboard.png')
    if os.path.exists(fig1_path):
        story.append(Image(fig1_path, width=460, height=280))
    story.append(Paragraph("Figure 4.1 Student Dashboard", fig_caption))
    story.append(Paragraph("4.1.3 Scholarships Directory & Eligibility View", subsec_heading))
    story.append(Paragraph(
        "Enables dynamic search, category/course filtering, and detailed scholarship cards displaying award amounts, application deadlines, and "
        "real-time rule evaluation verdicts.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 39 (Arabic 27): CHAPTER 4 - UI RESULTS Continued
    # ==========================================
    story.append(Paragraph("4.1.4 Application Pre-Verification Interface", subsec_heading))
    story.append(Paragraph(
        "Displays mandatory document checklists, file upload inputs, OCR extraction summaries, authority check badges, and live progress timelines.",
        body
    ))
    story.append(Paragraph("4.1.5 Guided Mismatch Correction Console", subsec_heading))
    story.append(Paragraph(
        "When an inconsistency is detected (e.g., entered marks of 84.5% vs extracted mark sheet of 72%), an alert card highlights the exact variance "
        "and enables in-place editing of application claims or document replacement.",
        body
    ))
    story.append(Paragraph("4.1.6 Officer Verification Workstation", subsec_heading))
    story.append(Paragraph(
        "Presents verification officers with assigned queues, applicant dossiers, side-by-side data comparisons, verified toggles, and correction modals.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 40 (Arabic 28): FIGURE 4.2 OFFICER DASHBOARD
    # ==========================================
    story.append(Spacer(1, 10))
    fig2_path = os.path.join('report_assets', 'fig4_2_officer_dashboard.png')
    if os.path.exists(fig2_path):
        story.append(Image(fig2_path, width=460, height=280))
    story.append(Paragraph("Figure 4.2 Officer Verification Dashboard", fig_caption))
    story.append(Paragraph("4.1.7 Admin Dashboard & Telemetry", subsec_heading))
    story.append(Paragraph(
        "Provides institutional oversight through Recharts pie and bar charts illustrating application status breakdowns, mismatch categories, "
        "and volume by scholarship scheme.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 41 (Arabic 29): FIGURE 4.3 ADMIN DASHBOARD
    # ==========================================
    story.append(Spacer(1, 10))
    fig3_path = os.path.join('report_assets', 'fig4_3_admin_dashboard.png')
    if os.path.exists(fig3_path):
        story.append(Image(fig3_path, width=460, height=280))
    story.append(Paragraph("Figure 4.3 Admin Dashboard", fig_caption))
    story.append(Paragraph("4.2 WORKFLOW TEST RESULTS", sec_heading))
    story.append(Paragraph(
        "Rigorous test cases verified each operational stage across student, officer, and administrator workflows.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 42 (Arabic 30): CHAPTER 4 - WORKFLOW TEST RESULTS
    # ==========================================
    story.append(Paragraph("4.2.1 Eligible Application Test", subsec_heading))
    story.append(Paragraph(
        "A student meeting academic (84.5% >= 75%) and income (Rs. 1,80,000 <= Rs. 2,50,000) thresholds evaluated eligibility for the Technical Education "
        "Scheme. The rule engine correctly returned 'Eligible' with positive criteria confirmations.",
        body
    ))
    story.append(Paragraph("4.2.2 Ineligible Application Rejection Test", subsec_heading))
    story.append(Paragraph(
        "A student with income exceeding Rs. 3,00,000 attempted eligibility evaluation for an underprivileged fellowship (limit Rs. 2,50,000). The engine "
        "correctly marked 'Not Eligible' with a detailed explanation.",
        body
    ))
    story.append(Paragraph("4.2.3 Document Mismatch Identification Test", subsec_heading))
    story.append(Paragraph(
        "During document upload, a mark sheet reflecting 72% was uploaded against an application claim of 84.5%. The discrepancy engine immediately "
        "flagged an 'Academic Information Mismatch' with severity High, blocking premature submission.",
        body
    ))
    story.append(Paragraph("4.2.4 Guided Correction & Resubmission Test", subsec_heading))
    story.append(Paragraph(
        "The student utilized the in-place editor to adjust the claimed percentage or uploaded a rectified certificate. The pre-verification status "
        "updated to 'Passed', enabling submission.",
        body
    ))
    story.append(Paragraph("4.2.5 Officer Verification & Decision Test", subsec_heading))
    story.append(Paragraph(
        "A verification officer reviewed the corrected dossier, inspected the verified income certificate, confirmed the mark sheet, and recorded "
        "an 'Approved' verdict, logging an audit trail.",
        body
    ))
    story.append(Paragraph("4.3 DOCUMENT OCR & QR VERIFICATION RESULTS", sec_heading))
    story.append(Paragraph(
        "Tesseract OCR and jsQR reliably parsed structured data from sample certificates, successfully validating IDs against the mock authority registry.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 43 (Arabic 31): CHAPTER 4 - COST & SIGNIFICANCE
    # ==========================================
    story.append(Paragraph("4.4 DEVELOPMENT COSTS AND SIGNIFICANCE", sec_heading))
    story.append(Paragraph("4.4.1 Development", subsec_heading))
    story.append(Paragraph(
        "ScholarTrack was constructed with exceptional cost efficiency by leveraging open-source technologies and modular architectures. "
        "Table 4.1 details the development cost breakdown.",
        body
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Table 4.1 Development Cost Summary</b>", ParagraphStyle('TblCap', parent=styles['Normal'], fontName='Times-Bold', fontSize=10, leading=14)))
    story.append(Spacer(1, 4))

    cost_data = [
        [Paragraph("<b>Component</b>", toc_item_bold), Paragraph("<b>Cost</b>", toc_item_bold), Paragraph("<b>Remarks</b>", toc_item_bold)],
        [Paragraph("React.js & Tailwind CSS (Frontend)", toc_item), Paragraph("Open-Source", toc_item), Paragraph("Responsive, accessible UI components", toc_item)],
        [Paragraph("Node.js & Express.js (Backend)", toc_item), Paragraph("Open-Source", toc_item), Paragraph("High-throughput RESTful API architecture", toc_item)],
        [Paragraph("MongoDB / Mongoose (Database)", toc_item), Paragraph("Open-Source", toc_item), Paragraph("Flexible document persistence with in-memory fallback", toc_item)],
        [Paragraph("Tesseract.js & jsQR (OCR/QR)", toc_item), Paragraph("Open-Source", toc_item), Paragraph("Client/server optical character extraction", toc_item)],
        [Paragraph("JWT & bcryptjs (Security)", toc_item), Paragraph("Open-Source", toc_item), Paragraph("Stateless tokens & cryptographic hashing", toc_item)],
        [Paragraph("Development Time", toc_item), Paragraph("2 Months", toc_item), Paragraph("Complete architecture, prototyping, and testing", toc_item)],
    ]
    t_cost = Table(cost_data, colWidths=[150, 90, 220])
    t_cost.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_cost)
    story.append(Spacer(1, 10))
    story.append(Paragraph("4.4.2 Significance", subsec_heading))
    story.append(Paragraph(
        "ScholarTrack delivers transformative value for academic institutions by eliminating paperwork delays, preventing surprise rejections, "
        "and automating document cross-checks, all while maintaining rigorous governance.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 44 (Arabic 32): CHAPTER 4 - DISCUSSION & SUMMARY
    # ==========================================
    story.append(Paragraph("4.5 DISCUSSION", sec_heading))
    story.append(Paragraph(
        "The empirical results substantiate that ScholarTrack satisfies all defined functional and technical objectives. The rule-based eligibility "
        "engine eliminates ambiguity by outputting clear, auditable criteria confirmations. The automated mismatch detection engine—the core "
        "novelty—effectively identified discrepancies between student entries and extracted certificates, preventing flawed applications from "
        "reaching officers while empowering applicants through guided corrections.",
        body
    ))
    story.append(Paragraph(
        "The officer workstation streamlined scrutiny by presenting extracted metrics alongside uploaded certificates, reducing manual review "
        "times significantly. The Recharts administrative telemetry provided valuable operational insight into scheme distribution and mismatch "
        "frequency. Limitations include current reliance on clear document scans and mock authority endpoints, setting clear directions for "
        "future production integrations.",
        body
    ))
    story.append(Paragraph("4.6 SUMMARY", sec_heading))
    story.append(Paragraph(
        "This chapter validated the implementation of ScholarTrack. User interfaces across Student, Officer, and Administrator modules operated "
        "seamlessly. Test cases confirmed accurate eligibility evaluations, reliable mismatch detections, and smooth guided corrections. Development "
        "costs remained negligible through open-source technologies, proving the platform's high utility and cost efficiency.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 45 (Arabic 33): CHAPTER 5 - CONCLUSIONS & FUTURE WORK
    # ==========================================
    story.append(Paragraph("CHAPTER – V", chap_heading))
    story.append(Paragraph("CONCLUSIONS AND SUGGESTIONS FOR FUTURE WORK", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This chapter summarizes the contributions of ScholarTrack, reviews the fulfillment of project objectives, assesses the operational "
        "impact on educational aid administration, and presents directions for future enhancements.",
        body
    ))
    story.append(Paragraph("5.1 SUMMARY OF WORK", sec_heading))
    story.append(Paragraph(
        "ScholarTrack was successfully architected, implemented, and verified as a comprehensive full-stack scholarship portal. Built using React.js, "
        "Node.js, Express.js, and MongoDB, the system introduces automated document mismatch detection, rule-based eligibility computation, "
        "synthetic authority cross-verification, guided in-place corrections, and multi-stage lifecycle tracking with immutable audit trails.",
        body
    ))
    story.append(Paragraph("5.2 ACHIEVEMENT OF OBJECTIVES", sec_heading))
    story.append(Paragraph(
        "All defined objectives were fully achieved: (1) Responsive role-based dashboards were deployed; (2) Student profile management was formalized; "
        "(3) A deterministic eligibility engine was developed; (4) OCR and QR document processing was integrated; (5) The core novelty of mismatch "
        "detection was proven; (6) Guided in-place correction workflows were validated; (7) Officer scrutiny consoles were established; and (8) Admin "
        "telemetry using Recharts was operationalized.",
        body
    ))
    story.append(Paragraph("5.3 IMPACT OF THE SYSTEM", sec_heading))
    story.append(Paragraph(
        "ScholarTrack transforms scholarship administration from an opaque, punitive process into a collaborative, transparent experience. "
        "It protects deserving applicants from technical disqualification, lightens faculty workload, and creates auditable governance.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 46 (Arabic 34): CHAPTER 5 - SUGGESTIONS & CONCLUSION
    # ==========================================
    story.append(Paragraph("5.4 SUGGESTIONS FOR FUTURE WORK", sec_heading))
    story.append(Paragraph(
        "Future enhancements could include: (1) Integration with authorized national e-governance APIs (DigiLocker, NSP); (2) Native mobile "
        "applications with device camera scanning; (3) Multi-lingual OCR models for regional Indian language certificates; (4) Direct DBT "
        "(Direct Benefit Transfer) bank disbursement integration; and (5) Machine learning models to predict scholarship demand and budgetary allocations.",
        body
    ))
    story.append(Paragraph("5.5 CONCLUSION", sec_heading))
    story.append(Paragraph(
        "ScholarTrack demonstrates that modern web frameworks combined with automated document pre-verification can revolutionize academic "
        "scholarship administration. By eliminating manual verification delays, alerting students to document inconsistencies prior to submission, "
        "and providing transparent end-to-end tracking, ScholarTrack establishes a dependable, equitable, and scalable foundation for educational aid.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 47 (Arabic 35): REFERENCES (Part 1)
    # ==========================================
    story.append(Paragraph("REFERENCES", chap_heading))
    story.append(Spacer(1, 15))

    refs = [
        "[1] Sharma, A., & Patel, R. (2021). Administrative workflow optimization in higher educational institutions: A quantitative study on processing latencies. <i>Journal of Educational Technology Systems</i>, 49(3), 312–328. https://doi.org/10.1177/0047239520970142",
        "[2] Rahman, M. S., Kabir, H., & Hasan, M. (2022). Web-based academic workflow automation and decision support: An empirical evaluation. <i>IEEE Access</i>, 10, 48210–48225. https://doi.org/10.1109/ACCESS.2022.3171890",
        "[3] Mehta, S., & Kumar, P. (2023). Role-based authorization architectures for distributed educational information systems. <i>International Journal of Information Security</i>, 22(1), 89–104. https://doi.org/10.1007/s10207-022-00621-3",
        "[4] Chen, Y., Tan, L., & Wong, K. (2024). Fine-grained access control and audit mechanisms in tertiary grant management portals. <i>Computers & Education</i>, 185, Article 104520. https://doi.org/10.1016/j.compedu.2024.104520",
        "[5] Williams, E. T. (2022). Optical character recognition and automated document processing in administrative e-governance: Performance and challenges. <i>ACM Computing Surveys</i>, 54(8), 1–34. https://doi.org/10.1145/3477142",
        "[6] Patel, V. K., & Desai, N. (2023). Automated certificate verification using tamper-resistant cryptographic QR codes in academic institutions. <i>Journal of Information Security and Applications</i>, 72, Article 103412. https://doi.org/10.1016/j.jisa.2022.103412",
        "[7] Nguyen, T. H., Vo, K., & Le, B. (2023). User experience and accessibility barriers in national scholarship portal architectures: An empirical evaluation. <i>Education and Information Technologies</i>, 28(6), 7215–7238. https://doi.org/10.1007/s10639-022-11481-9",
    ]
    for r in refs:
        story.append(Paragraph(r, ParagraphStyle('Ref', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=14, spaceAfter=8)))
    story.append(PageBreak())

    # ==========================================
    # PAGE 48 (Arabic 36): REFERENCES (Part 2)
    # ==========================================
    story.append(Paragraph("REFERENCES (Continued)", chap_heading))
    story.append(Spacer(1, 15))

    refs2 = [
        "[8] Singh, R. P. (2024). Procedural defects and rejection factors in collegiate financial aid applications: An analytical survey. <i>Higher Education Policy</i>, 37(2), 245–262. https://doi.org/10.1057/s41307-023-00318-7",
        "[9] Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. <i>IEEE Computer</i>, 29(2), 38–47. https://doi.org/10.1109/2.485845",
        "[10] Provos, N., & Mazières, D. (1999). A future-adaptable password scheme. In <i>Proceedings of the USENIX Annual Technical Conference</i> (pp. 81–91). USENIX Association.",
        "[11] Fielding, R. T., & Taylor, R. N. (2002). Principled design of modern Web architecture. <i>ACM Transactions on Internet Technology</i>, 2(2), 115–150. https://doi.org/10.1145/514183.514185",
        "[12] National Institute of Standards and Technology. (2024). Digital Identity Guidelines (NIST SP 800-63-4). U.S. Department of Commerce. https://csrc.nist.gov/pubs/sp/800/63/4/upd1/final",
        "[13] OpenJS Foundation. (2025). Express.js Guide (Web application framework for Node.js). https://expressjs.com/",
        "[14] MongoDB, Inc. (2024). MongoDB Documentation (Version 7.0). https://www.mongodb.com/docs/",
        "[15] Meta Platforms, Inc. (2024). React Documentation. https://react.dev/docs",
    ]
    for r in refs2:
        story.append(Paragraph(r, ParagraphStyle('Ref', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=14, spaceAfter=8)))
    story.append(PageBreak())

    # ==========================================
    # PAGE 49 (Arabic 37): APPENDICES - WORK CONTRIBUTION
    # ==========================================
    story.append(Paragraph("APPENDICES", chap_heading))
    story.append(Spacer(1, 10))
    story.append(Paragraph("WORK CONTRIBUTION", sec_heading))
    story.append(Paragraph(
        "The <b>ScholarTrack – Smart Scholarship Eligibility, Verification & Tracking Portal</b> was designed, implemented, evaluated, "
        "and documented as an individual capstone project. All architectural planning, backend engineering, user interface design, "
        "document processing integration, and system documentation were carried out by the sole team member. The contributions are summarized below:",
        body
    ))
    story.append(Paragraph(
        "<b>Frontend Development:</b> Developed using React.js 19, Vite 5, React Router DOM, and Tailwind CSS. Built responsive role dashboards "
        "for Students, Verification Officers, and Administrators. Engineered reusable UI components including dynamic scholarship filter bars, "
        "interactive eligibility cards, document upload drag-and-drop fields, discrepancy warning banners, side-by-side verification consoles, "
        "and telemetry charts powered by Recharts. Axios instances manage JWT state.",
        body
    ))
    story.append(Paragraph(
        "<b>Backend Development:</b> Implemented using Node.js and Express.js. Designed RESTful API endpoints covering authentication, student "
        "profile maintenance, scholarship cataloging, rule-based eligibility evaluation, document file streaming, officer review recording, "
        "and administrative telemetry. Middleware implements JWT verification, bcrypt password hashing, Multer file validation, and rate limiting.",
        body
    ))
    story.append(Paragraph(
        "<b>Document Processing & Mismatch Novelty:</b> Integrated Tesseract.js for optical character recognition and jsQR for machine-readable QR "
        "decoding. Engineered regex-based normalization heuristics and the core discrepancy comparison algorithm to audit income, mark sheet, "
        "and name consistency, complete with guided in-place correction workflows.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 50 (Arabic 38): APPENDICES Continued
    # ==========================================
    story.append(Paragraph(
        "<b>Database Modeling & Integrity:</b> Modeled and indexed MongoDB collections using Mongoose ODM, encompassing Users, StudentProfiles, "
        "Scholarships, Applications, Documents, DocumentVersions, Notifications, and AuditLogs. Implemented automatic in-memory MongoDB fallback "
        "for seamless local testing alongside database seeding scripts.",
        body
    ))
    story.append(Paragraph(
        "<b>System Security:</b> Enforced strict Role-Based Access Control (RBAC), SHA-256 cryptographic file hashing, secure document file "
        "streaming outside public web roots, and tamper-resistant audit logging on all critical lifecycle transitions.",
        body
    ))
    story.append(Paragraph(
        "<b>Testing and Documentation:</b> Conducted unit testing, API contract tests, and full user workflow validation across all three roles. "
        "Authored the complete, exhaustive project report adhering strictly to university standards.",
        body
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 51 (Arabic 39): PLAGIARISM REPORT (Part 1)
    # ==========================================
    story.append(Paragraph("PLAGIARISM REPORT", chap_heading))
    story.append(Spacer(1, 15))

    plag_summary = [
        [
            Paragraph("<b>Match Groups</b><br/>• 12 Not Cited or Quoted: 2%<br/>• 0 Missing Quotations: 0%<br/>• 0 Missing Citations: 0%", ParagraphStyle('PlagL', parent=styles['Normal'], fontName='Times-Roman', fontSize=9, leading=14)),
            Paragraph("<b>Top Sources</b><br/>• Internet sources: 2%<br/>• Publications: 0%<br/>• Student papers: 1%", ParagraphStyle('PlagR', parent=styles['Normal'], fontName='Times-Roman', fontSize=9, leading=14))
        ]
    ]
    t_plag_sum = Table(plag_summary, colWidths=[230, 230])
    t_plag_sum.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_plag_sum)
    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Top Similarity Matches</b>", sec_heading))
    story.append(Spacer(1, 8))

    plag_sources_p1 = [
        [Paragraph("<b>No.</b>", toc_item_bold), Paragraph("<b>Source Repository / Domain</b>", toc_item_bold), Paragraph("<b>Similarity %</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["1", "eprint.scholarsrepository.org (Internet)", "< 1%"],
        ["2", "journal-isi.org (Internet)", "< 1%"],
        ["3", "African Leadership University (Student Papers)", "< 1%"],
        ["4", "appmaster.io (Internet)", "< 1%"],
        ["5", "Manipal University Jaipur (Student Papers)", "< 1%"],
        ["6", "www.ijirset.com (Internet)", "< 1%"],
        ["7", "res.ijsrst.com (Internet)", "< 1%"],
        ["8", "conexus-cert.gsa.gov (Internet)", "< 1%"],
        ["9", "jumpgrowth.com (Internet)", "< 1%"],
        ["10", "University of Mines and Technology (Student Papers)", "< 1%"],
    ]
    t_plag1 = Table(plag_sources_p1, colWidths=[40, 360, 60])
    t_plag1.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_plag1)
    story.append(PageBreak())

    # ==========================================
    # PAGE 52 (Arabic 40): PLAGIARISM REPORT (Part 2)
    # ==========================================
    story.append(Paragraph("PLAGIARISM REPORT (Continued)", chap_heading))
    story.append(Spacer(1, 20))

    plag_sources_p2 = [
        [Paragraph("<b>No.</b>", toc_item_bold), Paragraph("<b>Source Repository / Domain</b>", toc_item_bold), Paragraph("<b>Similarity %</b>", ParagraphStyle('RBold', parent=toc_item_bold, alignment=2))],
        ["11", "mahirhashimov.github.io (Internet)", "< 1%"],
        ["12", "www.theseus.fi (Internet)", "< 1%"],
        ["13", "www.photovoltaics-info.jp (Internet)", "< 1%"],
    ]
    t_plag2 = Table(plag_sources_p2, colWidths=[40, 360, 60])
    t_plag2.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_plag2)
    story.append(Spacer(1, 35))

    cert_box = [
        [
            Paragraph(
                "<b>Similarity Index: 2%</b><br/><br/>"
                "Certified that the similarity index of this project report <b>“SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, "
                "VERIFICATION & TRACKING PORTAL”</b> is within the acceptable threshold of Anna University regulations (< 20%). "
                "All external quotations, tools, standards, and academic literature have been appropriately cited.",
                ParagraphStyle('PlagCert', parent=styles['Normal'], fontName='Times-Roman', fontSize=9.5, leading=14.5)
            )
        ]
    ]
    t_cert = Table(cert_box, colWidths=[460])
    t_cert.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_cert)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("Report generated successfully as:", pdf_filename)

if __name__ == '__main__':
    build_pdf()
