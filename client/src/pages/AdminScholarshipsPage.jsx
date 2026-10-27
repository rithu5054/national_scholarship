import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import api from '../services/api';

const AdminScholarshipsPage = () => {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    description: '',
    amount: '',
    minPercentage: 60,
    maxIncome: 250000,
    applicationDeadline: '',
  });

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const res = await api.get('/scholarships');
      if (res.data.success) {
        setScholarships(res.data.scholarships);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        provider: formData.provider,
        description: formData.description,
        amount: Number(formData.amount),
        applicationDeadline: new Date(formData.applicationDeadline),
        eligibilityCriteria: {
          minPercentage: Number(formData.minPercentage),
          maxIncome: Number(formData.maxIncome),
        },
        requiredDocuments: [
          { documentType: 'Income Certificate', isRequired: true },
          { documentType: 'Mark Sheet', isRequired: true },
        ],
      };
      await api.post('/scholarships', payload);
      setCreateModal(false);
      fetchScholarships();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create scheme.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scholarship Management</h1>
          <p className="text-sm text-slate-500 mt-1">Configure funding schemes and eligibility thresholds.</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Scholarship
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3">Scheme Name</th>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Min %</th>
              <th className="px-6 py-3">Max Income</th>
              <th className="px-6 py-3">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {scholarships.map((sch) => (
              <tr key={sch._id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-900">{sch.name}</td>
                <td className="px-6 py-4 text-slate-600">{sch.provider}</td>
                <td className="px-6 py-4 font-bold text-blue-600">₹{sch.amount?.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4">{sch.eligibilityCriteria?.minPercentage}%</td>
                <td className="px-6 py-4">₹{sch.eligibilityCriteria?.maxIncome?.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-slate-500">{new Date(sch.applicationDeadline).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Create New Scholarship Scheme</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scholarship Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Provider Authority</label>
                <input
                  type="text"
                  required
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows="3"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.minPercentage}
                    onChange={(e) => setFormData({ ...formData, minPercentage: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Annual Income (₹)</label>
                  <input
                    type="number"
                    value={formData.maxIncome}
                    onChange={(e) => setFormData({ ...formData, maxIncome: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Publish Scheme
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminScholarshipsPage;
