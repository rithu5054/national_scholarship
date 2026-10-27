from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('report_assets', exist_ok=True)

def create_flowchart(filename):
    width, height = 750, 1150
    img = Image.new('RGB', (width, height), color='#0a1128') # dark theme matching the reference
    draw = ImageDraw.Draw(img)
    
    # Box definitions (x1, y1, x2, y2)
    # Color palette matching reference
    box_blue = '#1c3d72'
    border_blue = '#2563eb'
    text_color = '#ffffff'
    
    def draw_box(x1, y1, x2, y2, text, shape="rect"):
        if shape == "oval":
            draw.ellipse([x1, y1, x2, y2], fill='#1e3a8a', outline='#3b82f6', width=2)
        elif shape == "diamond":
            mx = (x1 + x2) / 2
            my = (y1 + y2) / 2
            draw.polygon([(mx, y1), (x2, my), (mx, y2), (x1, my)], fill='#1e3a8a', outline='#3b82f6', width=2)
        else:
            # Rounded rectangle
            draw.rounded_rectangle([x1, y1, x2, y2], radius=10, fill=box_blue, outline=border_blue, width=2)
            
        # Draw multiline centered text
        lines = text.split('\n')
        total_h = len(lines) * 16
        start_y = (y1 + y2) / 2 - total_h / 2
        for i, line in enumerate(lines):
            draw.text(((x1 + x2) / 2 - len(line)*3.6, start_y + i * 16), line, fill=text_color)

    def draw_arrow(x1, y1, x2, y2, label=""):
        draw.line([x1, y1, x2, y2], fill='#94a3b8', width=2)
        # Arrowhead
        if y2 > y1: # Downwards
            draw.polygon([(x2-5, y2-8), (x2+5, y2-8), (x2, y2)], fill='#94a3b8')
        elif y2 < y1: # Upwards
            draw.polygon([(x2-5, y2+8), (x2+5, y2+8), (x2, y2)], fill='#94a3b8')
        elif x2 > x1: # Right
            draw.polygon([(x2-8, y2-5), (x2-8, y2+5), (x2, y2)], fill='#94a3b8')
        elif x2 < x1: # Left
            draw.polygon([(x2+8, y2-5), (x2+8, y2+5), (x2, y2)], fill='#94a3b8')
            
        if label:
            draw.text(((x1+x2)/2 + 6, (y1+y2)/2 - 8), label, fill='#38bdf8')

    # Flowchart Nodes matching the exact structure
    # Start
    draw_box(100, 250, 160, 290, "Start", shape="oval")
    draw_arrow(160, 270, 210, 270)
    
    # Load Application & Documents
    draw_box(210, 240, 420, 300, "Load Student Application\n& Uploaded Documents")
    draw_arrow(315, 300, 315, 340)
    
    # Validate Document Types & Format
    draw_box(200, 340, 430, 400, "Validate Document Format,\nMIME Type & Size")
    draw_arrow(315, 400, 315, 430)
    
    # Decision: Valid?
    draw_box(560, 90, 710, 150, "Data Valid?", shape="diamond")
    
    # Connect from validation to Decision (upwards and right)
    draw.line([315, 430, 140, 430], fill='#94a3b8', width=2)
    draw.line([140, 430, 140, 120], fill='#94a3b8', width=2)
    draw_arrow(140, 120, 560, 120)
    
    # Decision No branch
    draw_arrow(600, 140, 450, 200, "No") # left down to Flag
    draw_box(260, 180, 470, 230, "Flag or Reject Invalid Records")
    draw_arrow(315, 230, 315, 240)
    
    # Decision Yes branch
    draw_arrow(660, 145, 660, 210, "Yes")
    draw_box(540, 210, 730, 260, "Store Cleaned Document Files\n& Generate SHA-256 Hashes")
    draw_arrow(635, 260, 635, 290)
    
    # Process OCR & QR
    draw_box(540, 290, 730, 345, "Process Optical Extraction\n(Tesseract OCR & jsQR)")
    draw_arrow(635, 345, 635, 375)
    
    # Normalize Extracted Fields
    draw_box(520, 375, 750, 430, "Normalize & Extract Fields\n(Income, Marks, Name, Cert ID)")
    draw_arrow(635, 430, 635, 460)
    
    # Cross check Registry
    draw_box(520, 460, 750, 515, "Cross-Reference Certificate ID\nAgainst Mock Authority Registry")
    draw_arrow(635, 515, 635, 545)
    
    # Detect Mismatches
    draw_box(520, 545, 750, 600, "Execute Discrepancy Engine\n(Identify Field Mismatches)")
    draw_arrow(635, 600, 635, 630)
    
    # Generate Alerts & Indicators
    draw_box(520, 630, 750, 685, "Generate Mismatch Alerts,\nAudit Logs & Status Badges")
    draw_arrow(635, 685, 635, 715)
    
    # Display Interactive Dashboard
    draw_box(510, 715, 760, 770, "Display Pre-Verification & Tracking\nInteractive Dashboard")
    draw_arrow(635, 770, 635, 800)
    
    # Officer Review & Decision
    draw_box(540, 800, 730, 855, "Officer Scrutiny &\nDecision / Correction Request")
    draw_arrow(635, 855, 635, 885)
    
    # End
    draw_box(600, 885, 670, 925, "End", shape="oval")
    
    img.save(os.path.join('report_assets', filename))
    print("Saved", filename)

create_flowchart('fig3_3_flow_diagram.png')
