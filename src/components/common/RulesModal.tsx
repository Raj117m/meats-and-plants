import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Settings } from '../../types';
import { DEFAULT_SETTINGS } from '../../data/defaultStaff';
import { X, Clock, AlertCircle, Coffee, Calendar, MapPin, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '12:00 PM';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const shiftStartFormatted = formatTime(settings.shift_start || '12:00');
  const shiftEndFormatted = formatTime(settings.shift_end || '00:00');

  // Calculate late cutoff e.g. 12:15 PM
  const [sh, sm] = (settings.shift_start || '12:00').split(':').map(Number);
  const cutoffTotalMin = sh * 60 + sm + (settings.grace_minutes || 15);
  const cutoffH = Math.floor(cutoffTotalMin / 60) % 24;
  const cutoffM = cutoffTotalMin % 60;
  const cutoffFormatted = formatTime(`${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}`);

  const rules = [
    {
      icon: Clock,
      title: 'Working Hours',
      text: `Your shift runs ${shiftStartFormatted} – ${shiftEndFormatted}. Tap Start Shift when you arrive at the café. If you forget, you're checked out automatically at midnight.`
    },
    {
      icon: AlertCircle,
      title: 'Late Rule',
      text: `You have a ${settings.grace_minutes}-minute grace period. Arriving after ${cutoffFormatted} counts as a half day (half day's pay deducted).`
    },
    {
      icon: Coffee,
      title: '3-Hour Breaks',
      text: `You get one ${Math.round((settings.break_length_minutes || 180) / 60)}-hour break per shift. Start it any time. If you skip it, it's saved to your break bank. Skip ${settings.skipped_breaks_needed || 4} breaks → get 1 extra full-day paid holiday.`
    },
    {
      icon: Calendar,
      title: 'Paid Leaves & Holidays',
      text: `You get ${settings.paid_leaves_per_month} paid leaves each month. From the ${settings.paid_leaves_per_month + 1}th leave onward, one day's pay is deducted per leave. Government holidays are free and never deducted.`
    },
    {
      icon: MapPin,
      title: 'Location Lock',
      text: `Attendance works only when you're at the café (${settings.geofence_radius}m radius around Sparta Building).`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl border border-[#E6E6E2] shadow-xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E6E2]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
              How it works · Café Rules
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Rules Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {rules.map((rule, idx) => {
            const Icon = rule.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E6E6E2]"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E6E2] flex items-center justify-center shrink-0 text-[#0A0A0A]">
                  <Icon size={16} className="text-[#0A0A0A]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0A0A0A]">
                    {rule.title}
                  </div>
                  <div className="text-xs text-[#6E6E6A] mt-0.5 leading-relaxed">
                    {rule.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FAFAF8] border-t border-[#E6E6E2] flex items-center justify-between">
          <span className="text-[11px] text-[#6E6E6A]">
            Rules are configured by the store owner in Settings.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#0A0A0A] text-white hover:bg-[#222222] transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
