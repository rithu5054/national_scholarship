import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  School,
  Percent,
  IndianRupee,
  Save,
  AlertCircle,
  FileText,
  ShieldCheck,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Info,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    studentId: '',
    dateOfBirth: '',
    gender: 'Male',
    category: 'General',
    course: '',
    academicYear: '',
    institution: '',
    percentageOrCGPA: '',
    annualFamilyIncome: '',
    disabilityStatus: 'No',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [myCertificates, setMyCertificates] = useState([]);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [certActionMessage, setCertActionMessage] = useState({ type: '', text: '' });

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/documents/my-documents');
      if (res.data.success) {
        setMyCertificates(res.data.documents || []);
      }
    } catch (e) {
      // non-critical
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  useEffect(() => {
    if (user && profile) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        studentId: profile.studentId || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || 'Male',
        category: profile.category || 'General',
        course: profile.course || '',
        academicYear: profile.academicYear || '',
        institution: profile.institution || '',
        percentageOrCGPA: profile.percentageOrCGPA || '',
        annualFamilyIncome: profile.annualFamilyIncome || '',
        disabilityStatus: profile.disabilityStatus || 'No',
      });
    }
  }, [user, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await api.put('/auth/profile', formData);
      if (res.data.success) {
        setSuccess('Profile details saved! Any uploaded certificates have been re-verified against your updated details.');
        await refreshProfile();
        await fetchCertificates();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCertificateUpload = async (documentType, file) => {
    // Validate file type
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setCertActionMessage({ type: 'error', text: 'Only PDF, JPG, and PNG files are allowed.' });
      return;
    }
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setCertActionMessage({ type: 'error', text: 'File size exceeds maximum limit of 10MB.' });
      return;
    }

    try {
      setUploadingDocType(documentType);
      setCertActionMessage({ type: '', text: '' });

      const data = new FormData();
      data.append('file', file);
      data.append('documentType', documentType);
      data.append('applicationId', 'profile');

      const res = await api.post('/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setCertActionMessage({
          type: 'success',
          text: res.data.message || `${documentType} saved to your profile successfully.`,
        });
        await refreshProfile();
        await fetchCertificates();
      }
    } catch (err) {
      setCertActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Certificate upload failed.',
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  // Helper to find profile certificate
  const getProfileCert = (docType) => {
    const isIncome = docType.toLowerCase().includes('income');
    const isMark = docType.toLowerCase().includes('mark');

    const fromProfile = profile?.certificates?.find((c) =>
      c.documentType === docType ||
      (isIncome && c.documentType.toLowerCase().includes('income')) ||
      (isMark && c.documentType.toLowerCase().includes('mark'))
    );
    if (fromProfile) return fromProfile;

    // Fallback to myCertificates
    const fromDocs = myCertificates.find((d) =>
      d.documentType === docType ||
      (isIncome && d.documentType.toLowerCase().includes('income')) ||
      (isMark && d.documentType.toLowerCase().includes('mark'))
    );
    if (fromDocs) {
      return {
        documentType: fromDocs.documentType,
        documentId: fromDocs._id,
        storedFileName: fromDocs.storedFileName,
        originalFileName: fromDocs.originalFileName,
        uploadDate: fromDocs.uploadedAt,
        version: fromDocs.version || 1,
        verificationStatus: 'Uploaded',
      };
    }
    return null;
  };

  const certificateTypes = [
    {
      type: 'Income Certificate',
      title: 'Income Certificate',
      description: 'Official revenue document showing annual household income (issued by Tahsildar or Revenue Authority).',
      relevantField: 'Annual Family Income',
      profileValue: formData.annualFamilyIncome ? `₹${Number(formData.annualFamilyIncome).toLocaleString('en-IN')}` : 'Not entered',
    },
    {
      type: 'Academic Marksheet',
      title: 'Academic Marksheet',
      description: 'Latest official semester grade transcript or examination board mark sheet.',
      relevantField: 'Academic Score',
      profileValue: formData.percentageOrCGPA ? `${formData.percentageOrCGPA}%` : 'Not entered',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Profile & Certificate Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Maintain your personal academic profile and upload required certificates for automated verification across scholarship schemes.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Student Academic & Financial Details</h2>
          <span className="text-[11px] text-slate-400">All fields are used for automatic eligibility and certificate matching</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              College Enrolled Course
            </label>
            <input
              type="text"
              placeholder="e.g. B.E. Computer Science & Engineering"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              College / University Institution
            </label>
            <input
              type="text"
              placeholder="e.g. National Institute of Technology"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Year
            </label>
            <input
              type="text"
              placeholder="e.g. Third Year"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Marks (% or CGPA)
            </label>
            <input
              type="number"
              step="0.01"
              max="100"
              placeholder="e.g. 84.5"
              value={formData.percentageOrCGPA}
              onChange={(e) => setFormData({ ...formData, percentageOrCGPA: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Annual Family Income (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 180000"
              value={formData.annualFamilyIncome}
              onChange={(e) => setFormData({ ...formData, annualFamilyIncome: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Social Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Disability Status
            </label>
            <select
              value={formData.disabilityStatus}
              onChange={(e) => setFormData({ ...formData, disabilityStatus: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      </form>

      {/* MY CERTIFICATES SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Certificates</h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload and manage your official certificates in your profile. Verified certificates are automatically attached when applying for scholarships.
          </p>
        </div>

        {certActionMessage.text && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              certActionMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : certActionMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : certActionMessage.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {certActionMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {certActionMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {certActionMessage.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            {certActionMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{certActionMessage.text}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {certificateTypes.map((certItem, idx) => {
            const uploaded = getProfileCert(certItem.type);

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  uploaded
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-sm text-slate-900">{certItem.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        uploaded
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {uploaded ? 'Uploaded' : 'Not Uploaded'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{certItem.description}</p>

                  {/* Profile Reference Value */}
                  <div className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-100 mb-3 flex items-center justify-between">
                    <span className="text-slate-500">Profile {certItem.relevantField}:</span>
                    <strong className="text-slate-800">{certItem.profileValue}</strong>
                  </div>

                  {/* Uploaded Certificate Details */}
                  {uploaded && (
                    <div className="space-y-2 text-xs bg-white/80 p-3 rounded-xl border border-slate-200/80 mb-3">
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">File:</span>
                        <span className="font-medium truncate max-w-[200px]">{uploaded.originalFileName}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Uploaded:</span>
                        <span>{uploaded.uploadDate ? new Date(uploaded.uploadDate).toLocaleDateString() : 'Recently'} (v{uploaded.version || 1})</span>
                      </div>

                      {/* Preview link */}
                      {uploaded.documentId && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <a
                            href={`/api/documents/${uploaded.documentId}/file?token=${localStorage.getItem('scholartrack_token') || ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview Document
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Upload or Replace Button */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <label className="cursor-pointer px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDocType === certItem.type ? 'Uploading...' : uploaded ? 'Replace Certificate' : 'Upload Certificate'}</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={uploadingDocType === certItem.type}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleProfileCertificateUpload(certItem.type, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
