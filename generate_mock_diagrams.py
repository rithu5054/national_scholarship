from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('report_assets', exist_ok=True)

def create_dashboard_mockup(filename, title, subtitle, cards, rows):
    width, height = 1100, 680
    img = Image.new('RGB', (width, height), color='#0f172a')
    draw = ImageDraw.Draw(img)
    
    # Top bar
    draw.rectangle([0, 0, width, 60], fill='#1e293b')
    draw.text((30, 20), "ScholarTrack - " + title, fill='#38bdf8')
    draw.text((850, 20), "Role: Academic Portal", fill='#94a3b8')
    
    # Sidebar
    draw.rectangle([0, 60, 220, height], fill='#1e293b')
    menu_items = ["Dashboard", "My Profile", "Find Scholarships", "Eligibility Checker", "My Documents", "Audit Logs", "Logout"]
    for i, item in enumerate(menu_items):
        y = 90 + i * 45
        draw.rectangle([15, y, 205, y+35], fill='#334155' if i==0 else '#1e293b')
        draw.text((30, y+10), item, fill='#ffffff' if i==0 else '#94a3b8')
        
    # Main content header
    draw.text((250, 80), title, fill='#ffffff')
    draw.text((250, 110), subtitle, fill='#94a3b8')
    
    # Metric cards
    for idx, (label, val, col) in enumerate(cards):
        cx = 250 + idx * 205
        draw.rectangle([cx, 140, cx+190, 220], fill='#1e293b', outline=col, width=1)
        draw.text((cx+15, 155), label, fill='#94a3b8')
        draw.text((cx+15, 180), str(val), fill=col)
        
    # Table / Content area
    draw.rectangle([250, 245, 1070, 640], fill='#1e293b', outline='#334155')
    draw.rectangle([250, 245, 1070, 285], fill='#334155')
    draw.text((270, 258), "SCHOLARSHIP / APPLICANT DOSSIER", fill='#cbd5e1')
    draw.text((600, 258), "PRE-VERIFICATION STATUS", fill='#cbd5e1')
    draw.text((850, 258), "ACTION / VERDICT", fill='#cbd5e1')
    
    for r_idx, (col1, col2, col3, badge_col) in enumerate(rows):
        ry = 295 + r_idx * 55
        draw.line([250, ry+45, 1070, ry+45], fill='#334155', width=1)
        draw.text((270, ry+12), col1, fill='#ffffff')
        
        # Badge
        draw.rectangle([595, ry+8, 790, ry+34], fill=badge_col)
        draw.text((605, ry+13), col2, fill='#ffffff')
        
        draw.text((850, ry+12), col3, fill='#38bdf8')
        
    img.save(os.path.join('report_assets', filename))
    print("Saved", filename)

# Fig 4.1 Student Dashboard
create_dashboard_mockup(
    'fig4_1_student_dashboard.png',
    'Student Portal & Pre-Verification Console',
    'Aarav Sharma (STU-2026-001) | B.E. Computer Science & Engineering',
    [('Total Applied', '3', '#38bdf8'), ('Under Review', '1', '#818cf8'), ('Mismatches', '1', '#fbbf24'), ('Approved', '1', '#34d399')],
    [
        ('Merit-Cum-Means Technical Education Scheme', 'Mismatch Detected (Marks)', 'Resolve Discrepancy', '#b45309'),
        ('Foundation STEM Advancement Grant', 'Pre-Verification Passed', 'Under Officer Review', '#2563eb'),
        ('National Collegiate Fellowship Scheme', 'Officer Verified', 'Approved - ₹50,000', '#059669'),
        ('Rural Merit Assistance Scheme', 'Draft Application', 'Upload Documents', '#475569')
    ]
)

# Fig 4.2 Verification Console (Officer Dashboard / Mismatch Audit)
create_dashboard_mockup(
    'fig4_2_officer_dashboard.png',
    'Officer Verification Workstation',
    'Dr. Ramesh Kumar | Document Cross-Check & Registry Audit',
    [('Assigned Apps', '12', '#38bdf8'), ('Pending Audit', '4', '#818cf8'), ('Correction Requests', '2', '#fbbf24'), ('Decisions', '6', '#34d399')],
    [
        ('Aarav Sharma - Marks Sheet 2025', 'Academic Mismatch (84.5% vs 72%)', 'Correction Requested', '#b45309'),
        ('Priya Patel - Income Certificate', 'Authority Verified (INC-2025-452109)', 'Mark Verified', '#059669'),
        ('Rahul Verma - Community Cert', 'OCR Extraction Validated', 'Under Final Review', '#2563eb'),
        ('Ananya Sen - College Bonafide', 'Pre-Verification Passed', 'Approved for Grant', '#059669')
    ]
)

# Fig 4.3 Admin Dashboard (Telemetry & Analytics)
create_dashboard_mockup(
    'fig4_3_admin_dashboard.png',
    'System Operations Console & Telemetry',
    'System Administrator | Schemes, Mismatch Analytics & Audit Trail',
    [('Total Students', '420', '#38bdf8'), ('Total Officers', '14', '#818cf8'), ('Active Schemes', '8', '#34d399'), ('Mismatches Flagged', '28', '#fbbf24')],
    [
        ('Merit-Cum-Means Technical Scheme', 'Active (Deadline: 15/05/2026)', 'View Telemetry', '#059669'),
        ('Women STEM Advancement Fellowship', 'Active (Deadline: 30/05/2026)', 'View Telemetry', '#059669'),
        ('State Upliftment Educational Grant', 'Active (Deadline: 10/06/2026)', 'View Telemetry', '#059669'),
        ('National Research Promotion Fellowship', 'Active (Deadline: 20/06/2026)', 'View Telemetry', '#059669')
    ]
)
