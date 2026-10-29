import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Eye,
  ArrowLeft,
  RotateCcw,
  Check,
} from 'lucide-react';
import api from '../services/api';

const OfficerVerificationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState({ open: false, type: 'Approved', reason: '' });
  // Correction Modal State
  const [correctionModal, setCorrectionModal] = useState({ open: false, docId: null, docType: '', reason: '' });
  // Mismatch Override Modal State (for verifying docs that have detected mismatches)
  const [overrideModal, setOverrideModal] = useState({ open: false, docId: null, docType: '', mismatches: [], reason: '' });

  const fetchAppData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      if (res.data.success) {
        setApplication(res.data.application);
        setDocuments(res.data.documents);
      }
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, [id]);

  const handleDocumentVerify = async (doc) => {
    // If the document has mismatches, require the officer to explicitly override
    if (doc.validationResults?.hasMismatch) {
      setOverrideModal({
        open: true,
        docId: doc._id,
        docType: doc.documentType,
        mismatches: doc.validationResults.mismatchDetails || [],
        reason: '',
      });
      return;
    }
    // No mismatches — verify directly
    try {
      setActionLoading(true);
      const res = await api.post(`/officer/documents/${doc._id}/review`, {
        action: 'verify',
        notes: 'Document inspected and verified authentic by officer.',
      });
      if (res.data.success) {
        setStatusMessage({ type: 'success', text: 'Document marked verified.' });
        await fetchAppData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Verification failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideVerify = async () => {
    if (!overrideModal.reason || overrideModal.reason.trim().length < 10) {
      alert('Please provide a specific override reason (at least 10 characters).');
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post(`/officer/documents/${overrideModal.docId}/review`, {
        action: 'verify',
        overrideReason: overrideModal.reason,
      });
      if (res.data.success) {
        setOverrideModal({ open: false, docId: null, docType: '', mismatches: [], reason: '' });
        setStatusMessage({ type: 'success', text: `Document verified with override reason recorded.` });
        await fetchAppData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Override verification failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    try {
      if (!correctionModal.reason) {
        alert('Please provide a clear reason for the correction request.');
        return;
      }
      setActionLoading(true);
      const res = await api.post(`/officer/documents/${correctionModal.docId}/review`, {
        action: 'request_correction',
        correctionReason: correctionModal.reason,
      });
      if (res.data.success) {
        setCorrectionModal({ open: false, docId: null, docType: '', reason: '' });
        setStatusMessage({ type: 'warning', text: 'Correction request dispatched to student.' });
        await fetchAppData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordFinalDecision = async () => {
    try {
      if (!decisionModal.reason) {
        alert('Please record an audit reason for your final decision.');
        return;
      }
      setActionLoading(true);
      const res = await api.post(`/officer/applications/${id}/decision`, {
        decision: decisionModal.type,
        reason: decisionModal.reason,
      });
      if (res.data.success) {
        setDecisionModal({ open: false, type: 'Approved', reason: '' });
        setStatusMessage({ type: 'success', text: `Application ${decisionModal.type} recorded.` });
        await fetchAppData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Decision failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading applicant dossier...</div>;
  if (!application) return <div className="p-12 text-center text-slate-500">Application not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/officer/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to workstation queue
      </button>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{application.applicationData?.studentName}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
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
            Application ID: <span className="font-mono font-bold text-slate-700">{application.applicationId}</span> • Scheme: <span className="font-semibold text-blue-600">{application.scholarshipId?.name}</span>
          </p>
        </div>

        {/* Final Decision Action Buttons */}
        {['submitted', 'under_review'].includes(application.status) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDecisionModal({ open: true, type: 'Approved', reason: '' })}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Approve Scholarship
            </button>
            <button
              onClick={() => setDecisionModal({ open: true, type: 'Rejected', reason: '' })}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Reject Application
            </button>
          </div>
        )}
      </div>

      {statusMessage.text && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
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

      {/* Profile & Scheme Match Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
          Applicant Criteria & Claim Comparison
        </h2>

        <div className="grid sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">Claimed Income:</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              ₹{Number(application.applicationData?.annualFamilyIncome || 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">Claimed Academic Score:</span>
            <p className="text-sm font-bold text-slate-900 mt-1">{application.applicationData?.percentageOrCGPA}%</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">Enrolled Program:</span>
            <p className="text-xs font-bold text-slate-900 mt-1">{application.applicationData?.course}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400">Rule Engine Verdict:</span>
            <p
              className={`text-xs font-bold mt-1 ${
                application.eligibilityEvaluation?.isEligible ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {application.eligibilityEvaluation?.isEligible ? 'Eligible' : 'Ineligible'}
            </p>
          </div>
        </div>
      </div>

      {/* Document Review Console */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Submitted Documents & Pre-Verification Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare extracted OCR data, authority cross-checks, and detected mismatches.
          </p>
        </div>

        {/* Unresolved Mismatch Warning Banner */}
        {documents.some((d) => d.validationResults?.hasMismatch && d.currentStatus !== 'Officer Verified') && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">⚠ Unresolved mismatches: </span>
              {documents
                .filter((d) => d.validationResults?.hasMismatch && d.currentStatus !== 'Officer Verified')
                .map((d) => d.documentType)
                .join(', ')}
              {' '}— You must either request a correction from the student or click "Override & Verify" with an explicit reason before approving this application.
            </div>
          </div>
        )}

        <div className="space-y-4">
          {documents.map((doc) => {
            const hasMismatch = doc.validationResults?.hasMismatch;
            const mismatches = doc.validationResults?.mismatchDetails || [];
            const qrResult = doc.validationResults?.qrVerification;

            return (
              <div
                key={doc._id}
                className={`p-5 rounded-2xl border ${
                  doc.currentStatus === 'Officer Verified'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : hasMismatch
                    ? 'bg-amber-50/40 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{doc.documentType}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.currentStatus === 'Officer Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.currentStatus === 'Correction Required'
                            ? 'bg-amber-100 text-amber-800'
                            : hasMismatch
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {doc.currentStatus}
                      </span>
                      {hasMismatch && doc.currentStatus !== 'Officer Verified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          ⚠ Requires Override
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      File: {doc.originalFileName} ({(doc.fileSize / 1024).toFixed(1)} KB)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/documents/${doc._id}/file?token=${localStorage.getItem('scholartrack_token') || ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View File
                    </a>

                    {doc.currentStatus !== 'Officer Verified' && (
                      <>
                        <button
                          onClick={() => handleDocumentVerify(doc)}
                          disabled={actionLoading}
                          className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition ${
                            hasMismatch
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {hasMismatch ? 'Override & Verify' : 'Mark Verified'}
                        </button>
                        <button
                          onClick={() =>
                            setCorrectionModal({
                              open: true,
                              docId: doc._id,
                              docType: doc.documentType,
                              reason: '',
                            })
                          }
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          Request Correction
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Pre-Verification Extractions */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 grid sm:grid-cols-3 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400">Extracted Certificate ID:</span>
                    <p className="font-mono font-bold text-slate-800">
                      {doc.extractedData?.certificateNumber || 'None / Not OCR Detected'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Extracted Name:</span>
                    <p className="font-bold text-slate-800">{doc.extractedData?.studentName || 'Not Detected'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Extracted Value:</span>
                    <p className="font-bold text-slate-800">
                      {doc.extractedData?.incomeAmount
                        ? `₹${doc.extractedData.incomeAmount.toLocaleString('en-IN')}`
                        : doc.extractedData?.marks
                        ? `${doc.extractedData.marks}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Authority Source Result */}
                {qrResult && (
                  <div className="mt-2 text-xs p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center gap-2 text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Registry Check: </strong> {qrResult.status} – {qrResult.details}
                    </span>
                  </div>
                )}

                {/* Mismatch Alert Notice */}
                {hasMismatch && (
                  <div className="mt-2 text-xs p-3 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      Automatic Discrepancy Detected:
                    </div>
                    {mismatches.map((m, mi) => (
                      <p key={mi} className="text-[11px] leading-relaxed">
                        • <strong>{m.field}:</strong> {m.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Correction Request Modal */}
      {correctionModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Request Correction for {correctionModal.docType}
            </h3>
            <p className="text-xs text-slate-500">
              Specify the exact reason so the student can update the form or replace the document.
            </p>
            <textarea
              rows="4"
              value={correctionModal.reason}
              onChange={(e) => setCorrectionModal({ ...correctionModal, reason: e.target.value })}
              placeholder="e.g. Income certificate shows ₹2,50,000 but ₹1,50,000 was entered. Please provide explanation or update your application."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCorrectionModal({ open: false, docId: null, docType: '', reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestCorrection}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mismatch Override Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Override & Verify: {overrideModal.docType}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
              <p className="text-xs font-bold text-red-900">Detected Mismatches (requires acknowledgement):</p>
              {overrideModal.mismatches.map((m, i) => (
                <div key={i} className="text-xs bg-white/80 rounded-lg p-2 border border-red-100">
                  <p className="font-semibold text-red-900">{m.field}</p>
                  <p className="text-red-800 mt-0.5 leading-relaxed">{m.reason}</p>
                  {m.enteredValue && (
                    <p className="text-[11px] text-red-700 mt-1">
                      Application: <strong>{m.enteredValue}</strong> | Extracted: <strong>{m.extractedValue}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Override Justification <span className="text-red-600">*</span> (min 10 characters)
              </label>
              <textarea
                rows="3"
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                placeholder="e.g. Student confirmed in person — data extraction error due to poor scan quality. Physical document visually verified."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">{overrideModal.reason.length} / 10 minimum characters</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModal({ open: false, docId: null, docType: '', mismatches: [], reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideVerify}
                disabled={actionLoading || overrideModal.reason.trim().length < 10}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Confirm Override & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Decision Modal */}
      {decisionModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Final Decision: {decisionModal.type}
            </h3>
            <p className="text-xs text-slate-500">
              This action updates the student application status and records an immutable audit log.
            </p>
            <textarea
              rows="4"
              value={decisionModal.reason}
              onChange={(e) => setDecisionModal({ ...decisionModal, reason: e.target.value })}
              placeholder="Provide verification justification reason..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModal({ open: false, type: 'Approved', reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordFinalDecision}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg ${
                  decisionModal.type === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {decisionModal.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerVerificationPage;
