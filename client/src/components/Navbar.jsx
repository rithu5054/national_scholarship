import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1">
                  Scholar<span className="text-blue-600">Track</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                  Verification & Tracking Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                </Link>

                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
