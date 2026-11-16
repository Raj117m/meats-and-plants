import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

interface NetworkContextType {
  currentSsid: string;
  setCurrentSsid: (ssid: string) => void;
  allowedSsid: string;
  isConnectedToCafeWifi: boolean;
  checkWifiMatch: (ssid: string) => boolean;
  refreshAllowedSsid: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to ABHIGIT 5G as requested
  const [currentSsid, setCurrentSsid] = useState<string>('ABHIGIT 5G');
  const [allowedSsid, setAllowedSsid] = useState<string>('ABHIGIT 5G');

  const refreshAllowedSsid = async () => {
    try {
      const settings = await api.getSettings();
      if (settings?.allowed_ssids) {
        setAllowedSsid(settings.allowed_ssids);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    refreshAllowedSsid();
  }, []);

  const checkWifiMatch = (ssid: string) => {
    if (!ssid) return false;
    const allowedList = allowedSsid.split(',').map(s => s.trim().toUpperCase());
    return allowedList.includes(ssid.trim().toUpperCase());
  };

  const isConnectedToCafeWifi = checkWifiMatch(currentSsid);

  return (
    <NetworkContext.Provider
      value={{
        currentSsid,
        setCurrentSsid,
        allowedSsid,
        isConnectedToCafeWifi,
        checkWifiMatch,
        refreshAllowedSsid
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
