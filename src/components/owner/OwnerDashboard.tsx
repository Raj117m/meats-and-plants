import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { TodayLiveRoster } from './TodayLiveRoster';
import { AttendanceCalendar } from './AttendanceCalendar';
import { PayrollView } from './PayrollView';
import { HolidaysView } from './HolidaysView';
import { StaffManagement } from './StaffManagement';
import { SettingsView } from './SettingsView';
import { UnifiedInboxDrawer } from './UnifiedInboxDrawer';
import { RulesModal } from '../common/RulesModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import {
  Clock,
  Calendar,
  Wallet,
  CalendarDays,
  Users,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Info,
  MoreHorizontal,
  X,
  FileCheck2
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { employees, refreshEmployees, ownerName, logoutOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'payroll' | 'holidays' | 'staff' | 'settings'>('today');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [highlightEmployeeId, setHighlightEmployeeId] = useState<number | null>(null);

  // Auto-collapse sidebar on tablet (768px - 1023px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInboxCount = async () => {
    try {
      const inbox = await api.getInbox();
      setInboxCount(inbox.totalCount);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchInboxCount();
    const interval = setInterval(fetchInboxCount, 12000);
    return () => clearInterval(interval);
  }, []);

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthNumStr);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[monthNum - 1];

  const handlePrevMonth = () => {
    if (monthNum === 1) {
      setSelectedMonth(`${year - 1}-12`);
    } else {
      setSelectedMonth(`${year}-${String(monthNum - 1).padStart(2, '0')}`);
    }
  };

  const handleNextMonth = () => {
    if (monthNum === 12) {
      setSelectedMonth(`${year + 1}-01`);
    } else {
      setSelectedMonth(`${year}-${String(monthNum + 1).padStart(2, '0')}`);
    }
  };

  const navItems = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'holidays', label: 'Holidays', icon: CalendarDays },
    { id: 'staff', label: 'Staff & Wages', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex flex-col md:flex-row antialiased">
      {/* 1. Desktop & Tablet Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-[#FFFFFF] border-r border-[#E6E6E2] p-4 shrink-0 min-h-screen sticky top-0 transition-all duration-200 z-20 ${
          sidebarCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-1 pt-1 flex items-center justify-between">
            {!sidebarCollapsed && <Logo size="sm" subtitle="Owner Suite" />}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl glass-btn text-[#6E6E6A] hover:text-[#0A0A0A] mx-auto cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setHighlightEmployeeId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'glass-btn-primary shadow-2xs font-bold'
                      : 'text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF]'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-[#6E6E6A]'} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Rules Modal & Exit */}
        <div className="space-y-2 pt-4 border-t border-[#E6E6E2]">
          <button
            onClick={() => setRulesOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer min-h-[44px]"
            title="Rules & Policies"
          >
            <Info size={15} />
            {!sidebarCollapsed && <span>Rules &amp; Policies</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-[#F2F2EF] border border-[#E6E6E2]">
              <div className="text-xs font-bold text-[#0A0A0A] truncate">
                {ownerName}
              </div>
              <div className="text-[10px] text-[#6E6E6A] flex items-center justify-between">
                <span>Café Owner</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D4F]" />
              </div>
            </div>
          )}

          <button
            onClick={logoutOwner}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#B42318] hover:bg-[#F2F2EF] transition-colors cursor-pointer min-h-[44px]"
            title="Exit to staff app"
          >
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Exit to Staff App</span>}
          </button>
        </div>
      </aside>

      {/* 2. Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Glass Bar (Responsive: Phone + Desktop) */}
        <header className="sticky top-0 z-30 glass-header px-4 sm:px-8 py-3 safe-pt flex items-center justify-between gap-3">
          {/* Left: Brand / Page Title */}
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#0A0A0A] tracking-tight">
                  Meats &amp; Plants
                </h1>
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#F2F2EF] text-[#6E6E6A] border border-[#E6E6E2]">
                  Thane
                </span>
              </div>
              <p className="text-[10px] text-[#6E6E6A] hidden md:block">
                Shop No. 21, Hiranandani Estate · 150m Zone
              </p>
            </div>
          </div>

          {/* Right Toolbar: Month Arrows + Inbox Bell */}
          <div className="flex items-center gap-2">
            {/* Global Month Navigator (‹ Nov 2026 ›) */}
            {activeTab !== 'settings' && activeTab !== 'today' && activeTab !== 'holidays' && (
              <div className="flex items-center gap-0.5 glass-panel p-1 rounded-xl border border-[#E6E6E2]">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[#0A0A0A] px-1 tabular-nums">
                  {monthName.slice(0, 3)} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Rules button (desktop) */}
            <button
              onClick={() => setRulesOpen(true)}
              className="hidden md:flex p-2 rounded-xl glass-btn text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
              title="Attendance Rules & Policies"
            >
              <Info size={16} />
            </button>

            {/* Notifications / Approvals Inbox Bell */}
            <button
              onClick={() => setInboxOpen(true)}
              className="relative p-2 rounded-xl glass-btn text-[#0A0A0A] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Approvals & notifications inbox"
            >
              <Bell size={16} />
              {inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B0235F] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {inboxCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area (Max width 1280px on desktop) */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-[1280px] w-full mx-auto">
          {activeTab === 'today' && <TodayLiveRoster employees={employees} />}
          {activeTab === 'attendance' && (
            <AttendanceCalendar
              employees={employees}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onAttendanceChanged={fetchInboxCount}
              onNavigateToStaff={(id) => {
                setActiveTab('staff');
                setHighlightEmployeeId(id);
              }}
              onNavigateToPayroll={(id) => {
                setActiveTab('payroll');
                if (id) setHighlightEmployeeId(id);
              }}
            />
          )}
          {activeTab === 'payroll' && (
            <PayrollView
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              highlightEmployeeId={highlightEmployeeId}
            />
          )}
          {activeTab === 'holidays' && (
            <HolidaysView />
          )}
          {activeTab === 'staff' && (
            <StaffManagement
              employees={employees}
              onStaffChanged={refreshEmployees}
              highlightEmployeeId={highlightEmployeeId}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView onSettingsSaved={refreshEmployees} />
          )}
        </main>
      </div>

      {/* 3. Phone Glass Bottom Tab Bar (<768px: Today · Attendance · Payroll · Staff · More) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-tab-bar py-1.5 px-2 safe-pb">
        <div className="grid grid-cols-5 gap-1 text-center">
          {/* 1. Today */}
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'today'
                ? 'text-[#0A0A0A] font-bold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'today' ? 'bg-[#0A0A0A] text-white shadow-2xs' : ''}`}>
              <Clock size={17} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Today</span>
          </button>

          {/* 2. Attendance */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'attendance'
                ? 'text-[#0A0A0A] font-bold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'attendance' ? 'bg-[#0A0A0A] text-white shadow-2xs' : ''}`}>
              <Calendar size={17} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Attendance</span>
          </button>

          {/* 3. Payroll */}
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'payroll'
                ? 'text-[#0A0A0A] font-bold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'payroll' ? 'bg-[#0A0A0A] text-white shadow-2xs' : ''}`}>
              <Wallet size={17} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Payroll</span>
          </button>

          {/* 4. Staff */}
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'staff'
                ? 'text-[#0A0A0A] font-bold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'staff' ? 'bg-[#0A0A0A] text-white shadow-2xs' : ''}`}>
              <Users size={17} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Staff</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'holidays' || activeTab === 'settings'
                ? 'text-[#0A0A0A] font-bold'
                : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === 'holidays' || activeTab === 'settings' ? 'bg-[#0A0A0A] text-white shadow-2xs' : ''}`}>
              <MoreHorizontal size={17} />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">More</span>
            {inboxCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#B0235F]" />
            )}
          </button>
        </div>
      </nav>

      {/* 4. Phone "More" Glass Bottom Sheet */}
      {moreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreSheetOpen(false)}
          />

          <div className="relative w-full glass-modal rounded-t-3xl p-5 safe-pb space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-[#E6E6E2] mx-auto mb-1" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E6E6E2]">
              <span className="section-label">More Controls</span>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#F2F2EF] text-[#6E6E6A]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('holidays');
                  setMoreSheetOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl glass-btn text-[#0A0A0A] cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays size={18} className="text-[#B0235F]" />
                  <span>Indian Gazetted Holidays</span>
                </div>
                <span className="text-[11px] text-[#6E6E6A]">2026 / 2027</span>
              </button>

              <button
                onClick={() => {
                  setInboxOpen(true);
                  setMoreSheetOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl glass-btn text-[#0A0A0A] cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 size={18} className="text-[#2E7D4F]" />
                  <span>Approvals &amp; Leave Requests</span>
                </div>
                {inboxCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#B0235F] text-white text-[10px] font-bold">
                    {inboxCount} pending
                  </span>
                ) : (
                  <span className="text-[11px] text-[#6E6E6A]">0 pending</span>
                )}
              </button>

              <button
                onClick={() => {
                  setRulesOpen(true);
                  setMoreSheetOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-btn text-[#0A0A0A] cursor-pointer min-h-[44px]"
              >
                <Info size={18} className="text-[#3B5BA9]" />
                <span>Attendance &amp; Leave Rules</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMoreSheetOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-btn text-[#0A0A0A] cursor-pointer min-h-[44px]"
              >
                <SettingsIcon size={18} className="text-[#6E6E6A]" />
                <span>Settings &amp; Location Lock</span>
              </button>

              <button
                onClick={() => {
                  logoutOwner();
                  setMoreSheetOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-btn text-[#B42318] hover:bg-[#F2F2EF] cursor-pointer min-h-[44px] pt-3 border-t border-[#E6E6E2]"
              >
                <LogOut size={18} />
                <span>Exit to Staff App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Approvals / Inbox Drawer */}
      <UnifiedInboxDrawer
        isOpen={inboxOpen}
        onClose={() => setInboxOpen(false)}
        onActionComplete={() => {
          fetchInboxCount();
          refreshEmployees();
        }}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
};
