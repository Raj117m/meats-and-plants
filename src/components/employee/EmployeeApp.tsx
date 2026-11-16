import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { TodayTab } from './TodayTab';
import { MyMonthTab } from './MyMonthTab';
import { LeaveTab } from './LeaveTab';
import { OwnerPasswordModal } from '../common/OwnerPasswordModal';
import { Clock, Calendar, CalendarDays, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'month' | 'leave'>('today');
  const { currentStaff, setOwnerModalOpen } = useAuth();

  return (
    <div className="phone-wrapper-bg">
      <div className="phone-frame flex flex-col justify-between pt-3 pb-20">
        {/* Top Mobile Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#ECE7DF] px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="sm" subtitle="Staff Portal" />

            <div className="flex items-center gap-2">
              {/* Staff Avatar */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F6F2EA] border border-[#ECE7DF]">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: currentStaff?.avatar_color || '#2F7D4F' }}
                >
                  {currentStaff?.name ? currentStaff.name[0] : 'S'}
                </div>
                <span className="text-xs font-bold text-[#22201C]">
                  {currentStaff?.name ? currentStaff.name.split(' ')[0] : 'Staff'}
                </span>
              </div>

              {/* Owner Access Button (Lock Icon) */}
              <button
                onClick={() => setOwnerModalOpen(true)}
                className="p-2 rounded-full hover:bg-[#F6F2EA] text-[#7A746A] hover:text-[#C0573E] border border-[#ECE7DF] transition-colors tap-bounce"
                title="Owner login"
              >
                <Lock size={14} className="stroke-[2.2]" />
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
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white/95 backdrop-blur-md border-t border-[#ECE7DF] py-2 px-6">
          <div className="grid grid-cols-3 gap-1 text-center">
            {/* Tab 1: Today */}
            <button
              onClick={() => setActiveTab('today')}
              className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all tap-bounce cursor-pointer ${
                activeTab === 'today'
                  ? 'text-[#C0573E] font-bold'
                  : 'text-[#7A746A] hover:text-[#22201C]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'today' ? 'bg-[#F9ECE8]' : ''}`}>
                <Clock size={19} className="stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">Today</span>
            </button>

            {/* Tab 2: My Month */}
            <button
              onClick={() => setActiveTab('month')}
              className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all tap-bounce cursor-pointer ${
                activeTab === 'month'
                  ? 'text-[#C0573E] font-bold'
                  : 'text-[#7A746A] hover:text-[#22201C]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'month' ? 'bg-[#F9ECE8]' : ''}`}>
                <Calendar size={19} className="stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">My Month</span>
            </button>

            {/* Tab 3: Leave */}
            <button
              onClick={() => setActiveTab('leave')}
              className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all tap-bounce cursor-pointer ${
                activeTab === 'leave'
                  ? 'text-[#C0573E] font-bold'
                  : 'text-[#7A746A] hover:text-[#22201C]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${activeTab === 'leave' ? 'bg-[#F9ECE8]' : ''}`}>
                <CalendarDays size={19} className="stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">Leave</span>
            </button>
          </div>
        </nav>

        {/* Owner Password Sheet */}
        <OwnerPasswordModal />
      </div>
    </div>
  );
};
