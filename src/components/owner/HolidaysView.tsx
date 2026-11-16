import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Holiday } from '../../types';
import { DEFAULT_HOLIDAYS } from '../../data/defaultStaff';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, List, X, Check } from 'lucide-react';

export const HolidaysView: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [date, setDate] = useState('2026-11-08');
  const [name, setName] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await api.getHolidays(selectedYear);
      setHolidays(data && data.length > 0 ? data : DEFAULT_HOLIDAYS.filter(h => h.date.startsWith(selectedYear)));
    } catch {
      setHolidays(DEFAULT_HOLIDAYS.filter(h => h.date.startsWith(selectedYear)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setDate(`${selectedYear}-11-08`);
    setName('');
    setIsPaid(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (h: Holiday) => {
    setEditingId(h.id);
    setDate(h.date);
    setName(h.name);
    setIsPaid(h.is_paid === 1);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await api.deleteHoliday(id);
      await fetchHolidays();
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name) return;

    setSaving(true);
    try {
      if (editingId) {
        await api.updateHoliday(editingId, { date, name, is_paid: isPaid ? 1 : 0 });
      } else {
        await api.createHoliday({ date, name, is_paid: isPaid ? 1 : 0 });
      }
      setModalOpen(false);
      await fetchHolidays();
    } catch (err: any) {
      alert(`Error saving holiday: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
            Government & Gazetted Holidays
          </h1>
          <p className="text-xs text-[#6E6E6A] mt-0.5">
            Pre-loaded Indian national holidays. No attendance is needed on a holiday and no pay is deducted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex rounded-lg border border-[#E6E6E2] p-0.5 bg-white text-xs">
            <button
              onClick={() => setSelectedYear('2026')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedYear === '2026'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
              }`}
            >
              2026
            </button>
            <button
              onClick={() => setSelectedYear('2027')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedYear === '2027'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
              }`}
            >
              2027
            </button>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-[#E6E6E2] p-0.5 bg-white text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#0A0A0A] text-white'
                  : 'text-[#6E6E6A] hover:text-[#0A0A0A]'
              }`}
              title="Calendar view"
            >
              <CalendarIcon size={14} />
            </button>
          </div>

          {/* Add Holiday button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white hover:bg-[#222222] text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' ? (
        <div className="rounded-xl bg-white border border-[#E6E6E2] overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E6E2] bg-[#FAFAF8] text-[#6E6E6A] section-label">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Holiday Name</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E6E2]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#6E6E6A]">
                    Loading holidays…
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#6E6E6A]">
                    No holidays listed for {selectedYear}. Tap "Add Holiday" to create one.
                  </td>
                </tr>
              ) : (
                holidays.map((h) => (
                  <tr key={h.id || h.date} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0A0A0A] tabular-nums whitespace-nowrap">
                      {h.date}
                    </td>
                    <td className="py-3 px-4 text-[#0A0A0A] font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#B0235F] shrink-0" />
                      <span>{h.name}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-[#B0235F] bg-[#B0235F]/10">
                        {h.is_paid === 1 ? 'Paid Holiday' : 'Optional'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="p-1 rounded text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1 rounded text-[#6E6E6A] hover:text-[#B42318] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Calendar Overview Grid of 12 Months */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const m = monthIdx + 1;
            const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
            const monthHolidays = holidays.filter((h) => h.date.startsWith(monthStr));
            const monthName = new Date(Number(selectedYear), monthIdx, 1).toLocaleString('default', { month: 'long' });
            const totalDays = new Date(Number(selectedYear), m, 0).getDate();

            return (
              <div key={monthStr} className="p-4 rounded-xl bg-white border border-[#E6E6E2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E6E6E2] pb-2">
                  <span className="text-xs font-semibold text-[#0A0A0A]">
                    {monthName} {selectedYear}
                  </span>
                  <span className="text-[11px] text-[#6E6E6A]">
                    {monthHolidays.length} holiday{monthHolidays.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-1.5 min-h-[90px]">
                  {monthHolidays.length === 0 ? (
                    <div className="text-[11px] text-[#6E6E6A] py-6 text-center">
                      No holidays this month
                    </div>
                  ) : (
                    monthHolidays.map((h) => (
                      <div
                        key={h.date}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF8] border border-[#B0235F]/30 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[#B0235F] tabular-nums shrink-0">
                            {h.date.split('-')[2]}
                          </span>
                          <span className="truncate text-[#0A0A0A] font-medium">
                            {h.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#B0235F] uppercase tracking-wider shrink-0 font-semibold">
                          Free
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to Add / Edit Holiday */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl border border-[#E6E6E2] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E6E6E2]">
              <div className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
                {editingId ? 'Edit Holiday' : 'Add Government Holiday'}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="section-label block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#0A0A0A] focus-quartz"
                />
              </div>

              <div>
                <label className="section-label block mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Eid, Republic Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#0A0A0A] focus-quartz"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2]">
                <div>
                  <div className="text-xs font-medium text-[#0A0A0A]">Paid Holiday</div>
                  <div className="text-[11px] text-[#6E6E6A]">No attendance needed, zero deduction</div>
                </div>
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0A0A0A] border-[#E6E6E2] focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6E6E2] text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0A0A0A] text-white hover:bg-[#222222] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
