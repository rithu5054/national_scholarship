import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Award,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ScholarshipDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scholarship, setScholarship] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/scholarships/${id}`);
        if (res.data.success) {
          setScholarship(res.data.scholarship);
        }

        // Check eligibility if student
        if (user && user.role === 'student') {
          const evalRes = await api.post(`/scholarships/${id}/check-eligibility`, {});
          if (evalRes.data.success) {
            setEvaluation(evalRes.data.evaluation);
          }
        }
      } catch (err) {
        console.error('Error fetching scholarship detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, user]);

  const handleStartApplication = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setApplying(true);
      setError('');
      const res = await api.post('/applications/draft', { scholarshipId: id });
      if (res.data.success) {
        navigate(`/student/applications/${res.data.application._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not initiate application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading scheme information...</div>;
  }

  if (!scholarship) {
    return <div className="p-12 text-center text-slate-500">Scholarship scheme not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to listings
      </button>

      {/* Main Details Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {scholarship.provider}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{scholarship.name}</h1>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">{scholarship.description}</p>
          </div>
          <div className="sm:text-right shrink-0 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <span className="text-xs text-slate-500 font-medium">Grant Value</span>
            <p className="text-2xl font-black text-blue-700">₹{scholarship.amount?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Deadline: {new Date(scholarship.applicationDeadline).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Multi-Stage Automated Verification</span>
          </div>
        </div>
      </div>

      {/* Eligibility Evaluation Box (Novel Transparent Engine) */}
      {evaluation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Eligibility Engine Evaluation</h2>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                evaluation.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}
            >
              Result: {evaluation.isEligible ? 'Eligible' : 'Not Eligible'}
            </span>
          </div>

          <div className="space-y-3">
            {evaluation.criteriaResults?.map((res, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                  res.passed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                }`}
              >
                {res.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-900">{res.criterion}</span>
                  <p className="text-slate-600 mt-0.5">{res.message}</p>
                  <p className="text-slate-400 mt-0.5">
                    Your Profile: {res.studentValue} | Required: {res.requirementValue}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!evaluation.isEligible && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="font-bold">Reason for ineligibility: </span>
              {evaluation.reasons?.join(' ')} You may update your student profile if any entered parameter was inaccurate.
            </div>
          )}
        </div>
      )}

      {/* Mandatory Documents Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Required Documents Checklist</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {scholarship.requiredDocuments?.map((doc, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-slate-900">{doc.documentType}</p>
                {doc.description && <p className="text-[11px] text-slate-500">{doc.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Application CTA */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleStartApplication}
          disabled={applying}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
        >
          {applying ? 'Initiating Draft...' : 'Proceed to Application & Document Upload'}
        </button>
      </div>
    </div>
  );
};

export default ScholarshipDetailPage;
