# ScholarTrack – Smart Scholarship Eligibility, Verification & Tracking Portal

ScholarTrack is an end-to-end full-stack scholarship management, automated pre-verification, and multi-stage lifecycle tracking platform.

## Primary Novelty: Automated Information Mismatch Detection & Guided Correction
ScholarTrack addresses one of the most common friction points in scholarship administration: **unexpected rejections due to unnoticed discrepancies between student-entered form claims and uploaded documentary evidence.**
- **OCR & QR Extraction**: Extracts student names, income amounts, academic scores, and certificate identifiers from uploaded documents (mark sheets, income certificates, etc.).
- **Automatic Discrepancy Auditing**: Compares extracted values with application inputs, reporting explicit reasons (e.g., entered income vs extracted certificate income).
- **Synthetic Authority Cross-Verification**: Validates certificate numbers against a mock authority registry.
- **Guided In-Place Correction**: Allows students to adjust mis-typed form fields or upload replacement certificates without restarting their entire application from scratch.

---

## Technology Stack
- **Frontend**: React 19, Vite 5, Tailwind CSS, React Router DOM 7, Axios, Lucide React, Recharts.
- **Backend**: Node.js, Express.js, RESTful architecture, JWT authentication, bcrypt password hashing, Multer file upload validation, Morgan logging, Express rate limiting.
- **Data & Verification**: MongoDB with Mongoose ODM (includes seamless automatic embedded in-memory database fallback for quick local testing), jsQR for QR decoding, Jimp for image processing, Tesseract.js for OCR extraction.

---

## User Roles & Credentials (Development Demo)
All demo accounts use the default password: `Password@123`

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **System Admin** | `admin@scholartrack.edu` | Manage schemes, review audit logs, assign officers, and view Recharts telemetry |
| **Verification Officer** | `ramesh.officer@scholartrack.edu` | Review applicant dossiers, inspect OCR extractions, approve or request corrections |
| **Verification Officer** | `sunita.officer@scholartrack.edu` | Secondary verification officer account |
| **Student (With Mismatch)** | `aarav.sharma@student.edu` | Demo account with an active mismatch on mark sheet (84.5% vs 72%) |
| **Student** | `priya.patel@student.edu` | Meritorious applicant demo profile |
| **Student** | `rahul.verma@student.edu` | Standard applicant demo profile |

---

## Quick Start & Setup Instructions

### 1. Install Backend Dependencies & Start Server
```bash
cd server
npm install
npm start
```
*The server runs on `http://localhost:5050`. If no local MongoDB service is running, it will automatically launch an embedded in-memory MongoDB instance and seed initial sample scholarships and test accounts.*

### 2. Install Frontend Dependencies & Start Client
```bash
cd client
npm install
npm run dev
```
*The Vite frontend will start on `http://localhost:3000` with automated API proxying to `http://localhost:5050`.*

---

## Testing Key Workflows
1. **Student Login & Mismatch Review**:
   - Log in with `aarav.sharma@student.edu` / `Password@123`.
   - Go to **My Applications** -> Open `APP-2026-8801`.
   - Notice the yellow alert: *Academic Marks / Percentage Discrepancy* (Entered 84.5% vs Extracted 72%).
   - Click **Edit Application Values** to adjust, or click **Replace Document** to re-upload.
2. **Rule-Based Eligibility Evaluation**:
   - Navigate to **Find Scholarships** -> Click on any scheme to view real-time eligibility rule evaluations.
3. **Officer Review & Final Decision**:
   - Log in with `ramesh.officer@scholartrack.edu` / `Password@123`.
   - Access **Officer Dashboard** -> Click **Review & Verify** on an applicant dossier.
   - Inspect individual documents, click **Mark Verified** or **Request Correction** with an audit reason.
4. **Admin Oversight & Recharts Analytics**:
   - Log in with `admin@scholartrack.edu` / `Password@123`.
   - Open **Overview Dashboard** to inspect status distribution and mismatch categories with interactive Recharts.
   - Inspect immutable events in **Audit Logs**.
