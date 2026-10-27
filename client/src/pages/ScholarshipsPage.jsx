import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, Award, BookOpen, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ScholarshipsPage = () => {
  const [scholarships, setScholarships] = useState([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOption, setSortOption] = useState('deadline_asc');
  const [loading, setLoading] = useState(true);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (courseFilter) params.course = courseFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (sortOption) params.sort = sortOption;

      const res = await api.get('/scholarships', { params });
      if (res.data.success) {
        setScholarships(res.data.scholarships);
      }
    } catch (err) {
      console.error('Failed to fetch scholarships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, [sortOption]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchScholarships();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scholarship Opportunities</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore and filter verified state, central, and collegiate funding schemes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scheme title, provider, or keywords..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Course Focus
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="">All Programs & Degrees</option>
              <option value="Engineering">Engineering / B.E. / B.Tech</option>
              <option value="Science">Basic Sciences / B.Sc</option>
              <option value="Technology">Information Technology</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Social Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Sort Results
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="deadline_asc">Application Deadline (Earliest)</option>
              <option value="deadline_desc">Application Deadline (Latest)</option>
              <option value="amount_desc">Award Amount (High to Low)</option>
              <option value="amount_asc">Award Amount (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scholarships List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading available scholarships...</div>
      ) : scholarships.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No scholarships matching your filter criteria were found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {scholarships.map((sch) => (
            <div
              key={sch._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      {sch.provider}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{sch.name}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400">Award Amount</span>
                    <p className="text-lg font-extrabold text-blue-600">₹{sch.amount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600 line-clamp-3 leading-relaxed">{sch.description}</p>

                {/* Eligibility Highlights */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400">Min. Percentage:</span>
                    <p className="font-semibold text-slate-700">{sch.eligibilityCriteria?.minPercentage || 'Any'}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Family Income Limit:</span>
                    <p className="font-semibold text-slate-700">
                      {sch.eligibilityCriteria?.maxIncome ? `Max ₹${sch.eligibilityCriteria.maxIncome.toLocaleString('en-IN')}` : 'No Limit'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Deadline: {new Date(sch.applicationDeadline).toLocaleDateString()}</span>
                </div>
                <Link
                  to={`/scholarships/${sch._id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                >
                  View Details & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScholarshipsPage;
