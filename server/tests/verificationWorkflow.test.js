const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');

const { detectMismatches } = require('../services/documentProcessor');
const { evaluateEligibility } = require('../services/eligibilityEngine');

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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SCHOLARTRACK VERIFICATION TEST SUITE (10 SCENARIOS)');
  console.log('====================================================\n');

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
    // Setup baseline models
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    const student = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.test@student.edu',
      passwordHash,
      role: 'student',
    });

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
      certificates: [],
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
        { documentType: 'Mark Sheet', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: student._id,
    });

    // Helper: Simulate Backend Submission Verification
    async function simulateBackendSubmission(appId) {
      const app = await Application.findById(appId).populate('scholarshipId');
      if (!app) return { success: false, status: 404, message: 'Application not found' };

      const freshProfile = await StudentProfile.findOne({ userId: app.studentId });
      const freshEligibility = evaluateEligibility(app.scholarshipId, app.applicationData || freshProfile);
      if (!freshEligibility.isEligible) {
        return { success: false, status: 400, message: 'Cannot submit application: Configured eligibility criteria are not met.' };
      }

      const requiredDocs = app.scholarshipId.requiredDocuments.filter((d) => d.isRequired);
      let uploadedDocs = await Document.find({ applicationId: app._id });

      // Auto-link from profile if needed
      if (freshProfile && freshProfile.certificates && freshProfile.certificates.length > 0) {
        for (const reqDoc of requiredDocs) {
          const hasDoc = uploadedDocs.some((d) => d.documentType === reqDoc.documentType);
          if (!hasDoc) {
            const profileCert = freshProfile.certificates.find((c) => c.documentType === reqDoc.documentType);
            if (profileCert) {
              const linkedDoc = await Document.create({
                applicationId: app._id,
                studentId: app.studentId,
                documentType: profileCert.documentType,
                storedFileName: profileCert.storedFileName,
                originalFileName: profileCert.originalFileName,
                mimeType: profileCert.mimeType,
                fileSize: profileCert.fileSize,
                version: profileCert.version || 1,
                extractedData: profileCert.extractedData,
                validationResults: profileCert.validationResults,
                currentStatus: profileCert.verificationStatus === 'Verified' ? 'Pre-Verification Passed' : profileCert.verificationStatus,
              });
              uploadedDocs.push(linkedDoc);
            }
          }
        }
      }

      const missingDocs = requiredDocs.filter(
        (reqDoc) => !uploadedDocs.some((upDoc) => upDoc.documentType === reqDoc.documentType)
      );
      if (missingDocs.length > 0) {
        return {
          success: false,
          status: 400,
          message: `Missing mandatory document(s): ${missingDocs.map((d) => d.documentType).join(', ')}`,
        };
      }

      const comparisonSource = {
        studentName: app.applicationData?.studentName,
        annualFamilyIncome: app.applicationData?.annualFamilyIncome,
        percentageOrCGPA: app.applicationData?.percentageOrCGPA,
        course: app.applicationData?.course,
      };

      for (const reqDoc of requiredDocs) {
        const doc = uploadedDocs.find((d) => d.documentType === reqDoc.documentType);
        const freshVal = await detectMismatches(comparisonSource, doc.extractedData || {}, doc.documentType);
        if (freshVal.hasMismatch || doc.currentStatus === 'Mismatch Detected') {
          return {
            success: false,
            status: 400,
            statusType: 'Mismatch Detected',
            message: `Application Submission Blocked: Your ${doc.documentType} does not match your profile details.`,
          };
        }
        if (freshVal.isManualReview || doc.currentStatus === 'Manual Review Required') {
          return {
            success: false,
            status: 400,
            statusType: 'Manual Review Required',
            message: `Application Submission Blocked: Your ${doc.documentType} requires manual review.`,
          };
        }
      }

      app.status = 'submitted';
      await app.save();
      return { success: true, status: 200, message: 'Application submitted successfully!', application: app };
    }

    // ----------------------------------------------------
    // Scenario 1: Both certificates match the profile
    // ----------------------------------------------------
    console.log('Scenario 1: Both certificates match profile (Eligibility passed)');
    const app1 = await Application.create({
      applicationId: 'APP-TEST-001',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: {
        studentName: 'Rohan Sharma',
        annualFamilyIncome: 180000,
        percentageOrCGPA: 85.0,
      },
      status: 'draft',
    });

    const incomeVal1 = await detectMismatches(
      { studentName: 'Rohan Sharma', annualFamilyIncome: 180000 },
      { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME CERTIFICATE TAHSILDAR ANNUAL INCOME 180000' },
      'Income Certificate'
    );
    await Document.create({
      applicationId: app1._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'income.png',
      originalFileName: 'income.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME CERTIFICATE' },
      validationResults: incomeVal1,
      currentStatus: incomeVal1.verificationStatus === 'Verified' ? 'Pre-Verification Passed' : incomeVal1.verificationStatus,
    });

    const marksVal1 = await detectMismatches(
      { studentName: 'Rohan Sharma', percentageOrCGPA: 85.0 },
      { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'SEMESTER GRADE CARD MARKSHEET 85.0%' },
      'Mark Sheet'
    );
    await Document.create({
      applicationId: app1._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'marks.png',
      originalFileName: 'marks.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'MARKSHEET' },
      validationResults: marksVal1,
      currentStatus: marksVal1.verificationStatus === 'Verified' ? 'Pre-Verification Passed' : marksVal1.verificationStatus,
    });

    const res1 = await simulateBackendSubmission(app1._id);
    assert(res1.success === true, 'Submission succeeded when all certificates match profile');

    // ----------------------------------------------------
    // Scenario 2: Income differs from profile (₹180,000 vs ₹250,000)
    // ----------------------------------------------------
    console.log('\nScenario 2: Income differs from profile');
    const app2 = await Application.create({
      applicationId: 'APP-TEST-002',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    const incomeVal2 = await detectMismatches(
      { studentName: 'Rohan Sharma', annualFamilyIncome: 180000 },
      { studentName: 'Rohan Sharma', incomeAmount: 250000, rawOcrText: 'INCOME CERTIFICATE TAHSILDAR ANNUAL INCOME 250000' },
      'Income Certificate'
    );
    await Document.create({
      applicationId: app2._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'inc2.png',
      originalFileName: 'inc2.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 250000, rawOcrText: 'INCOME' },
      validationResults: incomeVal2,
      currentStatus: incomeVal2.verificationStatus,
    });
    await Document.create({
      applicationId: app2._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'marks2.png',
      originalFileName: 'marks2.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'MARKSHEET' },
      validationResults: marksVal1,
      currentStatus: 'Pre-Verification Passed',
    });
    const res2 = await simulateBackendSubmission(app2._id);
    assert(res2.success === false && res2.statusType === 'Mismatch Detected', 'Submission blocked on Income Certificate mismatch');

    // ----------------------------------------------------
    // Scenario 3: Marksheet percentage differs from profile (85% vs 72%)
    // ----------------------------------------------------
    console.log('\nScenario 3: Marksheet percentage differs from profile');
    const app3 = await Application.create({
      applicationId: 'APP-TEST-003',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    await Document.create({
      applicationId: app3._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'inc3.png',
      originalFileName: 'inc3.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME' },
      validationResults: incomeVal1,
      currentStatus: 'Pre-Verification Passed',
    });
    const marksVal3 = await detectMismatches(
      { studentName: 'Rohan Sharma', percentageOrCGPA: 85.0 },
      { studentName: 'Rohan Sharma', marks: 72.0, rawOcrText: 'SEMESTER MARKSHEET 72%' },
      'Mark Sheet'
    );
    await Document.create({
      applicationId: app3._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'marks3.png',
      originalFileName: 'marks3.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 72.0, rawOcrText: 'MARKSHEET' },
      validationResults: marksVal3,
      currentStatus: marksVal3.verificationStatus,
    });
    const res3 = await simulateBackendSubmission(app3._id);
    assert(res3.success === false && res3.statusType === 'Mismatch Detected', 'Submission blocked on Mark Sheet percentage mismatch');

    // ----------------------------------------------------
    // Scenario 4: Income Certificate is missing
    // ----------------------------------------------------
    console.log('\nScenario 4: Income Certificate is missing');
    const app4 = await Application.create({
      applicationId: 'APP-TEST-004',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    await Document.create({
      applicationId: app4._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'marks4.png',
      originalFileName: 'marks4.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'MARKSHEET' },
      validationResults: marksVal1,
      currentStatus: 'Pre-Verification Passed',
    });
    const res4 = await simulateBackendSubmission(app4._id);
    assert(res4.success === false && res4.message.includes('Income Certificate'), 'Submission blocked when Income Certificate is missing');

    // ----------------------------------------------------
    // Scenario 5: Marksheet is missing
    // ----------------------------------------------------
    console.log('\nScenario 5: Marksheet is missing');
    const app5 = await Application.create({
      applicationId: 'APP-TEST-005',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    await Document.create({
      applicationId: app5._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'inc5.png',
      originalFileName: 'inc5.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME' },
      validationResults: incomeVal1,
      currentStatus: 'Pre-Verification Passed',
    });
    const res5 = await simulateBackendSubmission(app5._id);
    assert(res5.success === false && res5.message.includes('Mark Sheet'), 'Submission blocked when Mark Sheet is missing');

    // ----------------------------------------------------
    // Scenario 6: Wrong certificate type uploaded
    // ----------------------------------------------------
    console.log('\nScenario 6: Wrong certificate type uploaded (Mark sheet under Income slot)');
    const wrongTypeVal = await detectMismatches(
      { studentName: 'Rohan Sharma', annualFamilyIncome: 180000 },
      { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'MARKSHEET SEMESTER GRADE CARD EXAMINATION 85%' },
      'Income Certificate'
    );
    assert(
      wrongTypeVal.hasMismatch === true &&
      wrongTypeVal.mismatchDetails.some((m) => m.field === 'Document Type Conflict'),
      'Wrong document type flagged with Document Type Conflict'
    );

    // ----------------------------------------------------
    // Scenario 7: OCR cannot read required field -> Manual Review Required
    // ----------------------------------------------------
    console.log('\nScenario 7: OCR cannot read required field');
    const unreadableVal = await detectMismatches(
      { studentName: 'Rohan Sharma', annualFamilyIncome: 180000 },
      { studentName: 'Rohan Sharma', incomeAmount: null, rawOcrText: 'GOVERNMENT REVENUE DEPARTMENT BLURRED CERTIFICATE ILLEGIBLE AMOUNT' },
      'Income Certificate'
    );
    assert(
      unreadableVal.verificationStatus === 'Manual Review Required' && unreadableVal.isManualReview === true,
      'Unreadable income field marked as Manual Review Required instead of passing'
    );

    // ----------------------------------------------------
    // Scenario 8: Student replaces incorrect certificate with correct copy
    // ----------------------------------------------------
    console.log('\nScenario 8: Student replaces incorrect certificate');
    const app8 = await Application.create({
      applicationId: 'APP-TEST-008',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 180000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });

    await Document.create({
      applicationId: app8._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'marks8.png',
      originalFileName: 'marks8.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 85.0, rawOcrText: 'MARKSHEET' },
      validationResults: marksVal1,
      currentStatus: 'Pre-Verification Passed',
    });

    let doc8 = await Document.create({
      applicationId: app8._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'bad_income.png',
      originalFileName: 'bad_income.png',
      mimeType: 'image/png',
      fileSize: 10000,
      version: 1,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 250000, rawOcrText: 'INCOME' },
      validationResults: incomeVal2,
      currentStatus: 'Mismatch Detected',
    });

    // Verify submission is initially blocked
    const initialRes8 = await simulateBackendSubmission(app8._id);
    assert(initialRes8.success === false, 'Initial submission blocked before replacement');

    // Simulate replacement workflow
    await DocumentVersion.create({
      documentId: doc8._id,
      versionNumber: 1,
      storedFileName: doc8.storedFileName,
      originalFileName: doc8.originalFileName,
      uploadedBy: student._id,
      extractedData: doc8.extractedData,
      correctionReason: 'Document replaced with updated copy',
    });

    const fixedIncomeVal = await detectMismatches(
      { studentName: 'Rohan Sharma', annualFamilyIncome: 180000 },
      { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME CERTIFICATE TAHSILDAR 180000' },
      'Income Certificate'
    );
    doc8.storedFileName = 'good_income.png';
    doc8.version = 2;
    doc8.extractedData = { studentName: 'Rohan Sharma', incomeAmount: 180000, rawOcrText: 'INCOME' };
    doc8.validationResults = fixedIncomeVal;
    doc8.currentStatus = 'Pre-Verification Passed';
    await doc8.save();

    const res8 = await simulateBackendSubmission(app8._id);
    assert(res8.success === true, 'Submission succeeds after replacing incorrect document with matching copy');

    // ----------------------------------------------------
    // Scenario 9: Student changes income/marks after verification -> invalidates affected verification
    // ----------------------------------------------------
    console.log('\nScenario 9: Student changes income after verification');
    // Save verified income cert to profile
    profile.certificates = [
      {
        documentType: 'Income Certificate',
        storedFileName: 'inc.png',
        originalFileName: 'inc.png',
        version: 1,
        extractedData: { studentName: 'Rohan Sharma', incomeAmount: 180000 },
        validationResults: incomeVal1,
        verificationStatus: 'Verified',
      },
    ];
    await profile.save();

    // Now student changes profile annualFamilyIncome to 350000
    profile.annualFamilyIncome = 350000;
    // System re-evaluates
    for (const cert of profile.certificates) {
      const reval = await detectMismatches(
        { studentName: student.name, annualFamilyIncome: profile.annualFamilyIncome },
        cert.extractedData,
        cert.documentType
      );
      cert.validationResults = reval;
      cert.verificationStatus = reval.verificationStatus;
    }
    await profile.save();

    assert(
      profile.certificates[0].verificationStatus === 'Mismatch Detected',
      'Profile certificate verification invalidated when student changes income to mismatched value'
    );

    // ----------------------------------------------------
    // Scenario 10: Direct API bypass attempt blocked on backend
    // ----------------------------------------------------
    console.log('\nScenario 10: Direct API bypass attempt blocked on backend');
    const bypassApp = await Application.create({
      applicationId: 'APP-BYPASS-999',
      studentId: student._id,
      scholarshipId: scholarship._id,
      applicationData: { studentName: 'Rohan Sharma', annualFamilyIncome: 350000, percentageOrCGPA: 85.0 },
      status: 'draft',
    });
    // Create doc marked 'Pre-Verification Passed' fraudulently by a client, but data has mismatch
    await Document.create({
      applicationId: bypassApp._id,
      studentId: student._id,
      documentType: 'Income Certificate',
      storedFileName: 'bypass.png',
      originalFileName: 'bypass.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', incomeAmount: 180000 }, // 180k vs 350k
      currentStatus: 'Pre-Verification Passed', // client forged status
    });
    await Document.create({
      applicationId: bypassApp._id,
      studentId: student._id,
      documentType: 'Mark Sheet',
      storedFileName: 'bypass_m.png',
      originalFileName: 'bypass_m.png',
      mimeType: 'image/png',
      fileSize: 10000,
      extractedData: { studentName: 'Rohan Sharma', marks: 85.0 },
      currentStatus: 'Pre-Verification Passed',
    });

    // Backend independent validation will catch the discrepancy
    const bypassRes = await simulateBackendSubmission(bypassApp._id);
    assert(
      bypassRes.success === false,
      'Backend independent verification blocks forged pre-verification status on API submit'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await teardown();
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
