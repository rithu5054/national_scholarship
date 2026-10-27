/**
 * Mock Certificate Verification Service
 * Simulates a trusted authority registry (e.g. Revenue Department / State Board).
 * Clearly marked as synthetic development mock data.
 */

const mockCertificateDatabase = {
  // Valid certificates
  'INC-2025-984321': {
    certificateNumber: 'INC-2025-984321',
    studentName: 'Aarav Sharma',
    incomeAmount: 180000,
    issueDate: '2025-04-12',
    issuer: 'Department of Revenue & Land Records, State Authority',
    status: 'Valid',
  },
  'INC-2025-452109': {
    certificateNumber: 'INC-2025-452109',
    studentName: 'Priya Patel',
    incomeAmount: 120000,
    issueDate: '2025-05-18',
    issuer: 'Tahsildar Office, District E-Governance Center',
    status: 'Valid',
  },
  'MRK-2025-778899': {
    certificateNumber: 'MRK-2025-778899',
    studentName: 'Aarav Sharma',
    marks: 88.5,
    institutionName: 'National Institute of Engineering & Technology',
    issueDate: '2025-06-20',
    issuer: 'State Higher Secondary / University Examination Board',
    status: 'Valid',
  },
  // Document with intentional mismatch for testing mismatch detection
  'INC-MISMATCH-999': {
    certificateNumber: 'INC-MISMATCH-999',
    studentName: 'Different Name',
    incomeAmount: 450000, // much higher than typical entered income
    issueDate: '2024-01-10',
    issuer: 'Regional Revenue Office',
    status: 'Valid',
  },
};

const verifyCertificateIdentifier = async (certificateNumber) => {
  if (!certificateNumber) {
    return {
      status: 'Unable to Verify',
      message: 'No certificate identifier provided for verification.',
      record: null,
    };
  }

  const cleanId = String(certificateNumber).trim().toUpperCase();
  const record = mockCertificateDatabase[cleanId];

  if (record) {
    return {
      status: 'Verified Against Configured Source',
      sourceName: 'Mock E-District Verification Authority [Synthetic Prototype]',
      message: 'Certificate record found and verified in configured registry.',
      record,
    };
  }

  return {
    status: 'Certificate Not Found',
    sourceName: 'Mock E-District Verification Authority [Synthetic Prototype]',
    message: `Certificate ID '${certificateNumber}' does not exist in the configured registry. Officer manual verification required.`,
    record: null,
  };
};

module.exports = { verifyCertificateIdentifier, mockCertificateDatabase };
