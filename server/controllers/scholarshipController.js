const Scholarship = require('../models/Scholarship');
const StudentProfile = require('../models/StudentProfile');
const { evaluateEligibility } = require('../services/eligibilityEngine');
const { logAudit } = require('../services/auditService');

// Get all scholarships with search, filter, sorting
const getScholarships = async (req, res) => {
  try {
    const { search, course, category, maxIncome, minAmount, sort } = req.query;

    const query = { status: 'active' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (course) {
      query['eligibilityCriteria.eligibleCourses'] = { $in: [new RegExp(course, 'i')] };
    }

    if (category) {
      query['eligibilityCriteria.eligibleCategories'] = { $in: [category] };
    }

    if (maxIncome) {
      query['eligibilityCriteria.maxIncome'] = { $gte: Number(maxIncome) };
    }

    if (minAmount) {
      query.amount = { $gte: Number(minAmount) };
    }

    let sortOptions = { applicationDeadline: 1 };
    if (sort === 'amount_desc') sortOptions = { amount: -1 };
    if (sort === 'amount_asc') sortOptions = { amount: 1 };
    if (sort === 'deadline_asc') sortOptions = { applicationDeadline: 1 };
    if (sort === 'deadline_desc') sortOptions = { applicationDeadline: -1 };

    const scholarships = await Scholarship.find(query).sort(sortOptions);

    res.json({ success: true, count: scholarships.length, scholarships });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch scholarships.', error: err.message });
  }
};

const getScholarshipById = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }
    res.json({ success: true, scholarship });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving scholarship.', error: err.message });
  }
};

const checkEligibility = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    let studentProfile = req.body.profile;
    if (!studentProfile && req.user && req.user.role === 'student') {
      studentProfile = await StudentProfile.findOne({ userId: req.user._id });
    }

    if (!studentProfile) {
      return res.status(400).json({ success: false, message: 'Please provide or complete your student profile.' });
    }

    const evaluation = evaluateEligibility(scholarship, studentProfile);
    res.json({
      success: true,
      scholarship: { id: scholarship._id, name: scholarship.name },
      evaluation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Eligibility evaluation failed.', error: err.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile to view recommendations.' });
    }

    const scholarships = await Scholarship.find({ status: 'active' });

    const eligibleList = [];
    const notEligibleList = [];

    scholarships.forEach((sch) => {
      const result = evaluateEligibility(sch, profile);
      const item = {
        scholarship: sch,
        evaluation: result,
      };
      if (result.isEligible) {
        eligibleList.push(item);
      } else {
        notEligibleList.push(item);
      }
    });

    res.json({
      success: true,
      profileCompletionStatus: profile.profileCompletionStatus,
      recommendations: {
        eligible: eligibleList,
        notEligible: notEligibleList,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate recommendations.', error: err.message });
  }
};

// Admin endpoints
const createScholarship = async (req, res) => {
  try {
    const scholarship = new Scholarship({
      ...req.body,
      createdBy: req.user._id,
    });
    await scholarship.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SCHOLARSHIP_CREATED',
      reason: `Created scholarship: ${scholarship.name}`,
    });

    res.status(201).json({ success: true, scholarship });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to create scholarship.', error: err.message });
  }
};

const updateScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found.' });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SCHOLARSHIP_UPDATED',
      reason: `Updated scholarship: ${scholarship.name}`,
    });

    res.json({ success: true, scholarship });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Update failed.', error: err.message });
  }
};

const deactivateScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!scholarship) return res.status(404).json({ success: false, message: 'Scholarship not found.' });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SCHOLARSHIP_DEACTIVATED',
      reason: `Deactivated scholarship: ${scholarship.name}`,
    });

    res.json({ success: true, message: 'Scholarship deactivated successfully.', scholarship });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Deactivation failed.', error: err.message });
  }
};

module.exports = {
  getScholarships,
  getScholarshipById,
  checkEligibility,
  getRecommendations,
  createScholarship,
  updateScholarship,
  deactivateScholarship,
};
