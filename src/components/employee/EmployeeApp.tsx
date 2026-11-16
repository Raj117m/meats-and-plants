import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { TodayTab } from './TodayTab';
import { MyMonthTab } from './MyMonthTab';
import { LeaveTab } from './LeaveTab';
import { OwnerPasswordModal } from '../common/OwnerPasswordModal';
import { RulesModal } from '../common/RulesModal';
import { Clock, Calendar, CalendarDays, Lock, Info, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'month' | 'leave'>('today');
  const [rulesOpen, setRulesOpen] = useState(false);
  const { currentStaff, setOwnerModalOpen, switchStaff } = useAuth();

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#FAFAF8] flex flex-col justify-between pb-24">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E6E6E2] px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo size="sm" subtitle="Staff Portal" />

          <div className="flex items-center gap-2">
            {/* Rules ⓘ button */}
            <button
              onClick={() => setRulesOpen(true)}
              className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#E6E6E2] text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors"
              title="Attendance & Leave Rules"
            >
              <Info size={14} />
            </button>

            {/* Staff Pill + Switcher */}
            <button
              onClick={switchStaff}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#E6E6E2] hover:border-[#0A0A0A] transition-colors cursor-pointer"
              title="Switch person"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: currentStaff?.avatar_color || '#2E7D4F' }}
              >
                {currentStaff?.name ? currentStaff.name[0] : 'S'}
              </div>
              <span className="text-xs font-semibold text-[#0A0A0A]">
                {currentStaff?.name ? currentStaff.name.split(' ')[0] : 'Staff'}
              </span>
              <Users size={11} className="text-[#6E6E6A]" />
            </button>

            {/* Owner Access Button (Lock Icon) */}
            <button
              onClick={() => setOwnerModalOpen(true)}
              className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#E6E6E2] text-[#6E6E6A] hover:text-[#B0235F] hover:bg-[#F2F2EF] transition-colors"
              title="Owner login"
            >
              <Lock size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 w-full">
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'month' && <MyMonthTab />}
        {activeTab === 'leave' && <LeaveTab />}
      </main>

      {/* Bottom Tab Bar (3 tabs: Today · My Month · Leave) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E6E6E2] py-2 px-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Tab 1: Today */}
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'text-[#0A0A0A] font-semibold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'today' ? 'bg-[#F2F2EF] text-[#B0235F]' : ''}`}>
              <Clock size={18} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Today</span>
          </button>

          {/* Tab 2: My Month */}
          <button
            onClick={() => setActiveTab('month')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'month'
                ? 'text-[#0A0A0A] font-semibold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'month' ? 'bg-[#F2F2EF] text-[#B0235F]' : ''}`}>
              <Calendar size={18} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">My Month</span>
          </button>

          {/* Tab 3: Leave */}
          <button
            onClick={() => setActiveTab('leave')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'leave'
                ? 'text-[#0A0A0A] font-semibold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'leave' ? 'bg-[#F2F2EF] text-[#B0235F]' : ''}`}>
              <CalendarDays size={18} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Leave</span>
          </button>
        </div>
      </nav>

      {/* Owner Password Sheet */}
      <OwnerPasswordModal />

      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
};
