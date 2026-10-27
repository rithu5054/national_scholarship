import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Scholar<span className="text-blue-600">Track</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition">
              Log In
            </Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
              Student Registration
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4" />
          Smart Verification & Mismatch Detection
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Your Scholarship Journey, <span className="text-blue-600">Made Transparent</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Find suitable scholarships, check your eligibility, validate your documents, correct application issues, and track every stage of verification in one place.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
          >
            Get Started as Student <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/scholarships"
            className="px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition"
          >
            Explore Available Scholarships
          </Link>
        </div>

        {/* Prototype notice badge */}
        <p className="mt-6 text-xs text-slate-400">
          * Academic prototype demonstrating automated pre-verification and document discrepancy detection.
        </p>
      </section>

      {/* Feature Novelty Highlight */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Automatic Mismatch Detection Before Final Submission
            </h2>
            <p className="mt-3 text-slate-600">
              Eliminating surprise rejections by automatically auditing document data against entered applicant information.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <FileSearch className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Intelligent Extraction</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Extracts certificates, income statements, and mark sheets using OCR and QR code scanning for immediate pre-verification.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Field-by-Field Mismatch Alert</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Identifies discrepancies in income numbers, applicant names, and academic scores before official submission.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Guided In-Place Correction</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Seamlessly adjust mis-typed form inputs or upload clear certificates with full version tracking without restarting from scratch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-12">
          How ScholarTrack Works
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Profile & Criteria', desc: 'Fill your academic & family profile once to automatically check scheme eligibility.' },
            { step: '02', title: 'Upload & Scan', desc: 'Upload required marksheets and income certificates with automatic OCR and QR scanning.' },
            { step: '03', title: 'Pre-Verification', desc: 'Review instant mismatch alerts and make guided corrections before officer review.' },
            { step: '04', title: 'Live Tracking', desc: 'Track step-by-step verification on a transparent timeline until final decision.' },
          ].map((item, idx) => (
            <div key={idx} className="relative p-6 bg-white rounded-2xl border border-slate-200">
              <span className="text-3xl font-extrabold text-blue-600/30">{item.step}</span>
              <h4 className="mt-2 text-base font-bold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            ScholarTrack
          </div>
          <p className="text-xs text-slate-500">
            Smart Scholarship Eligibility, Verification & Tracking Portal – Academic Prototype.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
