const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Security requirement: Normal registration only creates students. Officer/Admin cannot be self-granted.
    const assignedRole = role === 'officer' || role === 'admin' ? 'student' : 'student';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      role: assignedRole,
    });

    await user.save();

    // Create an initial student profile
    const profile = new StudentProfile({
      userId: user._id,
      studentId: `STU-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    await profile.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      reason: `New student registration: ${user.email}`,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is suspended or inactive.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed.', error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      phone,
      studentId,
      dateOfBirth,
      gender,
      category,
      course,
      academicYear,
      institution,
      percentageOrCGPA,
      annualFamilyIncome,
      disabilityStatus,
    } = req.body;

    if (name || phone !== undefined) {
      await User.findByIdAndUpdate(userId, {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      });
    }

    const profileData = {
      ...(studentId && { studentId }),
      ...(dateOfBirth && { dateOfBirth }),
      ...(gender !== undefined && { gender }),
      ...(category !== undefined && { category }),
      ...(course !== undefined && { course }),
      ...(academicYear !== undefined && { academicYear }),
      ...(institution !== undefined && { institution }),
      ...(percentageOrCGPA !== undefined && { percentageOrCGPA: Number(percentageOrCGPA) }),
      ...(annualFamilyIncome !== undefined && { annualFamilyIncome: Number(annualFamilyIncome) }),
      ...(disabilityStatus !== undefined && { disabilityStatus }),
      profileCompletionStatus: true,
    };

    const profile = await StudentProfile.findOneAndUpdate(
      { userId },
      { $set: profileData },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.', error: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile };
