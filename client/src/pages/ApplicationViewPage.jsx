import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        setDocuments(res.data.documents);
        setEditedIncome(res.data.application.applicationData.annualFamilyIncome);
        setEditedMarks(res.data.application.applicationData.percentageOrCGPA);
      }
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const handleFileUpload = async (documentType, file, simulatedMockData = null) => {
    try {
      setUploadingDocType(documentType);
      setStatusMessage({ type: '', text: '' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicationId', id);
      formData.append('documentType', documentType);
      if (simulatedMockData) {
        formData.append('mockSimulatedFields', JSON.stringify(simulatedMockData));
      }

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setStatusMessage({
          type: res.data.document.validationResults.hasMismatch ? 'warning' : 'success',
          text: res.data.message,
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
        setStatusMessage({ type: 'success', text: 'Application data updated. Mismatch checks refreshed.' });
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
        setStatusMessage({ type: 'success', text: 'Application submitted successfully for verification!' });
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

  if (loading) return <div className="p-12 text-center text-slate-500">Loading application records...</div>;
  if (!application) return <div className="p-12 text-center text-slate-500">Application not found.</div>;

  const isEditable = ['draft', 'correction_required'].includes(application.status);
  const requiredDocs = application.scholarshipId?.requiredDocuments || [];

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
          <button
            onClick={handleSubmitApplication}
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            {submitting ? 'Verifying & Submitting...' : 'Submit Application'}
          </button>
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
            { stage: 'Documents Uploaded', active: documents.length > 0, done: documents.length >= requiredDocs.length },
            { stage: 'Pre-Verification', active: documents.some(d => d.validationResults?.hasMismatch !== undefined), done: !documents.some(d => d.validationResults?.hasMismatch) && documents.length > 0 },
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

      {/* CORE NOVELTY: Document Pre-Verification & Mismatch Detection Dashboard */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Document Upload & Automated Pre-Verification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic OCR extraction, QR authority cross-checking, and field mismatch identification.
          </p>
        </div>

        <div className="space-y-4">
          {requiredDocs.map((reqDoc, idx) => {
            const uploaded = documents.find((d) => d.documentType === reqDoc.documentType);
            const hasMismatch = uploaded?.validationResults?.hasMismatch;
            const mismatches = uploaded?.validationResults?.mismatchDetails || [];
            const qrResult = uploaded?.validationResults?.qrVerification;

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border ${
                  hasMismatch
                    ? 'bg-amber-50/40 border-amber-200'
                    : uploaded
                    ? 'bg-emerald-50/30 border-emerald-100'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{reqDoc.documentType}</span>
                      {uploaded ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            hasMismatch
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {uploaded.currentStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                          Not Uploaded
                        </span>
                      )}
                    </div>
                    {reqDoc.description && (
                      <p className="text-xs text-slate-500 mt-1">{reqDoc.description}</p>
                    )}
                  </div>

                  {/* Upload or Replace Input */}
                  {isEditable && (
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploaded ? 'Replace Document' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(reqDoc.documentType, e.target.files[0]);
                            }
                          }}
                        />
                      </label>

                      {/* Fast demo testing simulator button */}
                      <button
                        type="button"
                        onClick={() => {
                          // Create synthetic test file
                          const blob = new Blob(['Sample certificate content for test'], { type: 'text/plain' });
                          const testFile = new File([blob], `${reqDoc.documentType.replace(/\s+/g, '_')}_Test.png`, { type: 'image/png' });

                          let simulatedFields = {};
                          if (reqDoc.documentType.includes('Income')) {
                            // Simulate matching or mismatch income for test
                            simulatedFields = {
                              certificateNumber: 'INC-2025-984321',
                              studentName: application.applicationData.studentName,
                              incomeAmount: 180000,
                            };
                          } else if (reqDoc.documentType.includes('Mark')) {
                            // Simulate an intentional mismatch (e.g. 72% vs entered 84.5%)
                            simulatedFields = {
                              certificateNumber: 'MRK-2025-778899',
                              studentName: application.applicationData.studentName,
                              marks: 72.0,
                            };
                          }

                          handleFileUpload(reqDoc.documentType, testFile, simulatedFields);
                        }}
                        className="px-2 py-1 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      >
                        [Demo Mock Scan]
                      </button>
                    </div>
                  )}
                </div>

                {/* Uploaded File Metadata & OCR Findings */}
                {uploaded && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Original File: <span className="font-medium text-slate-700">{uploaded.originalFileName}</span></span>
                      <a
                        href={`/api/documents/${uploaded._id}/file?token=${localStorage.getItem('scholartrack_token') || ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Document
                      </a>
                    </div>

                    {/* Extracted Details Pill */}
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-100 text-xs grid sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400">Extracted Certificate ID:</span>
                        <p className="font-mono font-semibold text-slate-800">
                          {uploaded.extractedData?.certificateNumber || 'Not Detected'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Extracted Name:</span>
                        <p className="font-semibold text-slate-800">
                          {uploaded.extractedData?.studentName || 'Not Detected'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Extracted Value:</span>
                        <p className="font-semibold text-slate-800">
                          {uploaded.extractedData?.incomeAmount
                            ? `₹${uploaded.extractedData.incomeAmount.toLocaleString('en-IN')}`
                            : uploaded.extractedData?.marks
                            ? `${uploaded.extractedData.marks}%`
                            : 'Standard Document'}
                        </p>
                      </div>
                    </div>

                    {/* QR Authority Status */}
                    {qrResult && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs flex items-center gap-2 text-blue-900">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold">Authority Registry: </span>
                          <span>{qrResult.status} ({qrResult.sourceName})</span>
                        </div>
                      </div>
                    )}

                    {/* DETECTED MISMATCH EXPLANATION (Main Novelty) */}
                    {hasMismatch && (
                      <div className="p-3.5 rounded-xl bg-amber-100/70 border border-amber-300 space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Pre-Verification Mismatch Detected</span>
                        </div>

                        {mismatches.map((m, mIdx) => (
                          <div key={mIdx} className="text-xs text-amber-950 space-y-1">
                            <p className="font-semibold">{m.field} Discrepancy:</p>
                            <p className="text-[11px] text-amber-900 leading-relaxed bg-white/70 p-2 rounded-lg border border-amber-200">
                              {m.reason}
                            </p>
                            <div className="flex gap-4 text-[11px] text-amber-800">
                              <span>Application Value: <strong className="text-amber-950">{m.enteredValue}</strong></span>
                              <span>Extracted Value: <strong className="text-amber-950">{m.extractedValue}</strong></span>
                            </div>
                          </div>
                        ))}

                        <div className="pt-2 text-[11px] text-amber-800 font-medium">
                          💡 <strong>Guided Solution:</strong> Use the "Edit Application Values" button above if you mis-typed the number, or click "Replace Document" to attach the authentic certificate.
                        </div>
                      </div>
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
