/**
 * Rule-based Eligibility Evaluation Engine for ScholarTrack
 * Evaluates configured criteria against student profile / application data
 * Generates transparent explanations for passes and failures.
 */

const evaluateEligibility = (scholarship, studentProfile) => {
  const criteriaResults = [];
  const reasons = [];
  let isEligible = true;

  const criteria = scholarship.eligibilityCriteria || {};

  // 1. Academic Percentage / CGPA check
  if (criteria.minPercentage && criteria.minPercentage > 0) {
    const studentMarks = Number(studentProfile.percentageOrCGPA || 0);
    const passed = studentMarks >= criteria.minPercentage;
    criteriaResults.push({
      criterion: 'Academic Percentage / CGPA',
      passed,
      studentValue: `${studentMarks}%`,
      requirementValue: `Minimum ${criteria.minPercentage}%`,
      message: passed
        ? `Academic score of ${studentMarks}% meets the minimum requirement of ${criteria.minPercentage}%.`
        : `Academic score of ${studentMarks}% is below the required ${criteria.minPercentage}%.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Academic score (${studentMarks}%) does not meet the minimum requirement of ${criteria.minPercentage}%.`);
    }
  }

  // 2. Maximum Annual Family Income check
  if (criteria.maxIncome && criteria.maxIncome < Infinity) {
    const studentIncome = Number(studentProfile.annualFamilyIncome || 0);
    const passed = studentIncome <= criteria.maxIncome;
    criteriaResults.push({
      criterion: 'Annual Family Income',
      passed,
      studentValue: `₹${studentIncome.toLocaleString('en-IN')}`,
      requirementValue: `Maximum ₹${criteria.maxIncome.toLocaleString('en-IN')}`,
      message: passed
        ? `Annual family income of ₹${studentIncome.toLocaleString('en-IN')} is within the permissible limit of ₹${criteria.maxIncome.toLocaleString('en-IN')}.`
        : `Annual family income of ₹${studentIncome.toLocaleString('en-IN')} exceeds the maximum allowable limit of ₹${criteria.maxIncome.toLocaleString('en-IN')}.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Annual family income (₹${studentIncome.toLocaleString('en-IN')}) exceeds the configured ceiling of ₹${criteria.maxIncome.toLocaleString('en-IN')}.`);
    }
  }

  // 3. Eligible Courses check
  if (criteria.eligibleCourses && criteria.eligibleCourses.length > 0) {
    const studentCourse = (studentProfile.course || '').trim().toLowerCase();
    const passed = criteria.eligibleCourses.some(
      (c) => c.toLowerCase() === studentCourse || studentCourse.includes(c.toLowerCase()) || c.toLowerCase().includes(studentCourse)
    );
    criteriaResults.push({
      criterion: 'Enrolled Course',
      passed,
      studentValue: studentProfile.course || 'Not Specified',
      requirementValue: criteria.eligibleCourses.join(', '),
      message: passed
        ? `Course '${studentProfile.course}' is eligible under this scholarship.`
        : `Course '${studentProfile.course || 'Not Specified'}' is not among eligible programs: ${criteria.eligibleCourses.join(', ')}.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Course '${studentProfile.course}' is not eligible for this scholarship.`);
    }
  }

  // 4. Eligible Categories check (General, OBC, SC, ST, EWS)
  if (criteria.eligibleCategories && criteria.eligibleCategories.length > 0) {
    const studentCategory = (studentProfile.category || '').trim();
    const passed = criteria.eligibleCategories.includes(studentCategory);
    criteriaResults.push({
      criterion: 'Social Category',
      passed,
      studentValue: studentCategory || 'Not Specified',
      requirementValue: criteria.eligibleCategories.join(', '),
      message: passed
        ? `Category '${studentCategory}' is covered under this scheme.`
        : `Category '${studentCategory || 'Not Specified'}' is not listed in eligible categories: ${criteria.eligibleCategories.join(', ')}.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Category '${studentCategory}' does not match the scheme's eligible categories.`);
    }
  }

  // 5. Eligible Genders check
  if (criteria.eligibleGenders && criteria.eligibleGenders.length > 0) {
    const studentGender = (studentProfile.gender || '').trim();
    const passed = criteria.eligibleGenders.includes(studentGender);
    criteriaResults.push({
      criterion: 'Gender Specification',
      passed,
      studentValue: studentGender || 'Not Specified',
      requirementValue: criteria.eligibleGenders.join(', '),
      message: passed
        ? `Gender '${studentGender}' fulfills requirement.`
        : `Scheme is restricted to: ${criteria.eligibleGenders.join(', ')}.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Scheme is restricted to ${criteria.eligibleGenders.join(', ')}.`);
    }
  }

  // 6. Disability status requirement
  if (criteria.disabilityRequirement && criteria.disabilityRequirement !== 'Any') {
    const studentDisability = studentProfile.disabilityStatus || 'No';
    const passed = studentDisability === criteria.disabilityRequirement;
    criteriaResults.push({
      criterion: 'Disability Status',
      passed,
      studentValue: studentDisability,
      requirementValue: criteria.disabilityRequirement,
      message: passed
        ? `Disability criterion (${criteria.disabilityRequirement}) fulfilled.`
        : `Disability criterion requires status to be '${criteria.disabilityRequirement}'.`,
    });
    if (!passed) {
      isEligible = false;
      reasons.push(`Disability criterion (${criteria.disabilityRequirement}) not met.`);
    }
  }

  // If no negative factors were found
  if (isEligible && reasons.length === 0) {
    reasons.push('All configured academic, income, and category eligibility rules are satisfied.');
  }

  return {
    isEligible,
    reasons,
    criteriaResults,
    evaluatedAt: new Date(),
  };
};

module.exports = { evaluateEligibility };
