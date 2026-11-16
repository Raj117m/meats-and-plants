import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Employee } from '../../types';
import { DEFAULT_STAFF } from '../../data/defaultStaff';
import { Logo } from '../common/Logo';
import { Search, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

export const StaffNamePicker: React.FC = () => {
  const { employees, selectStaff, setOwnerModalOpen } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const staffList = employees && employees.length > 0 ? employees : DEFAULT_STAFF;

  const filtered = staffList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedEmp) {
      selectStaff(selectedEmp, rememberMe);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6E6E2]">
        <Logo size="sm" subtitle="Staff Attendance & Shifts" />

        <button
          onClick={() => setOwnerModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#F2F2EF] text-xs font-medium border border-[#E6E6E2] transition-colors"
          title="Owner login"
        >
          <Lock size={12} className="text-[#B0235F]" />
          <span>Owner</span>
        </button>
      </div>

      {!selectedEmp ? (
        <div className="space-y-4">
          <div>
            <span className="section-label">Select Profile</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A0A0A] mt-0.5">
              Who is checking in today?
            </h1>
            <p className="text-xs text-[#6E6E6A] mt-1">
              Tap your name below to view shifts, record punches, or request leaves.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6E6A]" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-xs text-[#0A0A0A] placeholder-[#6E6E6A] focus-quartz transition-colors"
            />
          </div>

          {/* 10 Real Staff Cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {filtered.map((emp) => {
              const firstName = emp.name;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] hover:border-[#0A0A0A] transition-all text-left flex items-center gap-3 cursor-pointer group shadow-2xs"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: emp.avatar_color || '#2E7D4F' }}
                  >
                    {emp.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-[#0A0A0A] truncate group-hover:text-[#B0235F] transition-colors">
                      {firstName}
                    </div>
                    <div className="text-[11px] text-[#6E6E6A] truncate">
                      {emp.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-[#6E6E6A] bg-[#FFFFFF] rounded-xl border border-[#E6E6E2]">
              No team member matching "{search}"
            </div>
          )}
        </div>
      ) : (
        /* Confirmation Screen */
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E6E6E2] text-center space-y-5 shadow-xs">
          <div
            className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: selectedEmp.avatar_color || '#2E7D4F' }}
          >
            {selectedEmp.name[0]}
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#0A0A0A]">
              Welcome, {selectedEmp.name}!
            </h2>
            <p className="text-xs text-[#6E6E6A] mt-1">
              {selectedEmp.role} · Meats &amp; Plants
            </p>
          </div>

          <label className="flex items-center justify-center gap-2 text-xs text-[#0A0A0A] cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#E6E6E2] text-[#0A0A0A] accent-[#0A0A0A] cursor-pointer"
            />
            <span className="font-normal text-[#6E6E6A]">
              Remember me on this browser
            </span>
          </label>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-[#0A0A0A] hover:bg-[#222222] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Today's Shift</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setSelectedEmp(null)}
              className="w-full py-2 text-xs text-[#6E6E6A] hover:text-[#0A0A0A] font-normal cursor-pointer"
            >
              Choose a different staff member
            </button>
          </div>
        </div>
      )}

      {/* Subtle Footer Note */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-[#6E6E6A]">
          Meats &amp; Plants · 10 Active Staff Members
        </p>
      </div>
    </div>
  );
};
