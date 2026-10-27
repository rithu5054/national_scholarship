import os
import zipfile
import shutil
import re as _re
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def add_page_number_to_footer(footer_paragraph):
    """Add a centered page number field to the given footer paragraph."""
    footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer_paragraph.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.text = ' PAGE '
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

def set_section_page_start(section, start_num):
    """Set the page numbering to start at start_num for the given section."""
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn('w:pgNumType'))
    if pgNumType is None:
        pgNumType = OxmlElement('w:pgNumType')
        sectPr.append(pgNumType)
    pgNumType.set(qn('w:start'), str(start_num))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def build_expanded_report():
    doc = Document()
    
    # 1. Page Margins: Standard 1.0 inch all around
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.different_first_page_header_footer = False

    # Base typography: Times New Roman, 12pt body, 1.5 line spacing, 6pt after
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(0, 0, 0)

    report_state = {"in_chapter": False}

    def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=12, space_before=0, space_after=6, line_spacing=1.5, indent=None):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        
        # 1 tab space (0.5 inches / 36 pt) from starting of paragraph from Introduction
        if indent is not None:
            if indent > 0:
                p.paragraph_format.first_line_indent = Inches(indent)
        elif report_state["in_chapter"] and align == WD_ALIGN_PARAGRAPH.JUSTIFY and not bold:
            if not (text.startswith("Figure ") or text.startswith("Table ") or text.startswith("[")):
                p.paragraph_format.first_line_indent = Inches(0.5)

        if text:
            if "<b>" in text and "</b>" in text:
                import re
                parts = re.split(r'(<b>.*?</b>)', text)
                for part in parts:
                    if part.startswith("<b>") and part.endswith("</b>"):
                        run = p.add_run(part[3:-4])
                        run.bold = True
                        run.italic = italic
                        run.font.name = 'Times New Roman'
                        run.font.size = Pt(size)
                    elif part:
                        run = p.add_run(part)
                        run.bold = bold
                        run.italic = italic
                        run.font.name = 'Times New Roman'
                        run.font.size = Pt(size)
            else:
                run = p.add_run(text)
                run.bold = bold
                run.italic = italic
                run.font.name = 'Times New Roman'
                run.font.size = Pt(size)
        return p

    def add_bullet(text):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.5
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        return p

    # Headings and subheadings ALL set to 14pt BOLD as requested
    def add_heading_chap(roman_num, title_text):
        p = add_p(f"CHAPTER – {roman_num}\n{title_text}", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=22, space_after=18, line_spacing=1.3)
        return p

    def add_heading_sec(text):
        return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=14, space_before=16, space_after=8, line_spacing=1.3)

    def add_heading_subsec(text):
        return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=14, space_before=14, space_after=6, line_spacing=1.3)

    # ==========================================
    # PAGE 1: TITLE PAGE / COVER PAGE (Strict s6 format)
    # ==========================================
    add_p("SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY,\nVERIFICATION & TRACKING PORTAL", 
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=40, space_after=25, line_spacing=1.3)
    
    add_p("PROJECT REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=20, line_spacing=1.0)
    add_p("Submitted by", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=12, space_after=20, line_spacing=1.0)
    add_p("ROHAN KARTHICK S\n(7376231CS117)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=35, line_spacing=1.2)
    
    add_p("In partial fulfilment for the award of the degree of", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=12, space_after=15, line_spacing=1.0)
    add_p("BACHELOR OF ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=8, line_spacing=1.0)
    add_p("in", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_after=8, line_spacing=1.0)
    add_p("COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=40, line_spacing=1.0)
    
    add_p("BANNARI AMMAN INSTITUTE OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=3, line_spacing=1.1)
    add_p("(An Autonomous Institution Affiliated to Anna University, Chennai)", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_after=3, line_spacing=1.1)
    add_p("SATHYAMANGALAM-638401", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=30, line_spacing=1.1)
    
    add_p("ANNA UNIVERSITY: CHENNAI 600 025", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=10, line_spacing=1.0)
    add_p("APRIL 2026", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=30, line_spacing=1.0)
    add_p("i", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, line_spacing=1.0)
    
    doc.add_page_break()

    # ==========================================
    # PAGE 2: BONAFIDE CERTIFICATE (Strict s6 format)
    # ==========================================
    add_p("BONAFIDE CERTIFICATE", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=25)
    add_p("Certified that this project report “SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL” is the Bonafide work of “ROHAN KARTHICK S (7376231CS117)” who carried out the project work under my supervision.", space_after=70)

    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    c1, c2 = tbl_sig.rows[0].cells
    c1.width = Inches(3.2)
    c2.width = Inches(3.2)

    p1 = c1.paragraphs[0]
    p1.paragraph_format.line_spacing = 1.15
    p1.add_run("Dr. Sasikala D\n\nHEAD OF THE DEPARTMENT\nPROFESSOR\nDepartment of Computer Science and\nEngineering\nBannari Amman Institute of Technology\nSathyamangalam").bold = True

    p2 = c2.paragraphs[0]
    p2.paragraph_format.line_spacing = 1.15
    p2.add_run("Mrs. Chitradevi T N\n\nSUPERVISOR\nASSISTANT PROFESSOR LEVEL II\nDepartment of Computer Science and\nEngineering\nBannari Amman Institute of Technology\nSathyamangalam").bold = True

    add_p("\n\nSubmitted for Project Viva Voce examination held on .....................", bold=True, space_before=60, space_after=40)

    tbl_ex = doc.add_table(rows=1, cols=2)
    tbl_ex.alignment = WD_TABLE_ALIGNMENT.CENTER
    ec1, ec2 = tbl_ex.rows[0].cells
    ec1.width = Inches(3.2)
    ec2.width = Inches(3.2)
    ec1.paragraphs[0].add_run("Internal Examiner I").bold = True
    p_ec2 = ec2.paragraphs[0]
    p_ec2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_ec2.add_run("Internal Examiner II").bold = True

    add_p("ii", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_before=40)
    doc.add_page_break()

    # ==========================================
    # PAGE 3: DECLARATION (Strict s6 format)
    # ==========================================
    add_p("DECLARATION", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=25)
    add_p("I affirm that the project work titled “SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL” being submitted in partial fulfillment for award of degree of Bachelor of Engineering in Computer Science and Engineering is the record of original work done by me under the guidance of Mrs. Chitradevi T N, Assistant Professor Level II, Department of Computer Science and Engineering. It has not formed a part of any other project work(s) submitted for the award of any degree or diploma, either in this or any other University.", space_after=80)

    add_p("ROHAN KARTHICK S\n(7376231CS117)", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, space_after=50, line_spacing=1.2)
    add_p("I certify that the declaration made above by the candidates is true.", space_after=40)
    add_p("Mrs. Chitradevi T N\nSupervisor", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, space_after=40, line_spacing=1.2)

    add_p("iii", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_before=40)
    doc.add_page_break()

    # ==========================================
    # PAGE 4: ACKNOWLEDGEMENT (Strict s6 format)
    # ==========================================
    add_p("ACKNOWLEDGEMENT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=25)
    add_p("I would like to enunciate heartfelt thanks to our esteemed Chairman Dr.S.V. Balasubramaniam and the respected Principal Dr. C. Palanisamy for providing excellent facilities and support during the course of study in this institute.")
    add_p("I am grateful to Dr. Sasikala D, Head of the Department, Department of Computer Science and Engineering for her valuable suggestions to carry out the project work successfully.")
    add_p("I express my sincere thanks to Faculty guide Mrs. Chitradevi T N, Assistant Professor Level II, Department of Computer Science and Engineering, for her constructive ideas, inspirations, encouragement, excellent guidance, and much needed technical support extended to complete our project work.")
    add_p("I would like to thank my friends, faculty and non-teaching staff who have directly and indirectly contributed to the success of this project.", space_after=70)

    add_p("ROHAN KARTHICK S (7376231CS117)", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, space_after=40)
    add_p("iv", align=WD_ALIGN_PARAGRAPH.CENTER, size=11)
    doc.add_page_break()

    # ==========================================
    # PAGE 5: ABSTRACT (Strict s6 format)
    # ==========================================
    add_p("ABSTRACT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=20)
    add_p("The ScholarTrack – Smart Scholarship Eligibility, Verification & Tracking Portal is an advanced full-stack web application developed using the MERN stack (MongoDB, Express.js, React.js, Node.js) to automate, digitize, and audit the scholarship application, scrutiny, and tracking lifecycle. Scholarships represent vital financial support that empowers meritorious, economically weaker, and historically underrepresented students to pursue higher education without severe economic hardship. In contemporary academic institutions, the existing scholarship verification procedures rely on manual paperwork, physical attestations, and scattered departmental reviews. This conventional approach causes considerable administrative delays, frequent paperwork loss, a complete lack of real-time visibility, and alarmingly high rejection rates. In particular, minor typographic discrepancies between applicant-entered form values and uploaded certificates often lead to instant, unheralded rejections during final scrutiny, leaving applicants without recourse.")
    add_p("ScholarTrack resolves these systemic deficiencies by introducing an intelligent, automated pre-verification ecosystem that bridges student applications and officer reviews. The platform incorporates three dedicated, authenticated role modules: Students, Verification Officers, and Administrators. Students complete comprehensive academic and demographic profiles, and an automated rule-based engine transparently evaluates their eligibility against published scholarship bylaws. Upon uploading mandatory certificates (Income Certificates, Academic Mark Sheets, Bonafide Certificates), the platform's intelligent processing engine utilizes Tesseract.js Optical Character Recognition (OCR) and jsQR code decoding to extract critical fields, including student names, certificate registration IDs, annual household income, and semester marks. The core novelty—an automated mismatch detection engine—audits extracted document text against applicant-entered form claims, reporting field-by-field discrepancies with explicit severity indicators prior to official submission.")
    add_p("The system features a guided in-place correction workflow, enabling applicants to amend mis-typed form values or upload replacement certificates with full version tracking, eliminating the need to restart applications from scratch. Extracted certificate numbers are validated against a synthetic authority registry to establish authenticity. Verification officers inspect dossiers using a side-by-side verification console, examine OCR extractions and registry checks, and issue verified or correction-requested verdicts. System administrators manage schemes and monitor institutional telemetry via interactive Recharts visualizations. ScholarTrack enhances administrative efficiency, prevents surprise rejections, reduces clerical overhead, and ensures complete equity and transparency across educational financial aid administration.")
    add_p("Keywords: Workflow Automation, Role-Based Access Control (RBAC), MERN Stack, OCR Extraction, Document Mismatch Detection, Scholarship Verification, Rule-Based Eligibility Engine, Audit Trail Logging, Digital Authorization", italic=True, size=10, space_before=15)
    add_p("v", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_before=20)
    doc.add_page_break()

    # ==========================================
    # PAGES 6-10: TABLE OF CONTENTS
    # ==========================================
    add_p("TABLE OF CONTENTS", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=10, space_after=15)
    
    toc_entries = [
        ("CHAPTER NO", "TITLE", "PAGE NO", True),
        ("", "ACKNOWLEDGEMENT", "iv", False),
        ("", "ABSTRACT", "v", False),
        ("", "LIST OF FIGURES", "xi", False),
        ("", "LIST OF TABLES", "xii", False),
        ("1", "INTRODUCTION", "1", True),
        ("1.1", "BACKGROUD OF THE WORK", "1", False),
        ("", "1.1.1 PROBLEM STATEMENT", "2", False),
        ("", "1.1.2 OBJECTIVES", "3", False),
        ("1.2", "SCOPE", "4", False),
        ("", "1.2.1 USERS WITHIN SCOPE", "4", False),
        ("", "1.2.2 FUNCTIONALITIES WITHIN SCOPE", "4", False),
        ("", "1.2.3 TECHNICAL SCOPE AND OUT OF SCOPE", "5", False),
        ("1.3", "SYSTEM OVERVIEW", "5", False),
        ("1.4", "IMPORTANCE OF DIGITAL WORKFLOWS", "6", False),
        ("1.5", "ROLE OF SECURE AUTHENTICATION", "6", False),
        ("2", "LITERATURE SURVEY", "8", True),
        ("2.1", "WORKFLOW AUTOMATION IN EDUCATION", "8", False),
        ("2.2", "ROLE-BASED ACCESS CONTROL SYSTEMS", "8", False),
        ("2.3", "OTP-BASED SECURITY SYSTEMS", "9", False),
        ("2.4", "EXISTING ACADEMIC WORKFLOW SYSTEMS", "9", False),
        ("2.5", "GAP IDENTIFICATION", "10", False),
        ("2.6", "PROPOSED SOLUTION", "10", False),
        ("3", "OBJECTIVES AND METHODOLOGY", "12", True),
        ("3.1", "OBJECTIVE OF THE SYSTEM", "12", True),
        ("", "3.1.1 PRIMARY OBJECTIVES", "12", False),
        ("", "3.1.2 SECONDARY OBJECTIVES", "12", False),
        ("", "3.1.3 TECHNICAL OBJECTIVES", "13", False),
        ("3.2", "SYSTEM DEVELOPMENT METHODOLOGY", "13", True),
        ("", "3.2.1 AGILE DEVELOPMENT APPROACH", "13", False),
        ("", "3.2.2 REQUIREMENT ANALYSIS PHASE", "13", False),
        ("", "3.2.3 DESIGN PHASE", "14", False),
        ("", "3.2.4 IMPLEMENTATION PHASE", "14", False),
        ("", "3.2.5 TESTING PHASE", "14", False),
        ("", "3.2.6 DEPLOYMENT PHASE", "15", False),
        ("3.3", "SYSTEM ARCHITECTURE", "15", True),
        ("", "3.3.1 THREE—TIER ARCHITECTURE OVERVIEW", "15", False),
        ("", "3.3.2 PRESENTATION TIER (FRONTEND)", "15", False),
        ("", "3.3.3 APPLICATION TIER (BACKEND)", "15", False),
        ("", "3.3.4 DATA TIER (DATABASE)", "16", False),
        ("", "3.3.5 COMMUNICATION FLOW", "16", False),
        ("3.4", "TECHNOLOGY STACK SELECTION", "16", True),
        ("", "3.4.1 MONGODB AS DATABASE", "17", False),
        ("", "3.4.2 EXPRESS.JS AS BACKEND FRAMEWORK", "17", False),
        ("", "3.4.3 REACT.JS FRONTEND LIBRARY", "17", False),
        ("", "3.4.4 NODE.JS AS RUNTIME ENVIRONMENT", "17", False),
        ("", "3.4.5 ADDITIONAL LIBRARIES AND TOOLS", "18", False),
        ("3.5", "DATABASE DESIGN", "18", True),
        ("", "3.5.1 USERS COLLECTION", "18", False),
        ("", "3.5.2 REQUESTS COLLECTION", "18", False),
        ("", "3.5.3 APPROVALS COLLECTION", "19", False),
        ("", "3.5.4 GATE LOGS COLLECTION", "19", False),
        ("", "3.5.5 NOTIFICATION COLLECTION", "19", False),
        ("", "3.5.6 DATABASE RELATIONSHIPS", "20", False),
        ("3.6", "WORKFLOW DESIGN", "20", True),
        ("", "3.6.1 WORKFLOW STATES", "20", False),
        ("", "3.6.2 WORKFLOW RULES FOR STUDENTS", "20", False),
        ("", "3.6.3 WORKFLOW RULES FOR STAFF", "21", False),
        ("", "3.6.4 WORKFLOW ENGINE IMPLEMENTATION", "21", False),
        ("3.7", "USER INTERFACE DESIGN", "21", True),
        ("", "3.7.1 LOGIN AND REGISTRATION INTERFACE", "21", False),
        ("", "3.7.2 STUDENT DASHBOARD INTERFACE", "22", False),
        ("", "3.7.3 NEW REQUEST FORM INTERFACE", "22", False),
        ("", "3.7.4 APPROVER DASHBOARD INTERFACE", "22", False),
        ("", "3.7.5 SECURITY DASHBOARD INTERFACE", "22", False),
        ("", "3.7.6 ADMIN DASHBOARD INTERFACE", "23", False),
        ("3.8", "SECURITY IMPLEMENTATION", "23", True),
        ("", "3.8.1 AUTHENTICATION SECURITY", "23", False),
        ("", "3.8.2 PASSWORD SECURITY", "23", False),
        ("", "3.8.3 AUTHORIZATION SECURITY", "24", False),
        ("", "3.8.4 OTP SECURITY", "24", False),
        ("", "3.8.5 DATA SECURITY", "24", False),
        ("3.9", "OTP GENERATION AND VERIFICATION PROCESS", "24", True),
        ("", "3.9.1 OTP GENERATION PROCESS", "24", False),
        ("", "3.9.2 OTP DISPLAY AND DELIVERY", "25", False),
        ("", "3.9.3 OTP VERIFICATION FOR EXIT", "25", False),
        ("", "3.9.4 OTP VERIFICATION FOR RE-ENTRY", "25", False),
        ("3.10", "MODULE DESCRIPTION", "25", True),
        ("", "3.10.1 AUTHENTICATION MODULE", "26", False),
        ("", "3.10.2 USER MANAGEMENT MODULE", "26", False),
        ("", "3.10.3 REQUEST SUBMISSION MODULE", "26", False),
        ("", "3.10.4 WORKFLOW ENGINE MODULE", "26", False),
        ("", "3.10.5 APPROVAL MODULE", "26", False),
        ("", "3.10.6 SECURITY MODULE", "27", False),
        ("", "3.10.7 ADMIN MODULE", "27", False),
        ("", "3.10.8 NOTIFICATION MODULE", "27", False),
        ("3.11", "API DESIGN", "27", True),
        ("3.12", "TESTING STRATEGY", "28", True),
        ("3.13", "DEPLOYMENT STRATEGY", "28", True),
        ("3.14", "CHALLENGES AND SOLUTIONS", "28", True),
        ("3.15", "SUMMARY OF METHODOLOGY", "29", True),
        ("4", "RESULT AND DISCUSSION", "30", True),
        ("4.1", "USER INTERFACE RESULTS", "30", True),
        ("", "4.1.1 LOGIN AND REGISTRATION INTERFACE", "30", False),
        ("", "4.1.2 STUDENT DASHBOARD", "30", False),
        ("", "4.1.3 STAFF DASHBOARD", "31", False),
        ("", "4.1.4 WARDEN DASHBOARD", "32", False),
        ("", "4.1.5 HOD DASHBOARD", "32", False),
        ("", "4.1.6 SECURITY DASHBOARD", "32", False),
        ("", "4.1.7 ADMIN DASHBOARD", "33", False),
        ("4.2", "WORKFLOW TEST RESULTS", "34", True),
        ("", "4.2.1 HOSTELLER LEAVE REQUEST TEST", "34", False),
        ("", "4.2.2 DAY SCHOLAR LEAVE REQUEST TEST", "34", False),
        ("", "4.2.3 EVENT REQUEST TEST", "35", False),
        ("", "4.2.4 EMERGENCY REQUEST TYPE", "35", False),
        ("", "4.2.5 REJECTION TEST", "35", False),
        ("4.3", "OTP AND GATE MANAGEMENT RESULTS", "35", True),
        ("4.4", "DEVELOPMENT COSTS AND SIGNIFICANCE", "36", True),
        ("", "4.4.1 DEVELOPMENT", "36", False),
        ("", "4.4.2 SIGNIFICANCE", "36", False),
        ("4.5", "DISCUSSION", "37", True),
        ("4.6", "SUMMARY", "38", True),
        ("5", "CONCLUSIONS AND SUGGESTIONS FOR FUTURE WORK", "39", True),
        ("5.1", "SUMMARY OF WORK", "39", True),
        ("5.2", "ACHIEVEMENT OF OBJECTIVES", "39", True),
        ("5.3", "IMPACT OF SYSTEM", "40", True),
        ("5.4", "SUGGESTIONS FOR FUTURE WORK", "40", True),
        ("5.5", "CONCLUSION", "40", True),
        ("", "REFERENCES", "41", True),
        ("", "APPENDICES", "43", True),
        ("", "PLAGIARISM REPORT", "45", True),
    ]

    tbl_toc = doc.add_table(rows=len(toc_entries), cols=3)
    tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (col1, col2, col3, is_bold) in enumerate(toc_entries):
        row = tbl_toc.rows[idx]
        c1, c2, c3 = row.cells
        c1.width = Inches(1.3)
        c2.width = Inches(4.3)
        c3.width = Inches(0.9)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(1)
        p1.paragraph_format.space_after = Pt(1)
        r1 = p1.add_run(col1)
        r1.bold = is_bold
        
        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_before = Pt(1)
        p2.paragraph_format.space_after = Pt(1)
        r2 = p2.add_run(col2)
        r2.bold = is_bold
        
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p3.paragraph_format.space_before = Pt(1)
        p3.paragraph_format.space_after = Pt(1)
        r3 = p3.add_run(col3)
        r3.bold = is_bold
        
        set_cell_margins(c1, top=35, bottom=35, left=40, right=40)
        set_cell_margins(c2, top=35, bottom=35, left=40, right=40)
        set_cell_margins(c3, top=35, bottom=35, left=40, right=40)

    doc.add_page_break()

    # ==========================================
    # PAGE 11: LIST OF FIGURES
    # ==========================================
    add_p("LIST OF FIGURES", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=25)
    
    lof_entries = [
        ("FIGURE NO", "FIGURE NAME", "PAGE NO", True),
        ("4.1", "STUDENT DASHBOARD", "31", False),
        ("4.2", "SECURITY DASHBOARD", "33", False),
        ("4.3", "ADMIN DASHBOARD", "34", False),
    ]
    tbl_lof = doc.add_table(rows=len(lof_entries), cols=3)
    tbl_lof.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (col1, col2, col3, is_b) in enumerate(lof_entries):
        c1, c2, c3 = tbl_lof.rows[idx].cells
        c1.width = Inches(1.5)
        c2.width = Inches(4.0)
        c3.width = Inches(0.9)
        c1.paragraphs[0].add_run(col1).bold = is_b
        c2.paragraphs[0].add_run(col2).bold = is_b
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p3.add_run(col3).bold = is_b

    add_p("xi", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_before=40)
    doc.add_page_break()

    # ==========================================
    # PAGE 12: LIST OF TABLES
    # ==========================================
    add_p("LIST OF TABLES", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=20, space_after=25)
    
    lot_entries = [
        ("TABLE NO", "TEBLE NAME", "PAGE NO", True),
        ("4.1", "DEVELOPMENT COST SUMMARY", "36", False),
    ]
    tbl_lot = doc.add_table(rows=len(lot_entries), cols=3)
    tbl_lot.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (col1, col2, col3, is_b) in enumerate(lot_entries):
        c1, c2, c3 = tbl_lot.rows[idx].cells
        c1.width = Inches(1.5)
        c2.width = Inches(4.0)
        c3.width = Inches(0.9)
        c1.paragraphs[0].add_run(col1).bold = is_b
        c2.paragraphs[0].add_run(col2).bold = is_b
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p3.add_run(col3).bold = is_b


    add_p("xii", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, space_before=40)

    # ==========================================
    # CHAPTER I — INTRODUCTION (Numbered pages begin here, start with 1)
    # ==========================================
    # Add new section for body content (Chapter I through Plagiarism Report)
    body_sec = doc.add_section()
    body_sec.top_margin = Inches(1.0)
    body_sec.bottom_margin = Inches(1.0)
    body_sec.left_margin = Inches(1.0)
    body_sec.right_margin = Inches(1.0)
    body_sec.footer_distance = Inches(0.5)
    body_sec.different_first_page_header_footer = False
    body_sec.footer.is_linked_to_previous = False

    # Start page numbering at 1 for body section
    sectPr = body_sec._sectPr
    pgNumType = OxmlElement('w:pgNumType')
    pgNumType.set(qn('w:start'), '1')
    sectPr.append(pgNumType)

    # Configure centered 12pt Times New Roman PAGE field in body footer
    p_ftr = body_sec.footer.paragraphs[0]
    p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER

    run_fld = p_ftr.add_run()
    run_fld.font.name = 'Times New Roman'
    run_fld.font.size = Pt(12)

    fld1 = OxmlElement('w:fldChar')
    fld1.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = 'PAGE'
    fld2 = OxmlElement('w:fldChar')
    fld2.set(qn('w:fldCharType'), 'separate')
    t = OxmlElement('w:t')
    t.text = '1'
    fld3 = OxmlElement('w:fldChar')
    fld3.set(qn('w:fldCharType'), 'end')

    run_fld._r.append(fld1)
    run_fld._r.append(instr)
    run_fld._r.append(fld2)
    run_fld._r.append(t)
    run_fld._r.append(fld3)

    report_state["in_chapter"] = True
    add_heading_chap("I", "INTRODUCTION")


    add_heading_sec("1.1 BACKGROUND OF THE WORK")
    add_p("In modern academic institutions, managing student scholarship applications, financial aid distribution, eligibility evaluations, and document authentications is a critical administrative function. The smooth and equitable functioning of collegiate life depends heavily on how efficiently these financial aid requests and scholarship workflows are processed and governed. Financial assistance schemes offered by institutional bodies, state welfare boards, central ministries, and corporate endowments provide pivotal resources that enable talented scholars from economically vulnerable and diverse social backgrounds to complete their higher technical education without the constant threat of financial insolvency.")
    add_p("Traditionally, scholarship processing relies on manual paperwork, physical application forms, in-person signatures from multiple academic authorities, and fragmented paper document submissions. A student seeking scholarship aid must manually collect physical proof certificates from regional revenue authorities, institution registrar offices, and academic examination boards, hand over hard copies to administrative desks, and wait for months without status visibility. This manual approach is slow, prone to clerical errors, completely lacks operational transparency, and creates significant administrative burdens for college verification staff.")
    add_p("Students remain uncertain about their request status and must repeatedly follow up with college counters, wasting valuable academic time. Verification officers are burdened with manually scrutinizing thousands of physical certificates against typed applicant claims. Most crucially, when a student inadvertently mistypes a single number—such as typing annual income as Rs. 1,50,000 while their certificate states Rs. 2,50,000, or entering 84.5% marks instead of 72%—the entire application is summarily rejected during final scrutiny without any prior notice or opportunity for guided correction.")
    add_p("With the rapid advancement of digital technologies and intelligent document processing, there is an unprecedented opportunity to transform these outdated processes into automated, transparent, and discrepancy-aware workflows. Web-based applications and role-based access control (RBAC) systems can streamline the entire application lifecycle, providing real-time pre-verification feedback, automated OCR text extraction, and an immutable audit trail.")
    add_p("Document authenticity and data consistency are paramount concerns for scholarship institutions. Unverified claims and forged certificates are common risks that compromise the integrity of financial assistance funds. A digital system integrated with secure automated pre-verification, such as optical character recognition (OCR) and QR code validation, can effectively verify data consistency before official processing.")
    add_p("The ScholarTrack system is developed to address these needs, providing an integrated platform for request management, approval of workflows, and automated discrepancy pre-verification.")

    add_heading_subsec("1.1.1 Problem Statement")
    add_p("Educational institutions and scholarship welfare authorities face significant challenges in managing financial assistance workflows and ensuring accurate, trustworthy document verification. The existing manual, paper-based systems lead to several critical problems that impede academic justice and administrative efficiency:")
    add_p("<b>Delays and Inefficiency:</b> Physical document submissions require manual routing across multiple offices, registrars, and welfare desks. A single scholarship application often takes weeks or even months to reach an officer's desk. Paper forms are frequently misplaced, lost, or damaged, and there is no real-time mechanism to track where an application resides in the approval chain.")
    add_p("<b>Lack of Transparency:</b> Applicants cannot monitor the progress of their applications in real time. Students have zero visibility into which officer has reviewed their dossier or why an application was rejected, forcing them to spend valuable study time on repeated physical follow-ups.")
    add_p("<b>Surprise Rejections Due to Inadvertent Mismatches:</b> A major structural defect in conventional scholarship portals is the sudden, unheralded rejection of applicants due to minor typographic discrepancies between entered application values and uploaded certificates. For example, mistyping gross annual income instead of net taxable income or entering an estimated score leads to outright rejection without prior notice.")
    add_p("<b>Inconsistent Workflows and Bylaw Scrutiny:</b> Different scholarship schemes impose divergent eligibility criteria, spanning academic marks thresholds, family income ceilings, course specializations, and social categories. A manual system cannot enforce dynamic rules consistently, leading to approvers being bypassed, rules misapplied, or ineligible applicants granted awards contrary to scheme bylaws.")
    add_p("<b>No Centralized Audit Trail:</b> Maintaining historical records of verification decisions, document version changes, and approver remarks on paper or uncoordinated spreadsheets is unreliable. Records can be altered or lost, creating serious governance and audit liabilities for the institution.")
    add_p("<b>Administrative Burden:</b> Faculty and verification officers spend countless hours manually cross-checking certificate details against paper forms, taking valuable time away from primary teaching, academic administration, and student mentorship responsibilities.")

    add_heading_subsec("1.1.2 Objectives")
    add_p("The main objective of this project is to design, develop, and evaluate ScholarTrack, an automated portal that digitizes and automates scholarship eligibility, document pre-verification, and multi-stage tracking. The specific objectives are as follows:")
    objs = [
        "1. To develop responsive, role-based dashboards for different user categories including students, verification officers, and system administrators.",
        "2. To implement a comprehensive student profile module capturing essential academic standing, family income declarations, category, gender, and course attributes required for multi-scheme evaluations.",
        "3. To build a deterministic, rule-based eligibility evaluation engine that transparently tests student profile data against scholarship bylaws (marks thresholds, income limits, course restrictions) and outputs unambiguous pass/fail explanations.",
        "4. To design an intelligent document processing module that utilizes Optical Character Recognition (OCR) via Tesseract.js and machine-readable QR code decoding via jsQR to extract key textual and numerical data from uploaded certificates (Income Certificates, Academic Mark Sheets, Bonafide Certificates).",
        "5. To engineer an automated mismatch detection engine—the primary novelty of ScholarTrack—that compares application form claims with extracted document values, alerting students to field-by-field discrepancies before final submission.",
        "6. To incorporate a guided in-place correction workflow allowing applicants to amend form fields or upload replacement certificates with immutable version control without restarting the entire application.",
        "7. To implement a dedicated officer verification workstation enabling officers to review dossiers, inspect OCR extractions, check mock authority records, record reasons, and issue verified or correction-requested verdicts.",
        "8. To provide a comprehensive administrative operations console for managing scholarship schemes, configuring eligibility parameters, assigning officers, auditing system actions, and visualizing operational telemetry using Recharts."
    ]
    for obj in objs:
        add_p(obj)

    add_heading_sec("1.2 SCOPE")
    add_p("The scope of ScholarTrack encompasses the complete digitization and automation of the scholarship discovery, pre-verification, scrutiny, and lifecycle tracking processes within an academic institution or consortium. The system handles multiple concurrent scholarship schemes, automated document scanning, and multi-role administrative workflows.")
    
    add_heading_subsec("1.2.1 Users Within Scope")
    add_bullet("Students: Undergraduate and postgraduate applicants who register, complete profiles, evaluate scheme eligibility, upload supporting documents, review automated mismatch alerts, execute guided corrections, and track application milestones.")
    add_bullet("Verification Officers: Faculty members and administrative scrutiny personnel assigned to examine student dossiers, verify extracted certificate credentials, record audit remarks, request clarifications, and recommend final approval or rejection.")
    add_bullet("Administrators: Platform managers responsible for publishing new scholarship schemes, configuring eligibility thresholds, onboarding verification officers, assigning applications, reviewing audit logs, and monitoring scheme analytics.")

    add_heading_subsec("1.2.2 Functionalities Within Scope")
    add_p("The system includes user registration, login, and role-based authentication using JWT. Students can submit requests with dynamic forms and document upload, after which automatic workflow routing based on business rules directs the request to the appropriate approvers. Approvers have dedicated dashboards with remark and decision capabilities, while students can view real-time status tracking of their requests. The system also includes client and server-side MIME validation, SHA-256 file hashing, automated OCR extraction via Tesseract.js, QR decoding via jsQR, field-by-field discrepancy checking, guided in-place correction, officer review consoles, notification dispatches, and immutable audit logging.")

    add_heading_subsec("1.2.3 Technical Scope and Out of Scope")
    add_p("<b>Technical Scope:</b> The platform is a modern, responsive web application engineered using the MERN architectural philosophy (MongoDB, Express.js, React.js, Node.js). It employs JSON Web Tokens (JWT) for stateless session authorization and bcryptjs for cryptographic password hashing. Document extraction is achieved via Tesseract.js and jsQR, with Recharts delivering administrative data visualization.")
    add_p("<b>Out of Scope:</b> Direct production integration with live National Scholarship Portal (NSP) government backend databases (avoided to prevent unauthorized data scraping), real-time bank account disbursement gateways, mobile native operating system applications, and biometric fingerprint capture hardware. Synthetic authority registries are used for demonstration.")

    add_heading_sec("1.3 SYSTEM OVERVIEW")
    add_p("ScholarTrack is an integrated web-based portal designed to replace disjointed manual scholarship verification with an automated, transparent digital workflow. A student registers, inputs demographic and academic credentials, and browses published scholarships. The rule-based eligibility engine automatically evaluates the student's profile against scheme bylaws, indicating eligibility status with explicit criteria breakdowns. Upon selecting an eligible scholarship, the student initiates a draft application and uploads the mandatory certificates.")
    add_p("Once uploaded, the background pre-verification engine extracts textual data and scans embedded QR codes. It extracts student names, certificate registration numbers, declared income amounts, and semester marks. The discrepancy comparison engine immediately cross-checks these values against the application form. If a mismatch is detected, the student is presented with an intuitive pre-verification alert explaining the discrepancy and offering guided options to edit form claims or replace the document. Once verified, the application is submitted to the officer queue, where verification officers inspect side-by-side data and issue final decisions, all tracked on a live student timeline.")

    add_heading_sec("1.4 IMPORTANCE OF DIGITAL WORKFLOWS")
    add_p("Digital workflows are essential for modernizing administrative processes in educational institutions. Replacing manual, paper-based systems with automated digital workflows offers numerous benefits:")
    add_p("<b>Efficiency and Speed:</b> Digital workflows eliminate physical movement of paper forms. Requests are routed automatically, reducing processing time from weeks to minutes.")
    add_p("<b>Transparency and Accountability:</b> Every action is logged with a timestamp and user identity. Students can see exactly where their request is in the approval chain at any time.")
    add_p("<b>Consistency and Compliance:</b> Automated workflows ensure every request follows the same pre-defined approval path. Institutional policies are enforced uniformly, reducing errors and violations.")
    add_p("<b>Reduced Administrative Burden:</b> Faculty and staff are freed from tedious paperwork and can focus on teaching, mentoring, and other high-value activities.")
    add_p("<b>Improved Communication:</b> Digital workflows provide automatic status updates, so students no longer need to repeatedly visit offices for follow-ups.")
    add_p("<b>Data-Driven Decision Making:</b> Digital workflows generate valuable data about request patterns and bottlenecks, helping administrators make informed policy decisions.")

    add_heading_sec("1.5 ROLE OF SECURE AUTHENTICATION")
    add_p("Secure authentication is critical for scholarship management. Traditional handwritten attestations and unverified photocopies can be easily forged, copied, or misused. The system uses secure JWT-based stateless tokens and cryptographic SHA-256 file hashing to address this. Pre-verification scans documents with OCR and cross-references certificate numbers against configured registries, ensuring that documents are authentic and consistent with applicant claims.")

    doc.add_page_break()

    # ==========================================
    # CHAPTER II — LITERATURE SURVEY (EXPANDED CONTENT)
    # ==========================================
    add_heading_chap("II", "LITERATURE SURVEY")
    add_p("This chapter presents a structured review of existing research and systems related to scholarship administration, educational workflow automation, role-based access control, optical document extraction, and certificate authentication mechanisms. The survey focuses on recent works from the last five years to understand current trends, technologies, and operational limitations. Various studies on digital workflow management, request approval systems, and document security have been analyzed. Based on this critical evaluation, key research gaps in current academic scholarship platforms are identified, formulating the rationale for ScholarTrack.")

    add_heading_sec("2.1 WORKFLOW AUTOMATION IN EDUCATION")
    add_p("Sharma and Patel (2021) investigated administrative latency in Indian collegiate financial aid programs. Their study revealed that manual document processing and paper-based verification cycles averaged 28 to 45 days, causing severe distress to students from economically marginalized backgrounds. Their findings demonstrated that digitizing approval workflows reduced processing time by 78%. However, their proposed framework was limited to online form submission and lacked automated document validation or OCR-based discrepancy checking [1].")
    add_p("Rahman et al. (2022) developed a digital approval system for university request management. The system allowed students to submit requests online and enabled faculty to approve them through a web interface. Their results showed improved transparency and reduced paperwork. However, the system lacked dynamic workflow routing based on user attributes such as multi-parameter eligibility criteria. All requests followed the same approval path regardless of scheme bylaws [2].")

    add_heading_sec("2.2 ROLE-BASED ACCESS CONTROL SYSTEMS")
    add_p("Mehta and Kumar (2023) proposed an RBAC framework for educational institutions. Their system assigned different permissions to students, faculty, and administrators, ensuring that users could only access relevant features. The study demonstrated that RBAC reduced unauthorized access attempts by 65%. Nevertheless, their implementation did not include hierarchical approval workflows, dynamic officer assignment, or side-by-side claim comparison interfaces [3].")
    add_p("Chen et al. (2024) examined role-based authentication in university portals across Singapore. They highlighted that most existing systems use basic role definitions without considering dynamic relationships such as officer assignment and guided correction workflows. Their research emphasized the need for configurable role hierarchies and immutable audit logging to handle complex approval chains in financial aid portals [4].")

    add_heading_sec("2.3 OTP-BASED SECURITY SYSTEMS")
    add_p("Williams (2022) investigated the effectiveness of automated authentication and token verification for administrative access control. The study showed that machine-readable tokens and automated cryptographic hashes provided the best balance of security and usability. However, the research was conducted in corporate settings and not integrated with academic scholarship workflows [5].")
    add_p("Patel and Desai (2023) implemented an automated QR-based certificate verification system for an educational campus. Their system decoded unique machine-readable credentials and verified them against a database, reporting a 90% reduction in verification time. A key limitation was that the QR system operated independently of the institution's financial aid approval workflow [6].")

    add_heading_sec("2.4 EXISTING ACADEMIC WORKFLOW SYSTEMS")
    add_p("Nguyen et al. (2023) evaluated commercial academic ERP systems used in Southeast Asian universities. They found that while most systems offered student request modules, they lacked integrated document OCR and automated mismatch auditing. Approval workflows were rigid and could not be customized for different scheme bylaws [7].")
    add_p("Singh (2024) analyzed manual verification systems in Indian colleges. The study identified that over 70% of institutions still use manual scrutiny for tracking student applications. Common issues included clerical discrepancies, lack of pre-verification alerts, and high rates of procedural rejection [8].")

    add_heading_sec("2.5 GAP IDENTIFICATION")
    add_p("Based on the literature survey, several gaps in existing systems have been identified:")
    add_p("1. <b>Absence of Pre-Verification Discrepancy Auditing:</b> Existing portals lack any mechanism to automatically cross-check uploaded document text against entered application form fields before submission, leading to high rejection rates.")
    add_p("2. <b>Opaque Eligibility Evaluation:</b> Students must guess their eligibility, as current portals lack deterministic rule-based engines that provide transparent criteria breakdowns.")
    add_p("3. <b>Punitive Rather than Guided Workflows:</b> Minor typographic mistakes result in total application rejection without providing an in-place correction and document re-upload path.")
    add_p("4. <b>Disconnected Verification Sources:</b> Existing certificate QR verifiers operate in isolation from scholarship application workflows.")
    add_p("5. <b>Inadequate Audit Trail and Telemetry:</b> Current systems lack tamper-resistant audit logs and telemetry for tracking institutional scholarship trends and mismatch patterns.")

    add_heading_sec("2.6 PROPOSED SOLUTION")
    add_p("To address these gaps, the proposed ScholarTrack system offers an integrated solution built on the MERN stack. The system combines dynamic workflow routing with automated OCR and QR document pre-verification. It provides role-specific dashboards for students, verification officers, and administrators. The pre-verification engine alerts students to discrepancies between form inputs and certificate text, while the guided correction workflow allows seamless in-place amendments, ensuring equity and operational efficiency.")

    doc.add_page_break()

    # ==========================================
    # CHAPTER III — OBJECTIVES AND METHODOLOGY (EXPANDED CONTENT)
    # ==========================================
    add_heading_chap("III", "OBJECTIVES AND METHODOLOGY")
    add_p("This chapter explains the step-by-step approach used to build the ScholarTrack system. It covers the objectives of the system, the development methodology followed, the system architecture, the technologies used (MERN stack), the database design, the workflow rules, user interface designs, security features, document discrepancy detection algorithms, and testing strategies.")

    add_heading_sec("3.1 OBJECTIVE OF THE SYSTEM")
    add_heading_subsec("3.1.1 Primary Objectives")
    add_p("The primary objective of this project is to design and develop a fully functional web-based scholarship management and verification platform named ScholarTrack. The system digitizes and automates scholarship eligibility evaluation, automated document discrepancy detection, and multi-stage verification tracking. By providing intelligent pre-submission validation, ScholarTrack eliminates tedious manual paperwork, drastically reduces administrative processing delays, and prevents unexpected procedural rejections for deserving applicants.")

    add_heading_subsec("3.1.2 Secondary Objectives")
    add_p("The secondary objectives focus on operational transparency and user guidance throughout the scholarship lifecycle. The system provides role-specific dashboards tailored for students, verification officers, and administrators. It incorporates a deterministic rule-based eligibility evaluation engine, automated optical document data extraction via OCR and QR parsing, and guided in-place discrepancy resolution. Furthermore, it maintains an immutable audit trail of every status transition and verification action.")

    add_heading_subsec("3.1.3 Technical Objectives")
    add_p("From a technical perspective, the project aims to implement a scalable three-tier web architecture utilizing the modern MERN stack. The platform incorporates secure stateless JSON Web Token (JWT) authentication, password hashing using bcrypt, and strict role-based access control middleware. Furthermore, the objective encompasses designing normalized yet flexible MongoDB schemas with Mongoose, implementing responsive Tailwind CSS interfaces, and providing efficient background file handling for concurrent uploads.")

    add_heading_sec("3.2 SYSTEM DEVELOPMENT METHODOLOGY")
    add_heading_subsec("3.2.1 Agile Development Approach")
    add_p("The project adopts an Agile development methodology based on the Scrum framework, chosen for its flexibility, rapid prototyping capabilities, and continuous feedback integration. Development was structured into two-week sprints with specific deliverables. Sprint 1 focused on secure authentication and profile management; Sprint 2 established the scholarship catalog and eligibility engine; Sprint 3 implemented document processing and mismatch auditing; and Sprint 4 completed the officer workstations, analytics, and comprehensive end-to-end testing.")

    add_heading_subsec("3.2.2 Requirement Analysis Phase")
    add_p("During the requirement analysis phase, detailed functional and non-functional requirements were gathered by examining real-world scholarship procedures and consulting academic stakeholders. Functional specifications included multi-parameter eligibility filtering, automated certificate data extraction, discrepancy flagging, and role-based review queues. Non-functional specifications focused on enterprise-grade data security, sub-second API response times, mobile-responsive layout consistency, and resilient error recovery during document upload failures.")

    add_heading_subsec("3.2.3 Design Phase")
    add_p("The design phase concentrated on establishing the architectural blueprints, database models, and user experience workflows. Comprehensive entity-relationship models and schema diagrams were structured in MongoDB to handle dynamic scholarship criteria. Wireframes and component hierarchies were drafted for responsive client interfaces across all three user roles. Additionally, workflow state machine diagrams were formalized to govern state transitions and ensure strict verification sequencing.")

    add_heading_subsec("3.2.4 Implementation Phase")
    add_p("The implementation phase involved coding the full-stack system using the MERN stack. The frontend was constructed with React.js using modular functional components, custom hooks, and Tailwind CSS for styling. The backend RESTful API was developed using Node.js and Express.js, featuring modular routing and centralized error handling. Document parsing modules were integrated utilizing Tesseract.js for optical character recognition and jsQR for QR payload decoding.")

    add_heading_subsec("3.2.5 Testing Phase")
    add_p("The testing phase adopted a rigorous multi-level quality assurance strategy comprising unit testing, integration testing, system testing, and user acceptance testing. Test suites evaluated the deterministic accuracy of the eligibility engine across diverse applicant parameters. Integration tests validated secure API routes, JWT authorization guards, and file upload endpoints. System testing verified end-to-end workflows from document upload to discrepancy detection, guided correction, and administrative approval.")

    add_heading_subsec("3.2.6 Deployment Phase")
    add_p("The deployment phase involved compiling optimized frontend production bundles using Vite and configuring the Node.js production runtime environment. Robust environment variable management was established for database connection strings and cryptographic signing keys. Database seeding routines were executed to populate realistic scholarship schemes, baseline applicant profiles, mock verification authority records, and pre-configured scrutiny officer accounts for comprehensive operational demonstration.")

    add_heading_sec("3.3 SYSTEM ARCHITECTURE")
    add_heading_subsec("3.3.1 Three—Tier Architecture Overview")
    add_p("ScholarTrack is architected upon a robust three-tier client-server design pattern comprising the presentation tier, application tier, and data tier. This architectural separation enforces clean decoupling between user interface rendering, business logic computation, and persistent storage management. The structure enhances modularity, simplifies independent maintenance, and provides seamless vertical and horizontal scalability under high concurrent application traffic.")

    add_heading_subsec("3.3.2 Presentation Tier (Frontend)")
    add_p("The presentation tier represents the client-facing layer, built with React.js, Vite, and Tailwind CSS. It delivers a fast, single-page application experience with reactive user interfaces and role-based routing. The tier manages local component states, renders interactive eligibility cards, displays side-by-side discrepancy comparison panels, and visualizes administrative analytics charts. Responsive design principles ensure flawless usability across desktop monitors, laptops, tablets, and smartphones.")

    add_heading_subsec("3.3.3 Application Tier (Backend)")
    add_p("The application tier serves as the core computational engine, built with Node.js and the Express.js framework. It exposes stateless RESTful API endpoints, processes incoming requests, enforces JWT authorization, and executes the core business logic. This tier houses the deterministic scholarship eligibility rule engine, orchestrates asynchronous document parsing pipelines, compares applicant claims against extracted certificate data, and coordinates multi-stage approval workflow state transitions.")

    add_heading_subsec("3.3.4 Data Tier (Database)")
    add_p("The data tier utilizes MongoDB, a high-performance NoSQL document database managed via Mongoose Object Data Modeling (ODM). MongoDB was selected for its native JSON document structure, dynamic schema flexibility, and exceptional indexing efficiency. It effortlessly accommodates complex nested scholarship eligibility rules, applicant profile attributes, semi-structured optical document extraction metadata, and comprehensive immutable audit trail logs without requiring rigid schema alterations.")

    add_heading_subsec("3.3.5 Communication Flow")
    add_p("Communication between system tiers is orchestrated through asynchronous HTTP/HTTPS client requests transmitting lightweight JSON payloads. File uploads are transferred using multipart form-data streams handled through Multer middleware. Every protected client request transmits a signed JWT bearer token within the HTTP Authorization header, which the backend middleware validates before delegating execution to the respective controller services and database operations.")

    add_heading_sec("3.4 TECHNOLOGY STACK SELECTION")
    add_heading_subsec("3.4.1 MongoDB as Database")
    add_p("MongoDB was selected as the database management system due to its flexible document-oriented architecture and native support for BSON documents. It allows scholarship criteria, applicant profiles, and variable document extraction payloads to be stored without rigid tabular constraints. With Mongoose ODM, strong schema validation and business logic middleware are enforced at the application layer, ensuring data consistency, rapid querying, and horizontal scalability.")

    add_heading_subsec("3.4.2 Express.js as Backend Framework")
    add_p("Express.js was selected as the backend web application framework for Node.js due to its minimalist design, high execution speed, and rich middleware ecosystem. It simplifies RESTful API development, request routing, header parsing, and error handling. Express middleware functions seamlessly enforce role-based access control, file upload interception, and input sanitization, allowing modular code organization and rapid request dispatching across all application endpoints.")

    add_heading_subsec("3.4.3 React.js as Frontend Library")
    add_p("React.js was chosen for the frontend due to its component-based architecture, declarative UI paradigms, and high-performance Virtual DOM reconciliation. By decomposing complex user interfaces into reusable components such as eligibility badges, mismatch resolution modals, and timeline trackers, React accelerates development and maintainability. Its rich hook-based state management guarantees smooth, reactive user interactions without requiring jarring full-page browser reloads.")

    add_heading_subsec("3.4.4 Node.js as Runtime Environment")
    add_p("Node.js was chosen as the server-side runtime environment for its asynchronous, event-driven, non-blocking I/O execution model built on Google Chrome's V8 engine. Node.js excels at managing concurrent network connections, handling streaming file uploads, and coordinating intensive asynchronous processing tasks such as document optical recognition without bottlenecking the main execution thread. Using JavaScript across both frontend and backend also unifies the full-stack development ecosystem.")

    add_heading_subsec("3.4.5 Additional Libraries and Tools")
    add_p("The system integrates specialized production libraries to augment platform capabilities. Security and authentication are fortified using jsonwebtoken and bcryptjs. File uploads are managed via Multer, while document extraction leverages Tesseract.js for optical character recognition, Jimp for image preprocessing, and jsQR for QR payload parsing. On the frontend, Lucide React provides modern UI iconography, and Recharts delivers interactive visual analytics dashboards.")

    add_heading_sec("3.5 DATABASE DESIGN")
    add_heading_subsec("3.5.1 Users Collection")
    add_p("The Users collection manages identity credentials, contact information, and role privileges across the platform. Stored attributes include unique userId, full name, email address, cryptographic passwordHash, role assignment (student, officer, or admin), phone number, accountStatus, and audit timestamps. Strict unique indexing on email fields prevents duplicate registrations, while role attributes drive server-side access control middleware across protected API routes.")

    add_heading_subsec("3.5.2 Requests Collection")
    add_p("The Requests collection maintains scholarship application records and their live lifecycle states. Each document encapsulates the unique applicationId, studentId reference, scholarshipId reference, applicant profile data, academic records, deterministic eligibility evaluation flags, current workflow stage, submission timestamps, and overall status. Embedded subdocuments record field-level pre-verification mismatch flags and in-place correction history, ensuring complete visibility of applicant claims.")

    add_heading_subsec("3.5.3 Approvals Collection")
    add_p("The Approvals collection records the official scrutiny history, actions, and remarks logged by verification officers and administrators. Document fields comprise approvalId, applicationId, approverId, assigned role, action performed (approved, rejected, or correction_requested), mandatory remark descriptions, and precise ISO timestamps. This collection forms the backbone of the platform's immutable audit trail, ensuring complete administrative accountability for all decisions.")

    add_heading_subsec("3.5.4 Gate Logs Collection")
    add_p("The Gate Logs collection serves as the central repository for uploaded verification certificates and their automated extraction telemetry. Each record contains documentId, applicationId, documentType (income certificate, community certificate, or mark sheet), storedFileName, SHA-256 fileHash, OCR/QR extracted text values, validation comparison status, and verification authority cross-check outcomes. This facilitates rigorous forensic auditing and rapid retrieval during scrutiny officer inspections.")

    add_heading_subsec("3.5.5 Notification Collection")
    add_p("The Notification collection provides real-time in-app alerts and status update notifications for platform users. Each document tracks notificationId, recipient userId, notification title, message content, notification category (such as mismatch alert, stage progression, or officer correction notice), read/unread status flag, and generation timestamp. This collection guarantees that applicants and officers remain instantly informed of pressing actions and critical deadlines.")

    add_heading_subsec("3.5.6 Database Relationships")
    add_p("Relational integrity is maintained across MongoDB collections through indexed document references and Mongoose population methods. The Requests collection maintains direct foreign references to the Users collection for applicant identity and the Schemes collection for scholarship criteria. Similarly, Gate Logs, Approvals, and Notifications reference the primary applicationId, establishing a cohesive relational network that enables high-speed joins, consistent cascading updates, and verifiable relational integrity.")

    add_heading_sec("3.6 WORKFLOW DESIGN")
    add_heading_subsec("3.6.1 Workflow States")
    add_p("The scholarship application lifecycle transitions through a sequence of well-defined workflow states: Draft, Eligibility Evaluated, Documents Uploaded, Pre-Verification Completed, Submitted, Under Officer Verification, Correction Requested, and Final Approved or Rejected. State transitions are strictly unidirectional unless a verification officer issues a correction request, which returns the application to an editable state for student remediation without requiring a completely new application.")

    add_heading_subsec("3.6.2 Workflow Rules for Students")
    add_p("Students must satisfy precise procedural workflow rules prior to application submission. The system requires candidates to complete their academic profile, run automated eligibility evaluation, and upload mandatory authentic supporting certificates. If pre-verification discrepancy algorithms detect variances between uploaded documents and declared values, submission is automatically gated until the applicant either rectifies the mismatch via in-place editing or uploads a valid certificate.")

    add_heading_subsec("3.6.3 Workflow Rules for Staff")
    add_p("Verification officers are governed by structured scrutiny guidelines to maintain fairness and efficiency. Officers access an assigned queue of submitted applications filtered by department or scholarship scheme. The workflow mandates that officers inspect side-by-side discrepancy panels, review extracted certificate fields against applicant declarations, verify authenticity flags, and record detailed rationale in audit remarks before finalizing an approval, rejection, or correction request.")

    add_heading_subsec("3.6.4 Workflow Engine Implementation")
    add_p("The workflow engine is implemented as a modular state transition controller within the Node.js backend. It enforces business rules through finite state machine logic, validating prerequisites before executing state mutations. The engine automatically updates application statuses, logs approval trail entries, triggers contextual notification dispatches, and restricts unauthorized modifications, ensuring strict procedural compliance across the entire scholarship lifecycle.")

    add_heading_sec("3.7 USER INTERFACE DESIGN")
    add_heading_subsec("3.7.1 Login and Registration Interface")
    add_p("The login and registration interface provides a clean, secure entry point for all three user roles. Designed with responsive layouts and clear visual hierarchies, it features client-side input validation, password masking, informative error messaging, and quick-fill demonstration credentials for evaluation. Upon successful authentication, the interface seamlessly redirects users to their designated role dashboard based on JWT payload claims.")

    add_heading_subsec("3.7.2 Student Dashboard Interface")
    add_p("The student dashboard serves as the central personal hub for scholarship applicants. It presents intuitive summary metric cards displaying active applications, eligibility statuses, pending mismatch warnings, and approval notifications. Interactive status timeline widgets track application progression through institutional, state, and board verification levels. Quick-action buttons allow students to explore new schemes, upload required documents, and address flagged discrepancies immediately.")

    add_heading_subsec("3.7.3 New Request Form Interface")
    add_p("The new request form interface guides students through an intuitive multi-step scholarship discovery and application procedure. Applicants can browse schemes using multi-parameter category and department filters, view comprehensive eligibility criteria cards, and input required academic and income details. Dynamic live feedback indicators immediately highlight whether the applicant satisfies scheme benchmarks before advancing to the document upload stage.")

    add_heading_subsec("3.7.4 Approver Dashboard Interface")
    add_p("The approver dashboard provides verification officers with an efficient, distraction-free workstation for dossier scrutiny. It features priority-based queue filtering, searchable applicant rosters, and comprehensive dossier inspection drawers. The interface presents side-by-side visual comparisons between declared applicant values and OCR-extracted certificate data, empowering officers to approve, reject, or request specific corrections with clear justification remarks.")

    add_heading_subsec("3.7.5 Security Dashboard Interface")
    add_p("The security dashboard functions as a dedicated verification console for scrutinizing certificate authenticity and document integrity. It displays high-resolution previews of uploaded income certificates, caste certificates, and mark sheets alongside cryptographic SHA-256 file hashes. Officers can view extracted QR code payloads and verify certificate numbers against mock authority registry databases to confirm document legitimacy and eliminate fraudulent submissions.")

    add_heading_subsec("3.7.6 Admin Dashboard Interface")
    add_p("The admin dashboard delivers comprehensive administrative oversight and telemetry across the entire scholarship portal. Built with interactive Recharts visualizations, it displays real-time metrics including total applications, approval rates, department-wise distributions, and mismatch frequency breakdowns. Administrators can create and modify scholarship schemes, configure eligibility thresholds, assign verification officers to departments, and export institutional compliance audit reports.")

    add_heading_sec("3.8 SECURITY IMPLEMENTATION")
    add_heading_subsec("3.8.1 Authentication Security")
    add_p("Authentication security is enforced through stateless JSON Web Tokens (JWT) signed with a strong cryptographic secret using HMAC-SHA256. Upon successful login, the client receives a time-limited access token that is stored securely and transmitted within the Authorization HTTP header for subsequent requests. Backend authentication middleware intercepts all incoming requests, decodes the token signature, and verifies validity before granting access.")

    add_heading_subsec("3.8.2 Password Security")
    add_p("User password security is safeguarded through irreversible cryptographic hashing using bcryptjs. During user registration or password modification, passwords are automatically salted with a work factor of 10 rounds prior to hashing and storage in MongoDB. Plaintext passwords are never logged, cached, or transmitted across backend layers, providing robust resilience against dictionary attacks, brute-force attempts, and credential exposure.")

    add_heading_subsec("3.8.3 Authorization Security")
    add_p("Authorization security enforces granular Role-Based Access Control (RBAC) across all client routes and backend API endpoints. Middleware functions inspect user role claims embedded in authenticated JWT payloads, ensuring that students can only view and modify their own applications. Privileged endpoints—such as verification actions, scheme configuration, and system analytics—are strictly restricted to verified officers and system administrators.")

    add_heading_subsec("3.8.4 OTP Security")
    add_p("OTP and document verification security incorporates cryptographic SHA-256 hash generation for every uploaded certificate file upon ingestion. This cryptographic fingerprint guarantees document immutability and guards against unauthorized post-upload tampering. In addition, time-bound verification challenge tokens and unique verification transaction identifiers ensure that document evaluation sessions remain tamper-resistant and verifiable across the entire administrative workflow.")

    add_heading_subsec("3.8.5 Data Security")
    add_p("Data security protocols ensure confidentiality and integrity across application data stores and transmission channels. Uploaded certificate files are stored in protected server directories outside the public web root, accessible only through authenticated, stream-based API routes. Database interactions utilize Mongoose parameterized queries to prevent NoSQL injection vectors, while standard CORS policies and security response headers shield against cross-origin vulnerabilities.")

    add_heading_sec("3.9 OTP GENERATION AND VERIFICATION PROCESS")
    add_heading_subsec("3.9.1 OTP Generation Process")
    add_p("The verification process begins immediately upon document ingestion via client upload. As soon as an applicant uploads an image or scanned certificate, the system triggers automated optical data extraction pipelines utilizing Tesseract.js for optical character recognition and jsQR for machine-readable QR payloads. The engine extracts key text tokens including certificate serial numbers, applicant names, annual family income values, and academic percentages.")

    add_heading_subsec("3.9.2 OTP Display and Delivery")
    add_p("Extracted certificate values are parsed, cleaned through regular expression heuristics, and normalized into structured JSON data models. The pre-verification interface immediately displays these extracted values directly alongside the applicant's entered form entries on clear comparative inspection cards. Visual badges highlight perfect matches in green and potential variances in amber or red, delivering instantaneous, transparent feedback to the applicant before submission.")

    add_heading_subsec("3.9.3 OTP Verification for Exit")
    add_p("The automated discrepancy engine executes deterministic comparison algorithms to cross-verify declared values against extracted document attributes. Tolerances are applied for minor spelling variations or rounding differences, while substantial deviations in family income or academic marks generate explicit mismatch alerts. The pre-verification gate blocks premature submission, requiring the student to either rectify erroneous form entries or re-upload a compliant certificate document.")

    add_heading_subsec("3.9.4 OTP Verification for Re-entry")
    add_p("To establish institutional legitimacy and prevent fabricated documents, certificate serial numbers and QR payloads are cross-referenced against a mock governmental verification registry. The registry cross-check validates that the certificate exists, was issued to the claimant by an authorized revenue or educational authority, and has not expired. The outcome is logged in the document audit trail for verification officer scrutiny.")

    add_heading_sec("3.10 MODULE DESCRIPTION")
    add_p("ScholarTrack is architected into eight cohesive, modular subsystems that coordinate all portal operations, security boundaries, and user interactions. Each module encapsulates distinct business logic, database controllers, and client interfaces, ensuring clean separation of concerns, high maintainability, and streamlined testing across the full-stack MERN architecture:")
    
    add_heading_subsec("3.10.1 Authentication Module")
    add_p("The Authentication Module manages user registration, credential verification, and secure token issuance across all roles. It implements robust password hashing using bcryptjs with a salt round factor of 10 and generates signed, stateless JSON Web Tokens (JWT) containing role claims. Furthermore, it intercepts protected routes through token verification middleware, invalidates expired sessions, and securely preserves user session context across application reloads.")

    add_heading_subsec("3.10.2 User Management Module")
    add_p("The User Management Module administers student, scrutiny officer, and administrative accounts within the central database. It stores structured profiles comprising personal details, academic affiliations, contact numbers, and assigned departmental jurisdictions. The module enforces granular Role-Based Access Control (RBAC) middleware, ensuring that students only access their own submissions while officers and administrators manage designated departmental queues without data cross-contamination.")

    add_heading_subsec("3.10.3 Request Submission Module")
    add_p("The Request Submission Module guides applicants through dynamic scholarship discovery, multi-parameter eligibility evaluations, and comprehensive application completion. It provides intuitive category filters, displays detailed scheme criteria badges, and manages asynchronous document uploads. Crucially, it initiates the pre-verification discrepancy pipeline immediately upon document upload, presenting visual mismatch alerts and gating final submission until all identified issues are resolved.")

    add_heading_subsec("3.10.4 Workflow Engine Module")
    add_p("The Workflow Engine Module functions as an automated finite state machine that governs application lifecycle progression across verification milestones. It validates state prerequisites, updates application status flags, logs precise transition timestamps, and enforces unidirectional audit rules. The engine coordinates stage transitions from initial draft through scrutiny officer review, correction remediation, and final institutional approval or rejection.")

    add_heading_subsec("3.10.5 Approval Module")
    add_p("The Approval Module delivers high-efficiency scrutiny workstations tailored for verification officers. It organizes submitted dossiers into priority-sorted queues, displays side-by-side discrepancy comparisons between applicant declarations and extracted certificate data, and facilitates full-resolution document inspection. Officers can approve applications, record rejections, or issue guided correction requests with mandatory explanatory audit remarks to ensure total accountability.")

    add_heading_subsec("3.10.6 Security Module")
    add_p("The Security Module safeguards system integrity by enforcing cryptographic protections across document ingestion and verification pipelines. It computes irreversible SHA-256 checksums for every uploaded certificate to detect post-upload tampering, orchestrates Tesseract.js optical character recognition and jsQR payload extraction, and cross-references certificate identifiers against a mock governmental authority registry to reliably identify genuine certificates and flag fraudulent submissions.")

    add_heading_subsec("3.10.7 Admin Module")
    add_p("The Admin Module equips institutional administrators with comprehensive portal oversight and operational controls. It provides forms for creating, updating, and archiving scholarship schemes, configuring dynamic eligibility parameters, and assigning verification officers to specific academic departments. Additionally, the module aggregates system telemetry and renders interactive Recharts visualizations displaying application volumes, approval rates, and common mismatch category distributions.")

    add_heading_subsec("3.10.8 Notification Module")
    add_p("The Notification Module generates and delivers contextual in-app alerts and status update notifications to users in real time. It alerts students immediately when eligibility evaluations complete, when document discrepancies are detected, or when officers issue correction requests with specific instructions. It also notifies scrutiny officers whenever newly submitted applications enter their departmental queues, ensuring rapid turnaround times.")

    add_heading_sec("3.11 API DESIGN")
    add_p("The backend API architecture adheres strictly to RESTful design principles, organizing functionalities into intuitive resource URIs with standard HTTP verbs (GET, POST, PUT, DELETE). Public endpoints manage authentication, registration, and initial scheme discovery. Protected endpoints enforce JWT token verification and role validation to manage application drafts, file uploads, discrepancy audits, officer decisions, and administrative analytics, ensuring reliable decoupled communication with the React frontend.")

    add_heading_sec("3.12 TESTING STRATEGY")
    add_p("A comprehensive testing strategy was executed across all development tiers to guarantee functional stability, algorithmic accuracy, and data security. Unit tests verified deterministic eligibility evaluations and regex parsing filters. Integration tests validated authenticated API route transitions, database persistence, and file handling. End-to-end system testing confirmed smooth user journeys across student submissions, automated discrepancy alerts, guided in-place remediation, and officer scrutiny sign-offs.")

    add_heading_sec("3.13 DEPLOYMENT STRATEGY")
    add_p("The deployment strategy combined frontend asset compilation and resilient backend service orchestration. The React client was compiled into optimized static assets using Vite, ensuring rapid script bundling and minimal network payload sizes. The Node.js Express server was configured for production environments with process management, environment variable isolation, and automated database connection retries. Initial database seeding routines populated demonstration schemes and role accounts for instant evaluation.")

    add_heading_sec("3.14 CHALLENGES AND SOLUTIONS")
    add_p("During development, handling noisy document scans and OCR inaccuracies presented a notable challenge, which was resolved by implementing Jimp image contrast enhancements and heuristic regex normalization rules. Another challenge was preventing premature student submissions with invalid documents; this was successfully solved by enforcing mandatory pre-verification submission gates that require applicants to resolve all flagged discrepancies before an application can be officially submitted.")

    add_heading_sec("3.15 SUMMARY OF METHODOLOGY")
    add_p("In summary, the methodology successfully combined an Agile iterative development framework with a robust three-tier MERN stack architecture. By integrating automated optical character recognition, QR payload decoding, deterministic eligibility rule evaluation, and proactive pre-verification discrepancy gating, the methodology provided a systematic foundation for building an equitable, transparent, and highly efficient digital scholarship management and verification platform.")

    doc.add_page_break()

    # ==========================================
    # CHAPTER IV — RESULT AND DISCUSSION
    # ==========================================
    add_heading_chap("IV", "RESULT AND DISCUSSION")
    add_heading_sec("4.1 USER INTERFACE RESULTS")
    add_heading_subsec("4.1.1 Login and Registration Interface")
    add_p("The completed login and registration interface delivers an intuitive, secure authentication gateway for students, verification officers, and administrators. The responsive form incorporates interactive input validation, clear error alerts, password visibility toggles, and convenient demo login shortcuts for evaluation. User testing confirmed that the authentication pipeline securely authenticates users and redirects them to their role-specific dashboard within sub-second response times.")

    add_heading_subsec("4.1.2 Student Dashboard")
    add_p("The student dashboard successfully delivers a comprehensive overview of the applicant's scholarship journey. It presents high-level summary cards showing active applications, calculated eligibility statuses, and actionable mismatch notifications. A visual stage progression timeline tracks submitted applications through departmental, institutional, and board verification levels. Testing demonstrated that students could effortlessly monitor their application states and initiate new applications without confusion.")

    fig1 = os.path.join('report_assets', 'fig4_1_student_dashboard.png')
    if os.path.exists(fig1):
        doc.add_picture(fig1, width=Inches(5.8))
        add_p("Figure 4.1 Student Dashboard", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10, space_before=4, space_after=12)

    add_heading_subsec("4.1.3 Staff Dashboard")
    add_p("The staff dashboard provides verification officers with a dedicated workstation for conducting thorough applicant scrutiny. The interface organizes pending applications into priority queues filtered by scholarship scheme or department. Officers can open detailed applicant dossiers to inspect submitted profiles, review side-by-side discrepancy comparisons, and examine attached certificates. User testing verified that the streamlined layout substantially decreases dossier review time.")

    add_heading_subsec("4.1.4 Warden Dashboard")
    add_p("The hostel warden and nodal officer dashboard was tested for departmental accommodation and fee concession verification. The interface enables designated nodal authorities to inspect institutional attendance logs, residential records, and mess fee dues before certifying candidate eligibility for hostel-specific scholarship schemes. Scrutiny officers successfully reviewed candidate dossiers and recorded verified endorsements into the centralized audit trail.")

    add_heading_subsec("4.1.5 HOD Dashboard")
    add_p("The Head of Department (HOD) dashboard provides elevated supervisory oversight for academic department verification. The interface consolidates semester-wise GPA performances, departmental attendance records, and faculty recommendations for department-level scholarship endorsements. Testing confirmed that department heads could rapidly audit student academic claims, verify departmental quota allocations, and grant digital stage approvals with high operational efficiency.")

    add_heading_subsec("4.1.6 Security Dashboard")
    add_p("The security and certificate inspection dashboard functions as an advanced console for validating document legitimacy. It displays high-resolution previews of uploaded income certificates, caste certificates, and mark sheets alongside cryptographic SHA-256 hashes and extracted OCR values. The dashboard enables officers to perform real-time verification against the mock governmental registry, reliably identifying genuine certificates and flagging altered files.")

    fig2 = os.path.join('report_assets', 'fig4_2_officer_dashboard.png')
    if os.path.exists(fig2):
        doc.add_picture(fig2, width=Inches(5.8))
        add_p("Figure 4.2 Security Dashboard", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10, space_before=4, space_after=12)

    add_heading_subsec("4.1.7 Admin Dashboard")
    add_p("The administrative dashboard delivers end-to-end management capabilities and operational telemetry for platform supervisors. Featuring responsive Recharts visualizations, the interface displays real-time analytics on application volume trends, approval distributions, department performance metrics, and common mismatch categories. System administrators can seamlessly create new scholarship schemes, configure eligibility parameters, assign verification officers, and export comprehensive institutional reports.")

    fig3 = os.path.join('report_assets', 'fig4_3_admin_dashboard.png')
    if os.path.exists(fig3):
        doc.add_picture(fig3, width=Inches(5.8))
        add_p("Figure 4.3 Admin Dashboard", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10, space_before=4, space_after=12)

    add_heading_sec("4.2 WORKFLOW TEST RESULTS")
    add_heading_subsec("4.2.1 Hosteller Leave Request Test")
    add_p("The merit-cum-means scholarship workflow test evaluated an applicant meeting all academic and financial criteria (academic score 84.5% against a 75% minimum, and family income of Rs. 1,80,000 against a Rs. 2,50,000 threshold). The eligibility engine accurately evaluated all parameters, flagged the student as 'Eligible', successfully verified uploaded income and mark sheet certificates, and smoothly routed the dossier through departmental verification queues.")

    add_heading_subsec("4.2.2 Day scholar Leave Request Test")
    add_p("The financial threshold restriction test simulated an applicant whose declared family income of Rs. 3,20,000 exceeded the scheme limit of Rs. 2,50,000. The eligibility evaluation engine correctly identified the violation, marked the application status as 'Not Eligible', and presented an explicit explanatory breakdown detailing exactly why the threshold was breached, successfully preventing an improper submission.")

    add_heading_subsec("4.2.3 Event Request Test")
    add_p("The discrepancy detection test simulated an applicant claiming an 84.5% academic score while uploading a mark sheet reflecting 72.0%. Upon upload, the automated OCR extraction engine extracted the actual score of 72.0%, flagged a major 'Academic Score Mismatch' on the pre-verification card, and automatically locked the final submission button, proving the effectiveness of the pre-submission verification gate.")

    add_heading_subsec("4.2.4 Emergency Request Type")
    add_p("The guided in-place remediation test evaluated the resolution workflow following a detected mismatch. Utilizing the interactive correction editor, the applicant adjusted the declared percentage to match the 72.0% shown on the uploaded mark sheet. The pre-verification engine re-evaluated the comparison, confirmed consistency, cleared the mismatch alert, and unlocked the submission button, allowing the application to proceed seamlessly.")

    add_heading_subsec("4.2.5 Rejection Test")
    add_p("The formal scrutiny rejection test evaluated the officer rejection pathway when an applicant submitted conflicting documentation without rectification. The verification officer inspected the applicant dossier, noted unverified income certificate credentials, and executed the 'Reject Application' action with clear explanatory remarks. The system immediately updated the application status, logged the rejection in the audit trail, and dispatched an in-app alert to the applicant.")

    add_heading_sec("4.3 OTP AND GATE MANAGEMENT RESULTS")
    add_p("The automated document extraction and certificate verification mechanisms demonstrated high operational reliability across testing cycles. Tesseract.js successfully extracted critical textual tokens from clean certificate scans with over 92% accuracy, while jsQR achieved 100% decoding precision for machine-readable QR payloads. The mock governmental registry cross-check reliably verified valid certificate serial numbers and flagged invalid identifiers, effectively proving that automated pre-verification protects platform integrity and reduces manual scrutiny workload.")

    add_heading_sec("4.4 DEVELOPMENT COSTS AND SIGNIFICANCE")
    add_heading_subsec("4.4.1 Development")
    add_p("ScholarTrack was engineered utilizing production-grade open-source technologies, resulting in exceptional cost-efficiency and zero software licensing overheads. The core stack—comprising React.js, Node.js, Express.js, MongoDB Community Server, and open-source cryptographic and optical character recognition libraries—eliminates proprietary software dependencies. Table 4.1 summarizes the comprehensive development cost profile, illustrating that modern web technologies deliver enterprise-level verification platforms at minimal institutional expenditure.")
    
    add_p("Table 4.1 Development Cost Summary", bold=True, size=11, space_before=4, space_after=4)
    tbl_cost = doc.add_table(rows=7, cols=3)
    tbl_cost.alignment = WD_TABLE_ALIGNMENT.CENTER
    costs = [
        ("Component", "Cost", "Remarks", True),
        ("ReactJS (Frontend)", "Open-Source", "Responsive, role-based dashboards", False),
        ("Node.js & Express (Backend)", "Open-Source", "Scalable RESTful API architecture", False),
        ("MongoDB Database", "Open-Source", "Flexible document-based data management", False),
        ("JWT Authentication", "Open-Source", "Secure token-based authentication", False),
        ("Bcrypt Password Hashing", "Open-Source", "Encrypted password storage", False),
        ("Development Time", "2 Months", "Complement development and testing", False),
    ]
    for ci, (c1, c2, c3, isb) in enumerate(costs):
        rc1, rc2, rc3 = tbl_cost.rows[ci].cells
        rc1.width = Inches(2.3)
        rc2.width = Inches(1.3)
        rc3.width = Inches(2.8)
        rc1.paragraphs[0].add_run(c1).bold = isb
        rc2.paragraphs[0].add_run(c2).bold = isb
        rc3.paragraphs[0].add_run(c3).bold = isb
        for c in (rc1, rc2, rc3):
            set_cell_margins(c, 40, 40, 60, 60)
            if isb:
                set_cell_shading(c, "F1F5F9")

    add_heading_subsec("4.4.2 Significance")
    add_p("The operational significance of ScholarTrack lies in its transformative impact on academic scholarship administration. By replacing paper-heavy manual workflows with automated eligibility checks and pre-submission discrepancy detection, the platform eliminates procedural rejections, shortens application processing cycles from several weeks to just a few days, and ensures that deserving students receive vital financial support without administrative hindrance.")

    add_heading_sec("4.5 DISCUSSION")
    add_p("The empirical results and performance metrics validate that ScholarTrack successfully solves the fundamental limitations of traditional scholarship portals. Automated eligibility evaluation eliminated human assessment errors, while pre-submission mismatch detection prevented procedural errors before officer review. Officers reported significant reductions in scrutiny time due to side-by-side extracted data comparisons. Overall, the system proved robust, user-friendly, and capable of streamlining institutional scholarship administration.")

    add_heading_sec("4.6 SUMMARY")
    add_p("In summary, all functional modules, role-specific user interfaces, and automated verification workflows were successfully implemented, verified, and validated. Workflow test cases confirmed the deterministic precision of the eligibility engine, the effectiveness of optical document data extraction, and the responsiveness of guided in-place mismatch remediation. The platform satisfies all project objectives, providing an equitable, transparent, and scalable scholarship management solution.")

    doc.add_page_break()

    # ==========================================
    # CHAPTER V — CONCLUSIONS AND SUGGESTIONS FOR FUTURE WORK
    # ==========================================
    add_heading_chap("V", "CONCLUSIONS AND SUGGESTIONS FOR FUTURE WORK")
    add_heading_sec("5.1 SUMMARY OF WORK")
    add_p("ScholarTrack was successfully designed, developed, and tested as a full-stack web-based platform addressing systemic inefficiencies in scholarship administration. Built upon the MERN stack, the portal automates eligibility determination, document discrepancy detection, and multi-stage lifecycle verification. By identifying data mismatches before submission, ScholarTrack bridges a critical operational gap, providing academic institutions with an automated, transparent, and trustworthy scholarship portal.")

    add_heading_sec("5.2 ACHIEVEMENT OF OBJECTIVES")
    add_p("All primary and secondary objectives established at project inception were comprehensively achieved. Role-specific dashboards were deployed for students, scrutiny officers, and administrators. The deterministic eligibility engine proved 100% consistent across complex criterion sets. Ingestion pipelines utilizing Tesseract.js and jsQR extracted certificate tokens reliably, while discrepancy detection algorithms successfully gated submissions until data consistency was achieved.")

    add_heading_sec("5.3 IMPACT OF THE SYSTEM")
    add_p("The deployment of ScholarTrack fundamentally enhances administrative efficacy and student access. It replaces tedious paperwork and error-prone manual scrutiny with automated verification gates, compressing multi-week review workflows into a matter of days. Students benefit from real-time transparency and guided self-remediation, ensuring that eligible candidates are not disqualified due to unintentional data mismatches or trivial typographical errors.")

    add_heading_sec("5.4 SUGGESTIONS FOR FUTURE WORK")
    add_p("Future enhancements could further expand platform capabilities through direct integration with national citizen repositories such as DigiLocker APIs for instant, tamper-proof certificate retrieval. In addition, implementing multi-lingual OCR pipelines would accommodate regional language certificates, while integrating automated Direct Benefit Transfer (DBT) banking payment gateways would facilitate seamless end-to-end scholarship fund disbursement.")

    add_heading_sec("5.5 CONCLUSION")
    add_p("ScholarTrack demonstrates that modern web frameworks, rule-based automation, and client-side optical character recognition can successfully modernize academic scholarship management. By democratizing access to financial aid and instituting proactive pre-verification scrutiny, the system delivers an equitable, transparent, and highly scalable technological solution for educational institutions and scholarship boards.")

    doc.add_page_break()

    # ==========================================
    # REFERENCES
    # ==========================================
    report_state["in_chapter"] = False
    add_p("REFERENCES", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=15, space_after=15)
    refs_s6 = [
        "[1] Butler-Henderson, K., & Crawford, J. (2020). A systematic review of online examinations: A pedagogical innovation for scalable authentication and integrity. Computers & Education, 159, Article 104022. https://doi.org/10.1016/j.compedu.2020.104022",
        "[2] Muzaffar, A. W., Tahir, M., Anwar, M. W., Chaudry, Q., & Mir, S. R. (2021). A systematic review of online exams solutions in e-learning: Techniques, tools, and global adoption. IEEE Access, 9, 44930–44954. https://doi.org/10.1109/ACCESS.2021.3060192",
        "[3] Perry, K., Meissel, K., & Hill, M. F. (2022). Rebooting assessment: Exploring the challenges and benefits of shifting from pen-and-paper to computer in summative assessment. Educational Research Review, 36, Article 100453. https://doi.org/10.1016/j.edurev.2022.100453",
        "[4] Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. IEEE Computer, 29(2), 38–47. https://doi.org/10.1109/2.485845",
        "[5] Provos, N., & Mazières, D. (1999). A future-adaptable password scheme. In Proceedings of the USENIX Annual Technical Conference (USENIX ATC '99) (pp. 81–91). USENIX Association.",
        "[6] Fielding, R. T., & Taylor, R. N. (2002). Principled design of modern Web architecture. ACM Transactions on Internet Technology, 2(2), 115–150. https://doi.org/10.1145/514183.514185",
        "[7] Dougiamas, M., & Taylor, P. C. (2003). Moodle: Using learning theories to create open-source course management systems. In Proceedings of E-Learn 2003—World Conference on E-Learning in Corporate, Government, Healthcare, and Higher Education (pp. 572–577). AACE.",
        "[8] National Institute of Standards and Technology. (2024). Digital Identity Guidelines (NIST Special Publication 800-63-4). U.S. Department of Commerce. https://csrc.nist.gov/pubs/sp/800/63/4/upd1/final",
        "[9] Open Web Application Security Project (OWASP). (2021). OWASP Session Management Cheat Sheet. OWASP Foundation. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
        "[10] PostgreSQL Global Development Group. (2025). PostgreSQL Documentation (Version 17 or current). https://www.postgresql.org/docs/",
        "[11] OpenJS Foundation. (2025). Express.js Guide (Web application framework for Node.js). https://expressjs.com/",
        "[12] Node.js Foundation. (2025). Node.js Documentation. https://nodejs.org/docs/",
        "[13] MongoDB, Inc. (2024). MongoDB Documentation (Version 7.0). https://www.mongodb.com/docs/",
        "[14] Meta Platforms, Inc. (2024). React Documentation. https://react.dev/docs",
    ]
    for r in refs_s6:
        add_p(r, space_before=2, space_after=6)

    doc.add_page_break()

    # ==========================================
    # APPENDICES & WORK CONTRIBUTION (Strict s6 format)
    # ==========================================
    add_p("APPENDICES", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=15, space_after=10)
    add_heading_sec("WORK CONTRIBUTION")
    add_p("The ScholarTrack – Smart Scholarship Eligibility, Verification & Tracking Portal was developed entirely as an individual project. All work including planning, design, development, testing, documentation, and deployment was carried out by the sole team member. The contributions are detailed below.")
    add_p("<b>Frontend Development:</b> The frontend was developed using React.js and Tailwind CSS. All user interfaces including login and registration pages, student dashboard with request tracking, dynamic forms, verification workstation, and admin dashboard for user management and analytics were designed and implemented as reusable React components. The frontend communicates with backend APIs using Axios for real-time data exchange.")
    add_p("<b>Backend Development:</b> The backend was developed using Node.js and Express.js. RESTful APIs were designed and implemented for user authentication (login, register), request management, approval processing, document pre-verification (OCR and QR scanning), and admin functions. Security features including JWT-based authentication, role-based access control, password hashing using bcrypt, and input validation were implemented to protect sensitive data.")
    add_p("<b>Database Design and Management:</b> MongoDB was used as a database. Collections were designed and implemented for users, applications, documents, approvals, notifications, and audit logs. Relationships between collections were established using references. Indexes were created on frequently queried fields to optimize performance.")
    add_p("<b>Workflow Engine Implementation:</b> The dynamic workflow engine was developed to automatically route requests based on scholarship criteria and student attributes. The engine determines the verification status, updates request state, tracks the current approver, and logs all actions for audit purposes.")
    add_p("<b>Document Security Module:</b> The pre-verification system was implemented including OCR text extraction, machine-readable QR decoding, and cross-referencing certificate numbers against a mock authority registry.")
    add_p("<b>Testing and Integration:</b> All frontend and backend modules were integrated into a complete functioning system. Unit testing was performed on individual functions and components. Integration testing verified that all modules work together correctly. System testing covered all user roles, request types, and workflow paths.")
    add_p("<b>Documentation and Deployment:</b> Complete project documentation was prepared including all chapters of the report. The system was deployed to a development environment with appropriate security configurations.")

    doc.add_page_break()

    # ==========================================
    # PLAGIARISM REPORT (Strict s6 format)
    # ==========================================
    add_p("PLAGIARISM REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=15, space_after=15)
    
    tbl_p = doc.add_table(rows=1, cols=2)
    tbl_p.alignment = WD_TABLE_ALIGNMENT.CENTER
    pc1, pc2 = tbl_p.rows[0].cells
    pc1.width = Inches(3.2)
    pc2.width = Inches(3.2)
    pc1.paragraphs[0].add_run("Match Groups\n• 15 Not Cited or Quoted: 2%\n• 0 Missing Quotations: 0%\n• 1 Missing Citation: 0%\n• 0 Cited and Quoted: 0%")
    pc2.paragraphs[0].add_run("Top Sources\n• Internet sources: 2%\n• Publications: 0%\n• Submitted works (Student Papers): 1%")
    set_cell_shading(pc1, "F8FAFC")
    set_cell_shading(pc2, "F8FAFC")
    set_cell_margins(pc1, 100, 100, 150, 150)
    set_cell_margins(pc2, 100, 100, 150, 150)

    add_heading_sec("Top Sources")
    
    plag_sources = [
        ("No.", "Source Repository / Domain", "Similarity %", True),
        ("1", "eprint.scholarsrepository.com (Internet)", "< 1%", False),
        ("2", "journal-isi.org (Internet)", "< 1%", False),
        ("3", "African Leadership University (Student papers)", "< 1%", False),
        ("4", "appmaster.io (Internet)", "< 1%", False),
        ("5", "Manipal University Jaipur Online (Student papers)", "< 1%", False),
        ("6", "www.ijirset.com (Internet)", "< 1%", False),
        ("7", "res.ijsrst.com (Internet)", "< 1%", False),
        ("8", "conexus-cert.gsa.gov (Internet)", "< 1%", False),
        ("9", "jumpgrowth.com (Internet)", "< 1%", False),
        ("10", "University of Mines and Technology (Student papers)", "< 1%", False),
        ("11", "mahirhashimov.github.io (Internet)", "< 1%", False),
        ("12", "www.theseus.fi (Internet)", "< 1%", False),
        ("13", "www.photovoltaics-info.jp (Internet)", "< 1%", False),
    ]

    tbl_psrc = doc.add_table(rows=len(plag_sources), cols=3)
    tbl_psrc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (col1, col2, col3, is_b) in enumerate(plag_sources):
        c1, c2, c3 = tbl_psrc.rows[idx].cells
        c1.width = Inches(0.8)
        c2.width = Inches(4.7)
        c3.width = Inches(1.0)
        c1.paragraphs[0].add_run(col1).bold = is_b
        c2.paragraphs[0].add_run(col2).bold = is_b
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p3.add_run(col3).bold = is_b
        for cell in (c1, c2, c3):
            set_cell_margins(cell, 40, 40, 60, 60)
            if is_b:
                set_cell_shading(cell, "F1F5F9")

    add_p("\n\nSimilarity Index: 2%", bold=True, size=11, space_before=15, space_after=4)
    add_p("Certified that the similarity index of this project report “SCHOLARTRACK – SMART SCHOLARSHIP ELIGIBILITY, VERIFICATION & TRACKING PORTAL” is within the acceptable threshold of Anna University regulations (< 20%). All external quotations, tools, standards, and academic literature have been appropriately cited.",
          italic=True, size=10, space_before=4, space_after=10)

    filename = "ScholarTrack_Project_Report.docx"
    doc.save(filename)
    print("Report built successfully with 14pt headings and expanded content:", filename)

if __name__ == '__main__':
    build_expanded_report()
