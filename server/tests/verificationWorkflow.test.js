const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');

const { submitApplication } = require('../controllers/applicationController');
const { revalidateDocument } = require('../controllers/documentController');

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

function computeHash(content) {
  return crypto.createHash('sha256').update(Buffer.from(content)).digest('hex');
}

// Mock Express response
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 SCHOLARTRACK SHA-256 CERTIFICATE VERIFICATION TEST SUITE (8 CASES)');
  console.log('========================================================================\n');

  await setup();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    const student = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.test@student.edu',
      passwordHash,
      role: 'student',
    });

    const scholarship = await Scholarship.create({
      name: 'Merit-Cum-Means Technical Education Scholarship',
      provider: 'State Higher Education Council',
      description: 'Financial assistance for meritorious undergraduate engineering students.',
      amount: 50000,
      eligibilityCriteria: {
        minPercentage: 75,
        maxIncome: 250000,
        eligibleCourses: [],
        eligibleCategories: [],
        eligibleGenders: [],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Income Certificate', isRequired: true },
        { documentType: 'Academic Marksheet', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    });

    // Content definitions for testing
    const incomeContentOfficial = 'OFFICIAL_INCOME_CERTIFICATE_TAHSILDAR_2025_BYTES_12345';
    const incomeHashOfficial = computeHash(incomeContentOfficial);

    const marksContentOfficial = 'OFFICIAL_ACADEMIC_MARKSHEET_SEMESTER_6_84.5_PERCENT_BYTES';
    const marksHashOfficial = computeHash(marksContentOfficial);

    const incomeContentDiffering = 'DIFFERENT_INCOME_CERTIFICATE_CONTENT_TAMPERED';
    const incomeHashDiffering = computeHash(incomeContentDiffering);

    const marksContentDiffering = 'DIFFERENT_MARKSHEET_CONTENT_FORGED';
    const marksHashDiffering = computeHash(marksContentDiffering);

    // Initial student profile with both authentic documents
    const profile = await StudentProfile.create({
      userId: student._id,
      studentId: 'STU-990011',
      percentageOrCGPA: 85.0,
      annualFamilyIncome: 180000,
      category: 'General',
      gender: 'Male',
      course: 'B.E. Computer Science',
      institution: 'NIT Trichy',
      profileCompletionStatus: true,
      certificates: [
        {
          documentType: 'Income Certificate',
          storedFileName: 'profile_income_cert.pdf',
          originalFileName: 'income_certificate.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          fileHash: incomeHashOfficial,
          uploadDate: new Date(),
          version: 1,
          verificationStatus: 'Uploaded',
        },
        {
          documentType: 'Academic Marksheet',
          storedFileName: 'profile_marksheet.pdf',
          originalFileName: 'academic_marksheet.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          fileHash: marksHashOfficial,
          uploadDate: new Date(),
          version: 1,
          verificationStatus: 'Uploaded',
        },
      ],
    });

    // Helper: Simulate uploading application document and checking SHA-256 against profile
    async function uploadAppDoc(appId, docType, fileContent, originalFileName) {
      const hash = computeHash(fileContent);
      const isIncome = docType.toLowerCase().includes('income');
      const isMark = docType.toLowerCase().includes('mark');
      const standardName = isIncome ? 'Income Certificate' : isMark ? 'Academic Marksheet' : docType;

      const prof = await StudentProfile.findOne({ userId: student._id });
      const profCert = prof?.certificates?.find((c) =>
        c.documentType === docType ||
        (isIncome && c.documentType.toLowerCase().includes('income')) ||
        (isMark && c.documentType.toLowerCase().includes('mark'))
      );

      let isMatched = false;
      let status = 'MISMATCH';
      let message = '';

      if (!profCert || !profCert.fileHash) {
        status = 'MISMATCH';
        message = `Please upload your ${standardName} in My Profile first.`;
      } else if (profCert.fileHash === hash) {
        isMatched = true;
        status = 'MATCHED';
        message = `${standardName}: MATCHED.`;
      } else {
        status = 'MISMATCH';
        if (isIncome) {
          message = 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.';
        } else if (isMark) {
          message = 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.';
        } else {
          message = `${docType} Mismatch. Please upload the same ${docType} saved in your profile.`;
        }
      }

      let doc = await Document.findOne({ applicationId: appId, documentType: standardName });
      if (doc) {
        doc.fileHash = hash;
        doc.currentStatus = status;
        doc.originalFileName = originalFileName;
        doc.validationResults = { hasMismatch: !isMatched, isMatched, status, message };
        await doc.save();
      } else {
        doc = await Document.create({
          applicationId: appId,
          studentId: student._id,
          documentType: standardName,
          storedFileName: `app_${Date.now()}_${originalFileName}`,
          originalFileName,
          mimeType: 'application/pdf',
          fileSize: fileContent.length,
          fileHash: hash,
          currentStatus: status,
          validationResults: { hasMismatch: !isMatched, isMatched, status, message },
        });
      }

      return { doc, status, isMatched, message, hash };
    }

    // ------------------------------------------------------------------------
    // Test Case 1: Matching Income Certificate and Academic Marksheet -> submission succeeds
    // ------------------------------------------------------------------------
    console.log('Test Case 1: Matching Income Certificate and Academic Marksheet -> submission succeeds');
    const app1 = await Application.create({
      applicationId: 'APP-TEST-001',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    const upInc1 = await uploadAppDoc(app1._id, 'Income Certificate', incomeContentOfficial, 'income_certificate.pdf');
    assert(upInc1.status === 'MATCHED' && upInc1.isMatched === true, 'Case 1: Income Certificate matched profile hash');

    const upMrk1 = await uploadAppDoc(app1._id, 'Academic Marksheet', marksContentOfficial, 'academic_marksheet.pdf');
    assert(upMrk1.status === 'MATCHED' && upMrk1.isMatched === true, 'Case 1: Academic Marksheet matched profile hash');

    const req1 = { params: { id: app1._id }, user: student };
    const res1 = createMockRes();
    await submitApplication(req1, res1);

    assert(res1.statusCode === 200, 'Case 1: Submission returned HTTP 200');
    assert(res1.data.success === true, 'Case 1: Submission returned success: true');
    assert(
      res1.data.message.includes('Certificate Verification Successful. Income Certificate and Academic Marksheet match your profile documents.'),
      'Case 1: Returned exact success message for matching certificates'
    );
    const savedApp1 = await Application.findById(app1._id);
    assert(savedApp1.status === 'submitted', 'Case 1: Application status transitioned to submitted\n');

    // ------------------------------------------------------------------------
    // Test Case 2: Differing Income Certificate -> Income Certificate Mismatch message displayed, submission blocked
    // ------------------------------------------------------------------------
    console.log('Test Case 2: Differing Income Certificate -> Income Certificate Mismatch message displayed, submission blocked');
    const app2 = await Application.create({
      applicationId: 'APP-TEST-002',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    const upInc2 = await uploadAppDoc(app2._id, 'Income Certificate', incomeContentDiffering, 'income_wrong.pdf');
    assert(upInc2.status === 'MISMATCH', 'Case 2: Differing Income Certificate flagged as MISMATCH');
    assert(
      upInc2.message === 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.',
      'Case 2: Exact mismatch message returned for Income Certificate'
    );

    const upMrk2 = await uploadAppDoc(app2._id, 'Academic Marksheet', marksContentOfficial, 'academic_marksheet.pdf');
    assert(upMrk2.status === 'MATCHED', 'Case 2: Marksheet matches profile');

    const req2 = { params: { id: app2._id }, user: student };
    const res2 = createMockRes();
    await submitApplication(req2, res2);

    assert(res2.statusCode === 400, 'Case 2: Submission blocked with HTTP 400');
    assert(
      res2.data.message.includes('Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.'),
      'Case 2: Backend submission returned Income Certificate Mismatch message\n'
    );

    // ------------------------------------------------------------------------
    // Test Case 3: Differing Academic Marksheet -> Academic Marksheet Mismatch message displayed, submission blocked
    // ------------------------------------------------------------------------
    console.log('Test Case 3: Differing Academic Marksheet -> Academic Marksheet Mismatch message displayed, submission blocked');
    const app3 = await Application.create({
      applicationId: 'APP-TEST-003',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    const upInc3 = await uploadAppDoc(app3._id, 'Income Certificate', incomeContentOfficial, 'income_certificate.pdf');
    assert(upInc3.status === 'MATCHED', 'Case 3: Income Certificate matches profile');

    const upMrk3 = await uploadAppDoc(app3._id, 'Academic Marksheet', marksContentDiffering, 'marksheet_altered.pdf');
    assert(upMrk3.status === 'MISMATCH', 'Case 3: Differing Marksheet flagged as MISMATCH');
    assert(
      upMrk3.message === 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.',
      'Case 3: Exact mismatch message returned for Academic Marksheet'
    );

    const req3 = { params: { id: app3._id }, user: student };
    const res3 = createMockRes();
    await submitApplication(req3, res3);

    assert(res3.statusCode === 400, 'Case 3: Submission blocked with HTTP 400');
    assert(
      res3.data.message.includes('Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.'),
      'Case 3: Backend submission returned Academic Marksheet Mismatch message\n'
    );

    // ------------------------------------------------------------------------
    // Test Case 4: Differing files for both -> both mismatch messages displayed, submission blocked
    // ------------------------------------------------------------------------
    console.log('Test Case 4: Differing files for both -> both mismatch messages displayed, submission blocked');
    const app4 = await Application.create({
      applicationId: 'APP-TEST-004',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    await uploadAppDoc(app4._id, 'Income Certificate', incomeContentDiffering, 'income_diff.pdf');
    await uploadAppDoc(app4._id, 'Academic Marksheet', marksContentDiffering, 'marks_diff.pdf');

    const req4 = { params: { id: app4._id }, user: student };
    const res4 = createMockRes();
    await submitApplication(req4, res4);

    assert(res4.statusCode === 400, 'Case 4: Submission blocked with HTTP 400');
    assert(
      res4.data.message.includes('Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.') &&
      res4.data.message.includes('Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.'),
      'Case 4: Both mismatch error messages displayed simultaneously\n'
    );

    // ------------------------------------------------------------------------
    // Test Case 5: Same filename but different file content -> mismatch detected
    // ------------------------------------------------------------------------
    console.log('Test Case 5: Same filename but different file content -> mismatch detected');
    const app5 = await Application.create({
      applicationId: 'APP-TEST-005',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    // Upload with same original filename 'income_certificate.pdf' but modified content
    const upSameNameDiffContent = await uploadAppDoc(
      app5._id,
      'Income Certificate',
      'MODIFIED_FILE_BYTES_DIFFERENT_HASH',
      'income_certificate.pdf'
    );
    assert(upSameNameDiffContent.status === 'MISMATCH', 'Case 5: Mismatch detected despite identical filename');
    assert(
      upSameNameDiffContent.hash !== incomeHashOfficial,
      'Case 5: SHA-256 byte hash differed from profile hash\n'
    );

    // ------------------------------------------------------------------------
    // Test Case 6: Missing profile certificate -> "Please upload in My Profile first" error displayed
    // ------------------------------------------------------------------------
    console.log('Test Case 6: Missing profile certificate -> "Please upload in My Profile first" error displayed');
    const studentNoCerts = await User.create({
      name: 'Priya Verma',
      email: 'priya.test@student.edu',
      passwordHash,
      role: 'student',
    });

    await StudentProfile.create({
      userId: studentNoCerts._id,
      studentId: 'STU-990022',
      percentageOrCGPA: 88.0,
      annualFamilyIncome: 150000,
      profileCompletionStatus: true,
      certificates: [], // Empty certificates in profile!
    });

    const app6 = await Application.create({
      applicationId: 'APP-TEST-006',
      studentId: studentNoCerts._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: studentNoCerts.name, annualFamilyIncome: 150000, percentageOrCGPA: 88.0 },
      status: 'draft',
    });

    const req6 = { params: { id: app6._id }, user: studentNoCerts };
    const res6 = createMockRes();
    await submitApplication(req6, res6);

    assert(res6.statusCode === 400, 'Case 6: Direct submission rejected with HTTP 400');
    assert(
      res6.data.message.includes('Please upload your Income Certificate in My Profile first.') &&
      res6.data.message.includes('Please upload your Academic Marksheet in My Profile first.'),
      'Case 6: Returns "Please upload in My Profile first" messages for missing profile certificates\n'
    );

    // ------------------------------------------------------------------------
    // Test Case 7: Replacing a profile certificate -> new hash immediately used; application matching updates accordingly
    // ------------------------------------------------------------------------
    console.log('Test Case 7: Replacing a profile certificate -> new hash immediately used; application matching updates');
    const updatedIncomeContent = 'REPLACED_UPDATED_NEW_INCOME_CERTIFICATE_CONTENT_2026';
    const updatedIncomeHash = computeHash(updatedIncomeContent);

    // Replace Income Certificate in student's profile
    const studentProfile = await StudentProfile.findOne({ userId: student._id });
    const incCertIdx = studentProfile.certificates.findIndex((c) => c.documentType.includes('Income'));
    studentProfile.certificates[incCertIdx].fileHash = updatedIncomeHash;
    studentProfile.certificates[incCertIdx].storedFileName = 'replaced_income_2026.pdf';
    studentProfile.certificates[incCertIdx].version = 2;
    await studentProfile.save();

    // Application uploading old content now fails
    const app7 = await Application.create({
      applicationId: 'APP-TEST-007',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    const upOld = await uploadAppDoc(app7._id, 'Income Certificate', incomeContentOfficial, 'old_income.pdf');
    assert(upOld.status === 'MISMATCH', 'Case 7: Old certificate content now flagged as MISMATCH against updated profile');

    // Application uploading new updated content now succeeds
    const upNew = await uploadAppDoc(app7._id, 'Income Certificate', updatedIncomeContent, 'new_income.pdf');
    assert(upNew.status === 'MATCHED', 'Case 7: New certificate content successfully MATCHED with updated profile hash\n');

    // ------------------------------------------------------------------------
    // Test Case 8: Direct API submission without matching documents -> rejected by backend
    // ------------------------------------------------------------------------
    console.log('Test Case 8: Direct API submission without matching documents -> rejected by backend');
    const app8 = await Application.create({
      applicationId: 'APP-TEST-008',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: student.name, annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    // No documents uploaded at all!

    const req8 = { params: { id: app8._id }, user: student };
    const res8 = createMockRes();
    await submitApplication(req8, res8);

    assert(res8.statusCode === 400, 'Case 8: Direct API submission blocked with HTTP 400');
    assert(res8.data.success === false, 'Case 8: Direct API submission returned success: false');
    const unsubmittedApp = await Application.findById(app8._id);
    assert(unsubmittedApp.status === 'draft', 'Case 8: Application remained in draft state and could not bypass verification\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await teardown();
  }

  console.log('========================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
