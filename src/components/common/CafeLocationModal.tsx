import React from 'react';
import { CafeLocationPicker } from './CafeLocationPicker';
import { Settings } from '../../types';
import { X, MapPin } from 'lucide-react';

interface CafeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: Settings | null;
  onSaved?: (settings: Settings) => void;
}

export const CafeLocationModal: React.FC<CafeLocationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaved
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-[#ECE7DF] max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EAF5EE] text-[#2F7D4F] flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#22201C]">Set Café Geofence Location</h3>
              <p className="text-xs text-[#7A746A]">Defines where staff are permitted to punch shift actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F6F2EA] text-[#7A746A] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <CafeLocationPicker
          initialLat={settings?.store_lat ?? 19.2584498}
          initialLng={settings?.store_lng ?? 72.977272}
          initialRadius={settings?.geofence_radius ?? 150}
          initialAddress={settings?.store_address ?? 'Shop No. 21, Hiranandani Estate, Thane'}
          onSaved={(newSettings) => {
            if (onSaved) onSaved(newSettings);
          }}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
