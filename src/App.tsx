import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { NetworkProvider } from './context/NetworkContext';
import { StaffNamePicker } from './components/employee/StaffNamePicker';
import { EmployeeApp } from './components/employee/EmployeeApp';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { DemoBar } from './components/common/DemoBar';

const AppContent: React.FC = () => {
  const { role, currentStaff, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#2F7D4F] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-[#7A746A]">
          Loading Meats &amp; Plants...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#22201C] antialiased">
      {/* Reviewer / Prototype Demo Bar for quick Geofence switching & cron testing */}
      <DemoBar />

      {/* Main App View: Owner Dashboard OR Staff Flow (Name Picker / Employee App) */}
      <div className="pt-8">
        {role === 'owner' ? (
          <OwnerDashboard />
        ) : !currentStaff ? (
          <div className="phone-wrapper-bg">
            <div className="phone-frame">
              <StaffNamePicker />
            </div>
          </div>
        ) : (
          <EmployeeApp />
        )}
      </div>
    </div>
  );
};

export function App() {
  return (
    <LocationProvider>
      <NetworkProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NetworkProvider>
    </LocationProvider>
  );
}

export default App;
