import React, { useState } from 'react';
import { Wifi, WifiOff, Check, ChevronDown, Lock } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

interface NetworkPillProps {
  showSwitcher?: boolean;
  className?: string;
}

export const NetworkPill: React.FC<NetworkPillProps> = ({ showSwitcher = true, className = '' }) => {
  const { currentSsid, setCurrentSsid, allowedSsid, isConnectedToCafeWifi } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);

  const networks = [
    { ssid: 'ABHIGIT 5G', label: 'ABHIGIT 5G (Café Authorized)', valid: true },
    { ssid: 'ABHIGIT 4G', label: 'ABHIGIT 4G (Unauthorized Band)', valid: false },
    { ssid: 'Cellular 5G', label: 'Cellular / Other Network', valid: false }
  ];

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => showSwitcher && setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          isConnectedToCafeWifi
            ? 'bg-[#E8F3EC] text-[#2F7D4F] border border-[#2F7D4F]/20'
            : 'bg-[#FBE9E7] text-[#C8463D] border border-[#C8463D]/20'
        } ${showSwitcher ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-default'}`}
        title={showSwitcher ? 'Click to simulate different Wi-Fi networks' : undefined}
      >
        {isConnectedToCafeWifi ? (
          <>
            <Wifi size={13} className="stroke-[2.5]" />
            <span>Connected · {currentSsid}</span>
            <Check size={13} className="stroke-[2.5] ml-0.5" />
          </>
        ) : (
          <>
            <WifiOff size={13} className="stroke-[2.5]" />
            <span>Not on café Wi-Fi — connect to {allowedSsid}</span>
            <Lock size={12} className="stroke-[2.5] ml-0.5" />
          </>
        )}
        {showSwitcher && <ChevronDown size={11} className={`opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {/* Demo Switcher Dropdown */}
      {isOpen && showSwitcher && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl p-2 z-50 border border-[#ECEAE5] soft-elevated-shadow">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider">
              Wi-Fi Simulator (Browser Demo)
            </div>
            <div className="mt-1 space-y-1">
              {networks.map(net => {
                const isSelected = currentSsid === net.ssid;
                return (
                  <button
                    key={net.ssid}
                    onClick={() => {
                      setCurrentSsid(net.ssid);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? net.valid
                          ? 'bg-[#E8F3EC] text-[#2F7D4F] font-semibold'
                          : 'bg-[#FBE9E7] text-[#C8463D] font-semibold'
                        : 'hover:bg-[#F7F6F3] text-[#1C1C1A]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {net.valid ? (
                        <Wifi size={13} className="text-[#2F7D4F]" />
                      ) : (
                        <WifiOff size={13} className="text-[#C8463D]" />
                      )}
                      <span>{net.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-[#ECEAE5] px-2 text-[10px] text-[#6B6B66] leading-relaxed">
              Enforced by Capacitor native bridge in production app.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
