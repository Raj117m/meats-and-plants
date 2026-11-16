import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Employee } from '../../types';
import { DEFAULT_STAFF } from '../../data/defaultStaff';
import { Logo } from '../common/Logo';
import { Search, UserCheck, ArrowRight, Check, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col justify-between p-4 sm:p-6 max-w-[430px] mx-auto">
      {/* Top Header with Logo and Owner Button */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <Logo size="sm" subtitle="Café Staff Portal" />

        <button
          onClick={() => setOwnerModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F2EA] text-[#7A746A] hover:text-[#22201C] text-xs font-medium border border-[#ECE7DF] transition-colors tap-bounce"
          title="Owner access"
        >
          <Lock size={13} className="text-[#C0573E]" />
          <span>Owner</span>
        </button>
      </div>

      {/* Main Body: Name Selection or Confirmation */}
      <div className="my-auto py-4">
        {!selectedEmp ? (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[#22201C]">
                Who's working today?
              </h1>
              <p className="text-xs text-[#7A746A] mt-1">
                Select your name to see your shifts, breaks, and earnings.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A746A]" />
              <input
                type="text"
                placeholder="Find your name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] text-xs text-[#22201C] focus:outline-none focus:border-[#2F7D4F]"
              />
            </div>

            {/* 10 Friendly Name Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {filtered.map((emp) => {
                const firstName = emp.name.split(' ')[0];
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    className="p-3.5 rounded-[18px] bg-white border border-[#ECE7DF] warm-card-interactive text-left flex items-center gap-3 tap-bounce cursor-pointer group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: emp.avatar_color || '#2F7D4F' }}
                    >
                      {emp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#22201C] truncate group-hover:text-[#2F7D4F] transition-colors">
                        {firstName}
                      </div>
                      <div className="text-[11px] text-[#7A746A] truncate">
                        {emp.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="p-6 rounded-[24px] bg-white border border-[#ECE7DF] warm-card text-center space-y-5 animate-scale-in">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm"
              style={{ backgroundColor: selectedEmp.avatar_color || '#2F7D4F' }}
            >
              {selectedEmp.name[0]}
            </div>

            <div>
              <h2 className="font-heading text-2xl font-bold text-[#22201C]">
                Hi {selectedEmp.name.split(' ')[0]}! 👋
              </h2>
              <p className="text-xs text-[#7A746A] mt-1">
                {selectedEmp.role} · Meats &amp; Plants
              </p>
            </div>

            {/* Remember Me Checkbox */}
            <label className="flex items-center justify-center gap-2 text-xs text-[#22201C] cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#2F7D4F] accent-[#2F7D4F] cursor-pointer"
              />
              <span className="font-medium text-[#7A746A]">
                Remember me on this phone
              </span>
            </label>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-[#2F7D4F] hover:bg-[#276842] transition-all tap-bounce flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Continue to Shift</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => setSelectedEmp(null)}
                className="w-full py-2.5 text-xs text-[#7A746A] hover:text-[#22201C] font-medium"
              >
                Not you? Choose another name
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Bottom Note */}
      <div className="text-center text-[11px] text-[#7A746A] pb-2">
        Meats &amp; Plants · White Oak &amp; Terracotta
      </div>
    </div>
  );
};
