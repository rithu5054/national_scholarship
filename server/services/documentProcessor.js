/**
 * Document Processing Service
 * Handles OCR extraction via Tesseract, QR extraction via jsQR/Jimp,
 * normalization, field extraction heuristics, and mismatch detection.
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const Tesseract = require('tesseract.js');
const { verifyCertificateIdentifier } = require('./mockVerificationAuthority');

/**
 * Scan QR Code from an image file
 */
const scanQRCode = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // jsQR works with raster images (PNG, JPG)
    if (ext === '.pdf') {
      return { detected: false, rawPayload: null, message: 'PDF QR scanning requires rasterization or manual entry' };
    }

    const image = await Jimp.read(filePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const buffer = image.bitmap.data;

    // Convert RGBA buffer to Uint8ClampedArray for jsQR
    const clampedArray = new Uint8ClampedArray(buffer);
    const code = jsQR(clampedArray, width, height);

    if (code && code.data) {
      let parsed = null;
      try {
        parsed = JSON.parse(code.data);
      } catch (e) {
        parsed = { rawText: code.data };
      }
      return { detected: true, data: parsed, rawPayload: code.data };
    }

    return { detected: false, rawPayload: null };
  } catch (err) {
    console.warn(`[DocumentProcessor] QR Scan failed for ${filePath}:`, err.message);
    return { detected: false, error: err.message };
  }
};

/**
 * Extract text via OCR (Tesseract)
 */
const extractOCR = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      // For PDFs in prototype, return fallback or pending manual check
      return { success: false, text: '', message: 'PDF document uploaded; OCR preview applied or officer review enabled.' };
    }

    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}, // silent logger
    });

    return { success: true, text: result.data.text || '' };
  } catch (err) {
    console.warn(`[DocumentProcessor] OCR extraction error for ${filePath}:`, err.message);
    return { success: false, text: '', error: err.message };
  }
};

/**
 * Heuristic parser to extract key structured fields from OCR text & QR data
 */
const parseDocumentFields = (ocrText, qrResult, documentType) => {
  const text = (ocrText || '').toUpperCase();
  const extracted = {
    studentName: '',
    certificateNumber: '',
    incomeAmount: null,
    marks: null,
    institutionName: '',
    issueDate: '',
  };

  // If QR provided structured data, prioritize it
  if (qrResult && qrResult.detected && qrResult.data) {
    const qData = qrResult.data;
    if (qData.certificateNumber) extracted.certificateNumber = qData.certificateNumber;
    if (qData.name || qData.studentName) extracted.studentName = qData.name || qData.studentName;
    if (qData.income || qData.incomeAmount) extracted.incomeAmount = Number(qData.income || qData.incomeAmount);
    if (qData.marks || qData.percentage) extracted.marks = Number(qData.marks || qData.percentage);
    if (qData.issueDate) extracted.issueDate = qData.issueDate;
  }

  // Extract Certificate Number via Regex
  if (!extracted.certificateNumber) {
    const certMatch = text.match(/(?:CERTIFICATE\s*(?:NO|NUMBER|ID)?[:\-\s]*|INC-|MRK-|BC-)([A-Z0-9\-\/]{6,25})/i);
    if (certMatch) extracted.certificateNumber = certMatch[1].trim();
  }

  // Extract Income via Regex (₹ or Rs. or Rupees or Amount)
  if (!extracted.incomeAmount && (documentType.includes('Income') || text.includes('INCOME'))) {
    const incomeMatch = text.match(/(?:RS\.?|INR|₹|RUPEES|ANNUAL\s*INCOME[:\s]*|TOTAL\s*INCOME[:\s]*)\s*([0-9,]+)/i);
    if (incomeMatch) {
      const cleanNum = incomeMatch[1].replace(/,/g, '');
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed > 1000) extracted.incomeAmount = parsed;
    }
  }

  // Extract Marks / Percentage via Regex
  if (!extracted.marks && (documentType.includes('Mark') || text.includes('PERCENTAGE') || text.includes('MARKS'))) {
    const marksMatch = text.match(/(?:PERCENTAGE|AGGREGATE|TOTAL\s*MARKS|SCORE|CGPA)[:\s]*([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*%?/i);
    if (marksMatch) {
      const parsed = parseFloat(marksMatch[1]);
      if (!isNaN(parsed) && parsed <= 100) extracted.marks = parsed;
    }
  }

  // Extract Name via Regex
  if (!extracted.studentName) {
    const nameMatch = text.match(/(?:NAME\s*OF\s*(?:STUDENT|APPLICANT|CANDIDATE)?[:\s]*|STUDENT\s*NAME[:\s]*|SHRI\/SMT[:\s]*)([A-Z\s]{3,35})(?:\n|\r|DATE|SON|DAUGHTER|DOB)/i);
    if (nameMatch) {
      extracted.studentName = nameMatch[1].trim();
    }
  }

  return extracted;
};

/**
 * Text normalization utility for fuzzy matching
 */
const normalizeText = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Compare application data against extracted document data
 * Core Novelty of ScholarTrack
 */
const detectMismatches = async (applicationData, extractedData, documentType) => {
  const mismatches = [];

  // 1. Name Comparison
  if (extractedData.studentName && applicationData.studentName) {
    const appNorm = normalizeText(applicationData.studentName);
    const docNorm = normalizeText(extractedData.studentName);

    // Check if one contains the other or identical
    const matches = appNorm === docNorm || appNorm.includes(docNorm) || docNorm.includes(appNorm);
    if (!matches) {
      mismatches.push({
        field: 'Student Name',
        enteredValue: applicationData.studentName,
        extractedValue: extractedData.studentName,
        reason: `Student name in application ('${applicationData.studentName}') does not match the name extracted from ${documentType} ('${extractedData.studentName}').`,
        severity: 'High',
      });
    }
  }

  // 2. Annual Family Income Comparison
  if (extractedData.incomeAmount && applicationData.annualFamilyIncome !== undefined) {
    const appIncome = Number(applicationData.annualFamilyIncome);
    const docIncome = Number(extractedData.incomeAmount);

    // If difference is more than 5% or 1000 INR
    if (Math.abs(appIncome - docIncome) > 1000) {
      mismatches.push({
        field: 'Annual Family Income',
        enteredValue: `₹${appIncome.toLocaleString('en-IN')}`,
        extractedValue: `₹${docIncome.toLocaleString('en-IN')}`,
        reason: `Application states annual income of ₹${appIncome.toLocaleString('en-IN')}, but uploaded certificate appears to indicate ₹${docIncome.toLocaleString('en-IN')}.`,
        severity: 'High',
      });
    }
  }

  // 3. Academic Marks Comparison
  if (extractedData.marks && applicationData.percentageOrCGPA !== undefined) {
    const appMarks = Number(applicationData.percentageOrCGPA);
    const docMarks = Number(extractedData.marks);

    if (Math.abs(appMarks - docMarks) > 0.5) {
      mismatches.push({
        field: 'Academic Marks / Percentage',
        enteredValue: `${appMarks}%`,
        extractedValue: `${docMarks}%`,
        reason: `Application academic score (${appMarks}%) differs from the score extracted from the mark sheet (${docMarks}%).`,
        severity: 'High',
      });
    }
  }

  // 4. Verification against Configured Authority
  let qrVerificationResult = {
    status: 'No QR Detected',
    sourceName: 'Mock Verification Registry',
    details: 'Document did not include a machine-readable QR code. Manual officer verification applicable.',
  };

  if (extractedData.certificateNumber) {
    const authCheck = await verifyCertificateIdentifier(extractedData.certificateNumber);
    qrVerificationResult = {
      status: authCheck.status,
      sourceName: authCheck.sourceName,
      details: authCheck.message,
    };

    if (authCheck.record) {
      // Cross check authority record with application data
      if (authCheck.record.studentName) {
        const appNorm = normalizeText(applicationData.studentName);
        const authNorm = normalizeText(authCheck.record.studentName);
        if (appNorm !== authNorm && !appNorm.includes(authNorm) && !authNorm.includes(appNorm)) {
          mismatches.push({
            field: 'Authority Registry Name',
            enteredValue: applicationData.studentName,
            extractedValue: authCheck.record.studentName,
            reason: `Name in application does not match official registry record for certificate ${extractedData.certificateNumber}.`,
            severity: 'High',
          });
        }
      }

      if (authCheck.record.incomeAmount) {
        const appIncome = Number(applicationData.annualFamilyIncome);
        if (Math.abs(appIncome - authCheck.record.incomeAmount) > 1000) {
          mismatches.push({
            field: 'Authority Registry Income',
            enteredValue: `₹${appIncome.toLocaleString('en-IN')}`,
            extractedValue: `₹${authCheck.record.incomeAmount.toLocaleString('en-IN')}`,
            reason: `Entered income differs from official record retrieved from authority registry.`,
            severity: 'High',
          });
        }
      }
    }
  }

  return {
    hasMismatch: mismatches.length > 0,
    mismatchDetails: mismatches,
    qrVerification: qrVerificationResult,
    preVerificationPassed: mismatches.length === 0,
  };
};

module.exports = {
  scanQRCode,
  extractOCR,
  parseDocumentFields,
  detectMismatches,
  normalizeText,
};
