const bcrypt = require('bcryptjs');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seed] Database already contains records. Skipping seed.');
      return;
    }

    console.log('[Seed] Seeding sample data for ScholarTrack prototype...');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Password@123', salt);

    // 1. Create Admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@scholartrack.edu',
      passwordHash: defaultPassword,
      role: 'admin',
      phone: '+91 9876543210',
    });

    // 2. Create Verification Officers
    const officer1 = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'ramesh.officer@scholartrack.edu',
      passwordHash: defaultPassword,
      role: 'officer',
      phone: '+91 9876543211',
    });

    const officer2 = await User.create({
      name: 'Prof. Sunita Menon',
      email: 'sunita.officer@scholartrack.edu',
      passwordHash: defaultPassword,
      role: 'officer',
      phone: '+91 9876543212',
    });

    // 3. Create Students
    const student1 = await User.create({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@student.edu',
      passwordHash: defaultPassword,
      role: 'student',
      phone: '+91 9123456780',
    });

    const student2 = await User.create({
      name: 'Priya Patel',
      email: 'priya.patel@student.edu',
      passwordHash: defaultPassword,
      role: 'student',
      phone: '+91 9123456781',
    });

    const student3 = await User.create({
      name: 'Rahul Verma',
      email: 'rahul.verma@student.edu',
      passwordHash: defaultPassword,
      role: 'student',
      phone: '+91 9123456782',
    });

    // 4. Create Student Profiles
    await StudentProfile.create({
      userId: student1._id,
      studentId: 'STU-2026-001',
      dateOfBirth: '2004-03-15',
      gender: 'Male',
      category: 'General',
      course: 'B.E. Computer Science & Engineering',
      academicYear: 'Third Year',
      institution: 'National Institute of Technology',
      percentageOrCGPA: 84.5,
      annualFamilyIncome: 180000,
      disabilityStatus: 'No',
      profileCompletionStatus: true,
    });

    await StudentProfile.create({
      userId: student2._id,
      studentId: 'STU-2026-002',
      dateOfBirth: '2005-07-22',
      gender: 'Female',
      category: 'OBC',
      course: 'B.Tech Information Technology',
      academicYear: 'Second Year',
      institution: 'Delhi Technological University',
      percentageOrCGPA: 89.0,
      annualFamilyIncome: 120000,
      disabilityStatus: 'No',
      profileCompletionStatus: true,
    });

    await StudentProfile.create({
      userId: student3._id,
      studentId: 'STU-2026-003',
      dateOfBirth: '2003-11-08',
      gender: 'Male',
      category: 'SC',
      course: 'B.Sc Physics',
      academicYear: 'Final Year',
      institution: 'St. Stephen College',
      percentageOrCGPA: 71.0,
      annualFamilyIncome: 280000,
      disabilityStatus: 'No',
      profileCompletionStatus: true,
    });

    // 5. Create Scholarships (Clearly labelled sample scholarships)
    const sch1 = await Scholarship.create({
      name: 'Merit-Cum-Means Technical Education Scholarship',
      provider: 'State Higher Education Council [Sample Prototype]',
      description: 'Financial assistance for meritorious undergraduate engineering and technology students from economically weaker sections.',
      amount: 50000,
      eligibilityCriteria: {
        minPercentage: 75,
        maxIncome: 250000,
        eligibleCourses: ['B.E. Computer Science & Engineering', 'B.Tech Information Technology', 'Engineering'],
        eligibleCategories: ['General', 'OBC', 'SC', 'ST', 'EWS'],
        eligibleGenders: ['Male', 'Female', 'Other'],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Income Certificate', isRequired: true, description: 'Issued by Revenue Authority not older than 1 year' },
        { documentType: 'Mark Sheet', isRequired: true, description: 'Previous semester or year authentic academic marksheet' },
        { documentType: 'Bonafide Certificate', isRequired: true, description: 'Issued by Principal / Head of Institution' },
      ],
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'active',
      createdBy: admin._id,
    });

    const sch2 = await Scholarship.create({
      name: 'Women in STEM Advancement Grant',
      provider: 'Foundation for Science & Innovation [Sample Prototype]',
      description: 'Special empowerment grant encouraging female undergraduate students pursuing degrees in Science, Technology, and Mathematics.',
      amount: 60000,
      eligibilityCriteria: {
        minPercentage: 70,
        maxIncome: 350000,
        eligibleCourses: ['B.E. Computer Science & Engineering', 'B.Tech Information Technology', 'B.Sc Physics', 'Mathematics'],
        eligibleCategories: ['General', 'OBC', 'SC', 'ST', 'EWS'],
        eligibleGenders: ['Female'],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Income Certificate', isRequired: true },
        { documentType: 'Mark Sheet', isRequired: true },
        { documentType: 'College ID', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: admin._id,
    });

    const sch3 = await Scholarship.create({
      name: 'Social Upliftment & Higher Learning Fellowship',
      provider: 'Welfare Department [Sample Prototype]',
      description: 'Dedicated financial aid enabling affirmative access to tertiary education for underprivileged students.',
      amount: 40000,
      eligibilityCriteria: {
        minPercentage: 60,
        maxIncome: 300000,
        eligibleCourses: [], // all courses
        eligibleCategories: ['SC', 'ST'],
        eligibleGenders: [],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Community Certificate', isRequired: true },
        { documentType: 'Income Certificate', isRequired: true },
        { documentType: 'Mark Sheet', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: admin._id,
    });

    const sch4 = await Scholarship.create({
      name: 'National Talent Academic Fellowship',
      provider: 'National Research Promotion Body [Sample Prototype]',
      description: 'High merit fellowship awarded strictly on academic distinction across recognized collegiate institutions.',
      amount: 75000,
      eligibilityCriteria: {
        minPercentage: 85,
        maxIncome: 500000,
        eligibleCourses: [],
        eligibleCategories: [],
        eligibleGenders: [],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Mark Sheet', isRequired: true },
        { documentType: 'Bonafide Certificate', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: admin._id,
    });

    const sch5 = await Scholarship.create({
      name: 'Rural Empowerment Education Aid',
      provider: 'Regional Development Board [Sample Prototype]',
      description: 'Supportive funding targeted at rural scholars pursuing professional diplomas and university degrees.',
      amount: 35000,
      eligibilityCriteria: {
        minPercentage: 65,
        maxIncome: 200000,
        eligibleCourses: [],
        eligibleCategories: [],
        eligibleGenders: [],
        disabilityRequirement: 'Any',
      },
      requiredDocuments: [
        { documentType: 'Income Certificate', isRequired: true },
        { documentType: 'Mark Sheet', isRequired: true },
      ],
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'active',
      createdBy: admin._id,
    });

    // 6. Sample Application with Mismatch (for demonstration of novel mismatch detection)
    const appMismatch = await Application.create({
      applicationId: 'APP-2026-8801',
      studentId: student1._id,
      scholarshipId: sch1._id,
      applicationData: {
        studentName: 'Aarav Sharma',
        email: 'aarav.sharma@student.edu',
        phone: '+91 9123456780',
        studentIdNumber: 'STU-2026-001',
        course: 'B.E. Computer Science & Engineering',
        academicYear: 'Third Year',
        institution: 'National Institute of Technology',
        percentageOrCGPA: 84.5,
        annualFamilyIncome: 180000, // Entered value
        category: 'General',
        gender: 'Male',
        disabilityStatus: 'No',
      },
      eligibilityEvaluation: {
        isEligible: true,
        reasons: ['All criteria satisfied.'],
        criteriaResults: [
          { criterion: 'Academic Marks', passed: true, studentValue: '84.5%', requirementValue: 'Min 75%' },
          { criterion: 'Family Income', passed: true, studentValue: '₹1,80,000', requirementValue: 'Max ₹2,50,000' },
        ],
      },
      currentStage: 'Under Officer Verification',
      status: 'submitted',
      assignedOfficer: officer1._id,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // Documents for this application
    // Document A: Verified Income Certificate
    await Document.create({
      applicationId: appMismatch._id,
      studentId: student1._id,
      documentType: 'Income Certificate',
      storedFileName: 'sample-income-aarav.pdf',
      originalFileName: 'Income_Certificate_2025.pdf',
      mimeType: 'application/pdf',
      fileSize: 450000,
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      extractedData: {
        studentName: 'Aarav Sharma',
        certificateNumber: 'INC-2025-984321',
        incomeAmount: 180000,
        issueDate: '2025-04-12',
        extractionStatus: 'Success',
      },
      validationResults: {
        hasMismatch: false,
        mismatchDetails: [],
        qrVerification: {
          status: 'Verified Against Configured Source',
          sourceName: 'Mock E-District Verification Authority [Synthetic Prototype]',
          details: 'Certificate record found and verified in configured registry.',
        },
        preVerificationPassed: true,
      },
      currentStatus: 'Officer Verified',
      officerReview: {
        verifiedBy: officer1._id,
        verifiedAt: new Date(),
        notes: 'Certificate validated against registry authority and verified.',
      },
    });

    // Document B: Marksheet with detected academic mismatch (Entered 84.5% vs Certificate 72%)
    await Document.create({
      applicationId: appMismatch._id,
      studentId: student1._id,
      documentType: 'Mark Sheet',
      storedFileName: 'sample-mark-aarav.png',
      originalFileName: 'Semester_Marksheet_Official.png',
      mimeType: 'image/png',
      fileSize: 820000,
      fileHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      extractedData: {
        studentName: 'Aarav Sharma',
        certificateNumber: 'MRK-2025-00129',
        marks: 72.0, // Extracted value
        institutionName: 'National Institute of Technology',
        extractionStatus: 'Success',
      },
      validationResults: {
        hasMismatch: true,
        mismatchDetails: [
          {
            field: 'Academic Marks / Percentage',
            enteredValue: '84.5%',
            extractedValue: '72%',
            reason: "Application academic score (84.5%) differs from the score extracted from the mark sheet (72%). Please review the marks entered or upload the authentic semester grade transcript.",
            severity: 'High',
          },
        ],
        qrVerification: {
          status: 'No QR Detected',
          sourceName: 'Mock Verification Registry',
          details: 'Standard physical mark sheet; manual verification applicable.',
        },
        preVerificationPassed: false,
      },
      currentStatus: 'Correction Required',
      officerReview: {
        verifiedBy: officer1._id,
        verifiedAt: new Date(),
        correctionReason: 'Mismatched marks: Mark sheet states 72%, whereas 84.5% was entered in application.',
      },
    });

    // Sample Notification
    await Notification.create({
      userId: student1._id,
      message: 'Correction requested for Mark Sheet: "Mismatched marks: Mark sheet states 72%, whereas 84.5% was entered in application." Please update your application or replace the document.',
      type: 'correction',
      applicationId: appMismatch._id,
    });

    // Sample Audit Log
    await AuditLog.create({
      actorId: officer1._id,
      actorRole: 'officer',
      applicationId: appMismatch._id,
      action: 'CORRECTION_REQUESTED',
      previousStatus: 'under_review',
      newStatus: 'correction_required',
      reason: 'Mismatched marks detected between application and mark sheet',
    });

    console.log('[Seed] Database successfully seeded with demo accounts & sample scholarships!');
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
  }
};

module.exports = seedDatabase;
