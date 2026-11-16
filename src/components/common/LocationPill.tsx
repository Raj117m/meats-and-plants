import React, { useState } from 'react';
import { MapPin, Navigation, Smartphone, HelpCircle, X, ChevronDown, Check, Laptop } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';

interface LocationPillProps {
  className?: string;
}

export const LocationPill: React.FC<LocationPillProps> = ({ className = '' }) => {
  const {
    statusPillState,
    statusText,
    refreshLocation,
    showHelpModal,
    setShowHelpModal,
    mockMode,
    setMockMode
  } = useLocation();

  const [showSimMenu, setShowSimMenu] = useState(false);

  const getPillStyles = () => {
    switch (statusPillState) {
      case 'green':
        return 'bg-[#EAF5EE] text-[#23633E] border-[#C6E7D1]';
      case 'red':
        return 'bg-[#FDF0ED] text-[#A8382B] border-[#F8D0C8]';
      case 'grey':
      default:
        return 'bg-[#F3F1EC] text-[#55524B] border-[#E5E1D8]';
    }
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => {
            if (statusPillState === 'grey') {
              refreshLocation().catch(() => setShowHelpModal(true));
            } else {
              setShowSimMenu(!showSimMenu);
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-xs cursor-pointer active:scale-95 ${getPillStyles()}`}
          title="Click to switch location simulation or check GPS"
        >
          <span className="truncate max-w-[280px]">{statusText}</span>
          <ChevronDown size={12} className={`opacity-60 transition-transform ${showSimMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Quick simulator dropdown for browser evaluation */}
        {showSimMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSimMenu(false)} />
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl p-3 z-50 border border-[#ECE7DF] shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-[#ECE7DF]">
                <span className="text-xs font-bold text-[#22201C]">Geofence GPS Simulator</span>
                <button
                  onClick={() => {
                    setShowSimMenu(false);
                    setShowHelpModal(true);
                  }}
                  className="text-[11px] text-[#7A746A] hover:text-[#22201C] flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle size={12} />
                  <span>How-to</span>
                </button>
              </div>

              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => {
                    setMockMode('real');
                    setShowSimMenu(false);
                    refreshLocation();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    mockMode === 'real'
                      ? 'bg-[#EDF4FC] text-[#2A5A8F] font-bold'
                      : 'hover:bg-[#F6F2EA] text-[#22201C]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-[#4A7BB7]" />
                    <div>
                      <div className="font-semibold">Live Device GPS (Real Browser GPS)</div>
                      <div className="text-[10px] text-[#7A746A]">Fetches real GPS from this phone/laptop</div>
                    </div>
                  </div>
                  {mockMode === 'real' && <Check size={14} className="text-[#4A7BB7]" />}
                </button>

                <button
                  onClick={() => {
                    setMockMode('inside');
                    setShowSimMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    mockMode === 'inside'
                      ? 'bg-[#EAF5EE] text-[#23633E] font-bold'
                      : 'hover:bg-[#F6F2EA] text-[#22201C]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📍</span>
                    <div>
                      <div className="font-semibold">At Sparta Building (Inside 30m)</div>
                      <div className="text-[10px] text-[#7A746A]">Within 30m radius · Shift Allowed</div>
                    </div>
                  </div>
                  {mockMode === 'inside' && <Check size={14} className="text-[#2F7D4F]" />}
                </button>

                <button
                  onClick={() => {
                    setMockMode('away');
                    setShowSimMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    mockMode === 'away'
                      ? 'bg-[#FDF0ED] text-[#A8382B] font-bold'
                      : 'hover:bg-[#F6F2EA] text-[#22201C]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🚶</span>
                    <div>
                      <div className="font-semibold">Away from Sparta (1.3 km)</div>
                      <div className="text-[10px] text-[#7A746A]">Outside 30m radius · Entry Locked · End Shift Allowed</div>
                    </div>
                  </div>
                  {mockMode === 'away' && <Check size={14} className="text-[#C0573E]" />}
                </button>

                <button
                  onClick={() => {
                    setMockMode('off');
                    setShowSimMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    mockMode === 'off'
                      ? 'bg-[#F3F1EC] text-[#7A746A] font-bold'
                      : 'hover:bg-[#F6F2EA] text-[#22201C]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🚫</span>
                    <div>
                      <div className="font-semibold">Stop Sharing Location (Location Off)</div>
                      <div className="text-[10px] text-[#7A746A]">Simulates denied location permission</div>
                    </div>
                  </div>
                  {mockMode === 'off' && <Check size={14} className="text-[#7A746A]" />}
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#ECE7DF] text-[10px] text-[#7A746A] leading-relaxed">
                Geofence: 75m radius around café. Bypassed for owner manual punches.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Location Permission Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#ECE7DF] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#EAF5EE] text-[#2F7D4F] flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#22201C]">How to Enable Location</h3>
                  <p className="text-xs text-[#7A746A]">Required to verify you are at the café</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-full hover:bg-[#F6F2EA] text-[#7A746A] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-[#22201C] leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-[#F6F2EA] rounded-xl">
                <div className="font-bold flex items-center gap-1.5 text-[#22201C] mb-1">
                  <Laptop size={14} className="text-[#2F7D4F]" /> Mac / Laptop (Chrome, Safari, Arc)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#55524B]">
                  <li>Look at the address bar next to <strong>localhost:4000</strong></li>
                  <li>Click the <strong>🔒 lock / tune settings icon</strong></li>
                  <li>Set <strong>Location</strong> to <strong>Allow</strong></li>
                  <li>If prompted, refresh the page or click "Try Again" below</li>
                </ol>
              </div>

              <div className="p-3 bg-[#F6F2EA] rounded-xl">
                <div className="font-bold flex items-center gap-1.5 text-[#22201C] mb-1">
                  <Smartphone size={14} className="text-[#2F7D4F]" /> iPhone (iOS / Safari)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#55524B]">
                  <li>Open <strong>Settings</strong> → <strong>Privacy &amp; Security</strong> → <strong>Location Services</strong></li>
                  <li>Ensure Location Services is <strong>ON</strong></li>
                  <li>Tap <strong>Safari Websites</strong> → Select <strong>"While Using the App"</strong> and enable <strong>"Precise Location"</strong></li>
                </ol>
              </div>

              <div className="p-3 bg-[#F6F2EA] rounded-xl">
                <div className="font-bold flex items-center gap-1.5 text-[#22201C] mb-1">
                  <Smartphone size={14} className="text-[#2F7D4F]" /> Android (Chrome)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#55524B]">
                  <li>Tap the <strong>padlock / site settings</strong> icon next to the URL</li>
                  <li>Tap <strong>Permissions</strong> → <strong>Location</strong></li>
                  <li>Select <strong>Allow</strong></li>
                </ol>
              </div>

              <div className="p-2.5 bg-[#EAF5EE] rounded-xl border border-[#C6E7D1] text-[11px] text-[#23633E]">
                <p className="font-bold">💡 Testing without GPS permissions?</p>
                <p className="mt-0.5 text-[#2F7D4F]">
                  You can immediately test by clicking the button below to simulate being inside Sparta Building.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMockMode('inside');
                    setShowHelpModal(false);
                  }}
                  className="mt-2 w-full py-1.5 bg-[#2F7D4F] text-white text-xs font-bold rounded-lg hover:bg-[#276842] transition-colors cursor-pointer"
                >
                  📍 Set Location to Sparta Building (Inside 30m)
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowHelpModal(false);
                  refreshLocation();
                }}
                className="w-full py-2.5 bg-[#22201C] hover:bg-[#3D3A34] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                Try Device GPS Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
