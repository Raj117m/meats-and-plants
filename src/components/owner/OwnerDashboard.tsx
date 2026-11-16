import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { TodayLiveRoster } from './TodayLiveRoster';
import { AttendanceCalendar } from './AttendanceCalendar';
import { PayrollView } from './PayrollView';
import { StaffManagement } from './StaffManagement';
import { SettingsView } from './SettingsView';
import { UnifiedInboxDrawer } from './UnifiedInboxDrawer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import {
  Clock,
  Calendar,
  Wallet,
  Users,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { employees, refreshEmployees, ownerName, logoutOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'payroll' | 'staff' | 'settings'>('today');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [highlightEmployeeId, setHighlightEmployeeId] = useState<number | null>(null);

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
    { id: 'staff', label: 'Staff & Wages', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#22201C] flex flex-col md:flex-row">
      {/* Desktop Slim Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-white border-r border-[#ECE7DF] p-4 shrink-0 min-h-screen sticky top-0 transition-all duration-200 z-20 ${
          sidebarCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-1 pt-1 flex items-center justify-between">
            {!sidebarCollapsed && <Logo size="sm" subtitle="Owner Suite" />}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] mx-auto cursor-pointer"
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all tap-bounce cursor-pointer ${
                    isActive
                      ? 'bg-[#C0573E] text-white shadow-xs'
                      : 'text-[#7A746A] hover:text-[#22201C] hover:bg-[#F6F2EA]'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={17} className={isActive ? 'text-white' : 'text-[#7A746A]'} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Exit to Staff view */}
        <div className="pt-4 border-t border-[#ECE7DF]">
          <div className={`p-2.5 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-[#22201C] truncate">{ownerName}</p>
                <p className="text-[10px] text-[#7A746A]">Manager</p>
              </div>
            )}

            <button
              onClick={logoutOwner}
              className="p-1.5 rounded-xl bg-white hover:bg-[#ECE7DF] text-[#7A746A] hover:text-[#C0573E] transition-colors shadow-2xs cursor-pointer"
              title="Return to Staff view"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with Greeting, Month Navigation, and Inbox Bell */}
        <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#ECE7DF] px-4 sm:px-8 py-3.5 flex items-center justify-between">
          {/* Greeting */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-xl bg-[#F6F2EA] text-[#22201C] cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#22201C] tracking-tight">
                Good afternoon, {ownerName} ☀️
              </h1>
              <p className="text-[11px] text-[#7A746A] hidden sm:block">
                Meats &amp; Plants · White Oak &amp; Terracotta
              </p>
            </div>
          </div>

          {/* Right: Month Controls & Bell */}
          <div className="flex items-center gap-2.5">
            {/* Global Month Arrows */}
            <div className="flex items-center gap-1 bg-[#F6F2EA] p-1 rounded-2xl border border-[#ECE7DF]">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-xl hover:bg-white text-[#7A746A] hover:text-[#22201C] transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-bold text-[#22201C] px-1.5">
                {monthName} {year}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1 rounded-xl hover:bg-white text-[#7A746A] hover:text-[#22201C] transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>

              {selectedMonth !== '2026-11' && (
                <button
                  onClick={() => setSelectedMonth('2026-11')}
                  className="ml-1 px-2 py-0.5 rounded-lg bg-[#EAF5EE] text-[#23633E] text-[10px] font-bold cursor-pointer"
                >
                  This month
                </button>
              )}
            </div>

            {/* Notifications / Approvals Inbox Bell */}
            <button
              onClick={() => setInboxOpen(true)}
              className="relative p-2 rounded-2xl bg-white border border-[#ECE7DF] warm-card hover:bg-[#F6F2EA] text-[#22201C] transition-colors tap-bounce cursor-pointer"
              title="Approvals & notifications inbox"
            >
              <Bell size={18} />
              {inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#D9534A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-bounce">
                  {inboxCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#ECE7DF] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setHighlightEmployeeId(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isActive ? 'bg-[#C0573E] text-white' : 'text-[#7A746A]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={logoutOwner}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-[#D9534A] pt-2 border-t border-[#ECE7DF] cursor-pointer"
            >
              Exit to Staff View
            </button>
          </div>
        )}

        {/* Main Content View (1200px max width, 32px spacing) */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1200px] w-full mx-auto">
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

      {/* Unified Approvals / Inbox Drawer */}
      <UnifiedInboxDrawer
        isOpen={inboxOpen}
        onClose={() => setInboxOpen(false)}
        onActionComplete={() => {
          fetchInboxCount();
          refreshEmployees();
        }}
      />
    </div>
  );
};
