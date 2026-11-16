import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { api } from '../../api';
import { ShieldCheck, User, MapPin, Clock, Bell, Sparkles } from 'lucide-react';

export const DemoBar: React.FC = () => {
  const { role, isOwnerAuthenticated, logoutOwner, setOwnerModalOpen } = useAuth();
  const { mockMode, setMockMode, refreshLocation } = useLocation();
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  };

  const handleAutoCheckout = async () => {
    try {
      const res = await api.triggerAutoCheckout();
      const count = res.autoCheckedOut?.length || 0;
      showToast(`Midnight Auto Check-out simulated! ${count} staff processed.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleSimulateReminders = async () => {
    try {
      const res = await api.simulateReminders();
      const count = (res.shiftReminders?.length || 0) + (res.breakReminders?.length || 0);
      showToast(`Push reminders dispatched (${count} notifications logged).`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 transition-all select-none">
      {message && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-[#22201C] text-white px-4 py-2 rounded-full text-xs font-medium warm-card flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-[#2F7D4F]" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-[#22201C] text-white px-3 py-1.5 border-b border-[#3D3A34]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs gap-2">
          {/* Left: Role indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#A8A298] uppercase tracking-wider hidden sm:inline">
              Toolbar:
            </span>

            {role === 'owner' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#C0573E] text-white text-xs font-bold">
                <ShieldCheck size={13} />
                <span>Owner Dashboard</span>
                <button
                  onClick={logoutOwner}
                  className="ml-2 text-[10px] underline hover:text-[#FFFDF9] cursor-pointer"
                >
                  Exit to Staff
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#33302A] text-[#ECE7DF] text-xs font-semibold">
                <User size={13} className="text-[#2F7D4F]" />
                <span>Staff App</span>
                <button
                  onClick={() => setOwnerModalOpen(true)}
                  className="ml-2 text-[10px] text-[#E8B44A] underline hover:text-white cursor-pointer"
                >
                  Owner Login
                </button>
              </div>
            )}
          </div>

          {/* Right: Geofence Simulator + Cron shortcuts */}
          <div className="flex items-center gap-2">
            {/* Geo Simulator */}
            <div className="flex items-center bg-[#33302A] p-0.5 rounded-lg border border-[#48443D]">
              <button
                onClick={() => setMockMode('inside')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  mockMode === 'inside'
                    ? 'bg-[#2F7D4F] text-white'
                    : 'text-[#A8A298] hover:text-white'
                }`}
                title="Simulate: Inside Meats & Plants Thane (Shop 21, Hiranandani Estate)"
              >
                <MapPin size={10} />
                <span>At Thane Café (Inside 15m)</span>
              </button>

              <button
                onClick={() => setMockMode('away')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  mockMode === 'away'
                    ? 'bg-[#C0573E] text-white'
                    : 'text-[#A8A298] hover:text-white'
                }`}
                title="Simulate: Away from Meats & Plants Thane (1.3 km away)"
              >
                Away (1.3 km)
              </button>

              <button
                onClick={() => {
                  setMockMode('real');
                  refreshLocation();
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer hidden md:inline-block ${
                  mockMode === 'real'
                    ? 'bg-[#4A7BB7] text-white'
                    : 'text-[#A8A298] hover:text-white'
                }`}
                title="Use real device GPS location"
              >
                Live GPS
              </button>

              <button
                onClick={() => setMockMode('off')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  mockMode === 'off'
                    ? 'bg-[#7A746A] text-white'
                    : 'text-[#A8A298] hover:text-white'
                }`}
                title="Simulate: Location Off / Denied (no GPS permission)"
              >
                Location Off
              </button>
            </div>

            {/* Quick Reset for Trial Testing */}
            <button
              onClick={async () => {
                try {
                  await api.resetTodayRoster();
                  showToast('Reset today! All staff are ready to check in.');
                  setTimeout(() => window.location.reload(), 500);
                } catch (e: any) {
                  showToast(`Error: ${e.message}`);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#33302A] hover:bg-[#48443D] text-[#E8B44A] transition-colors text-[11px] font-bold cursor-pointer"
              title="Reset all shifts for today so check-in can be re-tested"
            >
              <Sparkles size={11} className="text-[#E8B44A]" />
              <span>Reset Shifts</span>
            </button>
            <button
              onClick={handleAutoCheckout}
              className="hidden md:flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#33302A] hover:bg-[#48443D] text-[#ECE7DF] transition-colors text-[11px] cursor-pointer"
              title="Test Midnight Auto-Checkout"
            >
              <Clock size={11} className="text-[#E8B44A]" />
              <span>Midnight Out</span>
            </button>

            <button
              onClick={handleSimulateReminders}
              className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#33302A] hover:bg-[#48443D] text-[#ECE7DF] transition-colors text-[11px] cursor-pointer"
              title="Simulate push reminders"
            >
              <Bell size={11} className="text-[#4A7BB7]" />
              <span>Reminders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
