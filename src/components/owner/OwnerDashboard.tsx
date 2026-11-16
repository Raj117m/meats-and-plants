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
  Info
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { employees, refreshEmployees, ownerName, logoutOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'payroll' | 'holidays' | 'staff' | 'settings'>('today');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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
    { id: 'holidays', label: 'Holidays', icon: CalendarDays },
    { id: 'staff', label: 'Staff & Wages', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex flex-col md:flex-row">
      {/* Desktop Slim Left Sidebar */}
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
              className="p-1.5 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] mx-auto cursor-pointer"
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white shadow-2xs'
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
          {/* Rules info trigger */}
          <button
            onClick={() => setRulesOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
            title="View Rules"
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#B42318] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
            title="Exit to staff app"
          >
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Exit to Staff App</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E6E6E2] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Mobile hamburger + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-[#FFFFFF] border border-[#E6E6E2] text-[#0A0A0A] cursor-pointer"
            >
              <Menu size={16} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#0A0A0A]">
                  Meats &amp; Plants
                </h1>
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#F2F2EF] text-[#6E6E6A] border border-[#E6E6E2]">
                  Owner Suite
                </span>
              </div>
              <p className="text-[11px] text-[#6E6E6A] hidden sm:block">
                Sparta Building · 10 Active Staff Members
              </p>
            </div>
          </div>

          {/* Right Toolbar: Rules + Month Nav + Approvals Inbox */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Rules Button */}
            <button
              onClick={() => setRulesOpen(true)}
              className="p-2 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
              title="Attendance Rules & Policies"
            >
              <Info size={16} />
            </button>

            {/* Global Month Navigator (when not in settings) */}
            {activeTab !== 'settings' && activeTab !== 'today' && activeTab !== 'holidays' && (
              <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E6E6E2]">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs font-semibold text-[#0A0A0A] px-1.5 tabular-nums">
                  {monthName.slice(0, 3)} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* Notifications / Approvals Inbox Bell */}
            <button
              onClick={() => setInboxOpen(true)}
              className="relative p-2 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] hover:bg-[#F2F2EF] text-[#0A0A0A] transition-colors cursor-pointer"
              title="Approvals & notifications inbox"
            >
              <Bell size={16} />
              {inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B0235F] text-white text-[9px] font-bold flex items-center justify-center">
                  {inboxCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFFFF] border-b border-[#E6E6E2] px-4 py-3 space-y-1">
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
                    isActive ? 'bg-[#0A0A0A] text-white' : 'text-[#6E6E6A]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={logoutOwner}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-[#B42318] pt-2 border-t border-[#E6E6E2] cursor-pointer"
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
