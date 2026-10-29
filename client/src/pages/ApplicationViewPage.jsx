import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  ArrowLeft,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ApplicationViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Guided Correction State for form fields
  const [isEditingField, setIsEditingField] = useState(false);
  const [editedIncome, setEditedIncome] = useState('');
  const [editedMarks, setEditedMarks] = useState('');

  const fetchApplicationData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      if (res.data.success) {
        setApplication(res.data.application);
        setDocuments(res.data.documents || []);
        setEditedIncome(res.data.application?.applicationData?.annualFamilyIncome ?? '');
        setEditedMarks(res.data.application?.applicationData?.percentageOrCGPA ?? '');
      }
    } catch (err) {
      console.error('Failed to load application:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load application details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const handleFileUpload = async (documentType, file) => {
    try {
      setUploadingDocType(documentType);
      setStatusMessage({ type: '', text: '' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicationId', id);
      formData.append('documentType', documentType);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setStatusMessage({
          type: res.data.status === 'MATCHED' ? 'success' : 'error',
          text: res.data.message || (res.data.status === 'MATCHED' ? `${documentType}: MATCHED.` : `${documentType} Mismatch.`),
        });
        await fetchApplicationData();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Document upload failed.',
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleUpdateApplicationData = async () => {
    try {
      const res = await api.put(`/applications/${id}`, {
        applicationData: {
          annualFamilyIncome: Number(editedIncome),
          percentageOrCGPA: Number(editedMarks),
        },
      });
      if (res.data.success) {
        setIsEditingField(false);
        setStatusMessage({ type: 'success', text: 'Application data updated.' });
        await fetchApplicationData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setSubmitting(true);
      setStatusMessage({ type: '', text: '' });
      const res = await api.post(`/applications/${id}/submit`);
      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: res.data.message || 'Application submitted successfully!',
        });
        await fetchApplicationData();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Application submission failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevalidate = async (docId) => {
    try {
      setStatusMessage({ type: '', text: '' });
      const res = await api.post(`/documents/${docId}/revalidate`);
      if (res.data.success) {
        setStatusMessage({
          type: res.data.status === 'MATCHED' ? 'success' : 'error',
          text: res.data.message || `Verification completed: ${res.data.status}`,
        });
        await fetchApplicationData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Re-validation failed.' });
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading application records...</div>;
  if (!application) return <div className="p-12 text-center text-slate-500">Application not found.</div>;

  const isEditable = ['draft', 'correction_required'].includes(application.status);

  // Helper to find documents in application
  const getAppDoc = (type) => {
    const isIncome = type.toLowerCase().includes('income');
    const isMark = type.toLowerCase().includes('mark');
    return (documents || []).find((d) =>
      d && (
        d.documentType === type ||
        (isIncome && d.documentType?.toLowerCase().includes('income')) ||
        (isMark && d.documentType?.toLowerCase().includes('mark'))
      )
    );
  };

  const appCertSlots = [
    {
      type: 'Income Certificate',
      title: 'Income Certificate',
      description: 'Upload the same Income Certificate that is saved in your profile for hash verification.',
    },
    {
      type: 'Academic Marksheet',
      title: 'Academic Marksheet',
      description: 'Upload the same Academic Marksheet that is saved in your profile for hash verification.',
    },
  ];

  const incomeDoc = getAppDoc('Income Certificate');
  const marksDoc = getAppDoc('Academic Marksheet');

  const incomeMatched = incomeDoc?.currentStatus === 'MATCHED';
  const marksMatched = marksDoc?.currentStatus === 'MATCHED';
  const bothMatched = incomeMatched && marksMatched;

  const isEligible = application.eligibilityEvaluation?.isEligible !== false;
  const canSubmit = bothMatched && isEligible;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/student/applications')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Applications
      </button>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{application.scholarshipId?.name}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                application.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : application.status === 'correction_required'
                  ? 'bg-amber-100 text-amber-800'
                  : application.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {application.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Application ID: <span className="font-mono font-bold text-slate-700">{application.applicationId}</span> • Current Stage: <span className="font-semibold text-blue-600">{application.currentStage}</span>
          </p>
        </div>

        {isEditable && (
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs space-y-1 text-right">
              {appCertSlots.map((slot, i) => {
                const doc = getAppDoc(slot.type);
                const isMatched = doc?.currentStatus === 'MATCHED';
                const isMismatch = doc?.currentStatus === 'MISMATCH';
                return (
                  <div key={i} className="flex items-center gap-1.5 justify-end">
                    {isMatched ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : isMismatch ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={
                        isMatched
                          ? 'text-emerald-700 font-medium'
                          : isMismatch
                          ? 'text-red-700 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {slot.title}
                      {isMatched && ' — MATCHED'}
                      {isMismatch && ' — MISMATCH'}
                      {!doc && ' — Not uploaded'}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleSubmitApplication}
              disabled={submitting || !canSubmit}
              title={!canSubmit ? 'Both documents must show MATCHED and eligibility must be met' : ''}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verifying & Submitting...' : 'Submit Application'}
            </button>
          </div>
        )}
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusMessage.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
          {statusMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Application Timeline (Progress Indicator) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider text-slate-400">
          Verification Progress Timeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { stage: 'Draft & Profile', active: true, done: true },
            { stage: 'Eligibility Checked', active: true, done: !!application.eligibilityEvaluation?.isEligible },
            { stage: 'Documents Uploaded', active: documents.length > 0, done: documents.length >= appCertSlots.length },
            { stage: 'Pre-Verification', active: documents.length > 0, done: bothMatched },
            { stage: 'Officer Verification', active: application.status !== 'draft', done: ['approved', 'rejected'].includes(application.status) },
          ].map((st, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-xs ${
                st.done
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : st.active
                  ? 'bg-blue-50/50 border-blue-200 text-blue-900 font-semibold'
                  : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {st.done ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span className="text-[11px] font-bold">Stage 0{i + 1}</span>
              </div>
              <p className="truncate">{st.stage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CERTIFICATE VERIFICATION ALERTS */}
      {isEditable && (
        <div className="space-y-3">
          {bothMatched && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Certificate Verification Successful. Income Certificate and Academic Marksheet match your profile documents. You can submit your application.
              </span>
            </div>
          )}

          {incomeDoc && incomeDoc.currentStatus === 'MISMATCH' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-semibold">
                  {incomeDoc.validationResults?.message || 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.'}
                </span>
              </div>
              <Link
                to="/student/profile"
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded-lg text-xs transition shrink-0"
              >
                Go to My Profile
              </Link>
            </div>
          )}

          {marksDoc && marksDoc.currentStatus === 'MISMATCH' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-semibold">
                  {marksDoc.validationResults?.message || 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.'}
                </span>
              </div>
              <Link
                to="/student/profile"
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded-lg text-xs transition shrink-0"
              >
                Go to My Profile
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Student Application Form Data (with guided correction capability) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Application Information</h2>
          {isEditable && (
            <button
              onClick={() => setIsEditingField(!isEditingField)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {isEditingField ? 'Cancel' : 'Edit Application Values'}
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Applicant Name</span>
            <p className="font-semibold text-slate-800">{application.applicationData?.studentName}</p>
          </div>
          <div>
            <span className="text-slate-400">Course & Institution</span>
            <p className="font-semibold text-slate-800">
              {application.applicationData?.course} ({application.applicationData?.institution})
            </p>
          </div>
          <div>
            <span className="text-slate-400">Category & Gender</span>
            <p className="font-semibold text-slate-800">
              {application.applicationData?.category} • {application.applicationData?.gender}
            </p>
          </div>

          <div>
            <span className="text-slate-400">Annual Family Income</span>
            {isEditingField ? (
              <input
                type="number"
                value={editedIncome}
                onChange={(e) => setEditedIncome(e.target.value)}
                className="w-full mt-1 p-1.5 border border-slate-200 rounded-lg text-xs"
              />
            ) : (
              <p className="font-bold text-slate-900">
                ₹{Number(application.applicationData?.annualFamilyIncome || 0).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div>
            <span className="text-slate-400">Academic Marks / CGPA</span>
            {isEditingField ? (
              <input
                type="number"
                step="0.1"
                value={editedMarks}
                onChange={(e) => setEditedMarks(e.target.value)}
                className="w-full mt-1 p-1.5 border border-slate-200 rounded-lg text-xs"
              />
            ) : (
              <p className="font-bold text-slate-900">{application.applicationData?.percentageOrCGPA}%</p>
            )}
          </div>
        </div>

        {isEditingField && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleUpdateApplicationData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              Save & Recalculate
            </button>
          </div>
        )}
      </div>

      {/* Certificate Upload & Profile Hash Verification Dashboard */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Certificate Upload & Profile Hash Verification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually upload your Income Certificate and Academic Marksheet. The backend strictly verifies that each document's SHA-256 byte hash matches the corresponding document saved in your profile.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {appCertSlots.map((slot, idx) => {
            const uploaded = getAppDoc(slot.type);
            const isMatched = uploaded?.currentStatus === 'MATCHED';
            const isMismatch = uploaded?.currentStatus === 'MISMATCH';

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  isMatched
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isMismatch
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-sm text-slate-900">{slot.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isMatched
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isMismatch
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {uploaded ? uploaded.currentStatus : 'Not Uploaded'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{slot.description}</p>

                  {/* Uploaded File Details */}
                  {uploaded && (
                    <div className="space-y-2 text-xs bg-white/80 p-3 rounded-xl border border-slate-200/80 mb-3">
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">File:</span>
                        <span className="font-medium truncate max-w-[180px]">{uploaded.originalFileName}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Uploaded:</span>
                        <span>{uploaded.uploadedAt ? new Date(uploaded.uploadedAt).toLocaleDateString() : 'Recently'}</span>
                      </div>

                      {/* Hash Matching Status */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isMatched ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-emerald-700 font-semibold text-[11px]">SHA-256 Hash Matched Profile</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="text-red-700 font-semibold text-[11px]">SHA-256 Hash Mismatch</span>
                            </>
                          )}
                        </div>
                        <a
                          href={`/api/documents/${uploaded._id}/file?token=${localStorage.getItem('scholartrack_token') || ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Mismatch Alert Box inside card */}
                  {isMismatch && (
                    <div className="p-3 rounded-xl bg-red-100/70 border border-red-300 text-xs text-red-900 mb-3 space-y-1">
                      <p className="font-bold text-red-950">Mismatch Detected:</p>
                      <p className="text-[11px] leading-relaxed">
                        {uploaded.validationResults?.message || (slot.type.includes('Income') ? 'Income Certificate Mismatch. Please upload the same Income Certificate saved in your profile.' : 'Academic Marksheet Mismatch. Please upload the same Academic Marksheet saved in your profile.')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload or Replace Input & Re-verify Button */}
                {isEditable && (
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                    <label className="cursor-pointer px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocType === slot.type ? 'Uploading...' : uploaded ? 'Replace Document' : 'Upload Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={uploadingDocType === slot.type}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(slot.type, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {uploaded && (
                      <button
                        type="button"
                        onClick={() => handleRevalidate(uploaded._id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Verify Against Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApplicationViewPage;
