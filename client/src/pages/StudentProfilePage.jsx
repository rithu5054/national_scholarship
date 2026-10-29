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

  const handleProfileCertificateUpload = async (documentType, file, simulatedMockData = null) => {
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
      if (simulatedMockData) {
        data.append('mockSimulatedFields', JSON.stringify(simulatedMockData));
      }

      const res = await api.post('/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setCertActionMessage({
          type: res.data.verificationStatus === 'Mismatch Detected' ? 'warning' : res.data.verificationStatus === 'Manual Review Required' ? 'info' : 'success',
          text: res.data.message || `${documentType} processed.`,
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
    const fromProfile = profile?.certificates?.find((c) => c.documentType === docType);
    if (fromProfile) return fromProfile;

    // Fallback to myCertificates
    const fromDocs = myCertificates.find((d) => d.documentType === docType);
    if (fromDocs) {
      return {
        documentType: fromDocs.documentType,
        documentId: fromDocs._id,
        storedFileName: fromDocs.storedFileName,
        originalFileName: fromDocs.originalFileName,
        uploadDate: fromDocs.uploadedAt,
        version: fromDocs.version || 1,
        extractedData: fromDocs.extractedData,
        validationResults: fromDocs.validationResults,
        verificationStatus: fromDocs.currentStatus === 'Officer Verified' || fromDocs.currentStatus === 'Pre-Verification Passed'
          ? 'Verified'
          : fromDocs.currentStatus === 'Mismatch Detected'
          ? 'Mismatch Detected'
          : fromDocs.currentStatus === 'Manual Review Required'
          ? 'Manual Review Required'
          : 'Pending Verification',
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
      mockValid: {
        certificateNumber: 'INC-2025-984321',
        studentName: formData.name,
        incomeAmount: Number(formData.annualFamilyIncome) || 180000,
        issueDate: '2025-04-12',
      },
      mockMismatch: {
        certificateNumber: 'INC-MISMATCH-999',
        studentName: formData.name,
        incomeAmount: (Number(formData.annualFamilyIncome) || 180000) + 70000,
        issueDate: '2025-04-12',
      },
    },
    {
      type: 'Mark Sheet',
      title: 'Academic Marksheet',
      description: 'Latest official semester grade transcript or examination board mark sheet.',
      relevantField: 'Academic Score',
      profileValue: formData.percentageOrCGPA ? `${formData.percentageOrCGPA}%` : 'Not entered',
      mockValid: {
        certificateNumber: 'MRK-2025-778899',
        studentName: formData.name,
        marks: Number(formData.percentageOrCGPA) || 84.5,
      },
      mockMismatch: {
        certificateNumber: 'MRK-2025-00129',
        studentName: formData.name,
        marks: Math.max(40, (Number(formData.percentageOrCGPA) || 84.5) - 12.5),
      },
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
            const status = uploaded?.verificationStatus || 'Not Uploaded';
            const isMismatch = status === 'Mismatch Detected';
            const isManualReview = status === 'Manual Review Required';
            const isVerified = status === 'Verified';
            const mismatches = uploaded?.validationResults?.mismatchDetails || [];

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  isMismatch
                    ? 'bg-amber-50/50 border-amber-300'
                    : isManualReview
                    ? 'bg-blue-50/40 border-blue-200'
                    : isVerified
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
                        isVerified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isMismatch
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : isManualReview
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : uploaded
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {status}
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
                        <span className="font-medium truncate max-w-[180px]">{uploaded.originalFileName}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Uploaded:</span>
                        <span>{uploaded.uploadDate ? new Date(uploaded.uploadDate).toLocaleDateString() : 'Recently'} (v{uploaded.version || 1})</span>
                      </div>
                      {uploaded.extractedData?.certificateNumber && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Cert ID:</span>
                          <span className="font-mono font-bold text-slate-800">{uploaded.extractedData.certificateNumber}</span>
                        </div>
                      )}
                      {uploaded.extractedData?.studentName && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Extracted Name:</span>
                          <span className="font-semibold text-slate-800">{uploaded.extractedData.studentName}</span>
                        </div>
                      )}
                      {uploaded.extractedData?.incomeAmount && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Extracted Income:</span>
                          <span className="font-bold text-blue-700">₹{uploaded.extractedData.incomeAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {uploaded.extractedData?.marks && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Extracted Marks:</span>
                          <span className="font-bold text-blue-700">{uploaded.extractedData.marks}%</span>
                        </div>
                      )}

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

                  {/* Mismatch Alert Box */}
                  {isMismatch && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 mb-3 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-950">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Mismatch Detected:</span>
                      </div>
                      {mismatches.map((m, mi) => (
                        <div key={mi} className="text-[11px] leading-relaxed">
                          • <strong>{m.field}:</strong> {m.reason}
                        </div>
                      ))}
                      <p className="text-[10px] text-red-800 pt-1 font-medium">
                        👉 Action: Correct your profile value above if you mistyped it, or click "Replace Certificate" below to upload the authentic document.
                      </p>
                    </div>
                  )}

                  {/* Manual Review Alert Box */}
                  {isManualReview && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-3 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Manual Review Required:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        OCR could not automatically read all mandatory fields. Ensure your document is clear, unblurred, and right-side up, or replace it with a clearer copy.
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload & Demo Buttons */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                  <label className="cursor-pointer px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDocType === certItem.type ? 'Processing OCR...' : uploaded ? 'Replace Certificate' : 'Upload Certificate'}</span>
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

                  {/* Demo Mock Scan Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Simulate authentic matching scan"
                      onClick={() => {
                        const blob = new Blob([`Official ${certItem.type} content`], { type: 'text/plain' });
                        const testFile = new File([blob], `${certItem.type.replace(/\s+/g, '_')}_Official.png`, { type: 'image/png' });
                        handleProfileCertificateUpload(certItem.type, testFile, certItem.mockValid);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                    >
                      [Demo Match]
                    </button>
                    <button
                      type="button"
                      title="Simulate mismatching scan"
                      onClick={() => {
                        const blob = new Blob([`Official ${certItem.type} content with discrepancy`], { type: 'text/plain' });
                        const testFile = new File([blob], `${certItem.type.replace(/\s+/g, '_')}_Discrepancy.png`, { type: 'image/png' });
                        handleProfileCertificateUpload(certItem.type, testFile, certItem.mockMismatch);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                    >
                      [Demo Mismatch]
                    </button>
                  </div>
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
