import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, School, Percent, IndianRupee, Save, AlertCircle, FileText, ShieldCheck, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
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

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await api.get('/documents/my-documents');
        if (res.data.success) setMyCertificates(res.data.documents);
      } catch (e) {
        // non-critical; ignore
      }
    };
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
        setSuccess('Profile updated successfully! Eligibility checks will automatically reflect these updates.');
        await refreshProfile();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Maintain your academic details and household income for precise eligibility matching.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
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
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
      {/* Certificate History Panel */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Certificate History</h2>
        <p className="text-xs text-slate-500 mt-1">
          All documents you have uploaded across your scholarship applications. Upload new certificates through your application page.
        </p>
      </div>

      {myCertificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No certificates uploaded yet. Start an application to upload required documents.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          {myCertificates.map((doc) => {
            const statusColor =
              doc.currentStatus === 'Officer Verified'
                ? 'bg-emerald-100 text-emerald-800'
                : doc.currentStatus === 'Mismatch Detected'
                ? 'bg-amber-100 text-amber-900'
                : doc.currentStatus === 'Correction Required'
                ? 'bg-amber-100 text-amber-800'
                : doc.currentStatus === 'Pre-Verification Passed'
                ? 'bg-blue-100 text-blue-800'
                : doc.currentStatus === 'Manual Review Required'
                ? 'bg-purple-100 text-purple-800'
                : doc.currentStatus === 'Rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-slate-100 text-slate-600';

            const StatusIcon =
              doc.currentStatus === 'Officer Verified'
                ? CheckCircle
                : doc.currentStatus === 'Mismatch Detected' || doc.currentStatus === 'Correction Required'
                ? AlertTriangle
                : doc.currentStatus === 'Pre-Verification Passed'
                ? ShieldCheck
                : Clock;

            const scholarshipName =
              doc.applicationId?.scholarshipId?.name || 'Unknown Scholarship';

            return (
              <div
                key={doc._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{doc.documentType}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {doc.currentStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {doc.originalFileName} • {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      For: <span className="font-medium text-slate-600">{scholarshipName}</span>
                    </p>
                    {doc.validationResults?.hasMismatch && (
                      <div className="mt-1.5 space-y-1">
                        {doc.validationResults.mismatchDetails?.map((m, mi) => (
                          <p key={mi} className="text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 border border-amber-100">
                            ⚠ <strong>{m.field}:</strong> {m.reason}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href={`/api/documents/${doc._id}/file?token=${localStorage.getItem('scholartrack_token') || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
