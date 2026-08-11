import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { addLocker } from '../utils/storage';

interface AddLockerSheetProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddLockerSheet({ onClose, onSaved }: AddLockerSheetProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addLocker({
      id: crypto.randomUUID(),
      name: name.trim(),
      bankName: bankName.trim() || undefined,
      branch: branch.trim() || undefined,
      location: location.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  };

  const inputClass = "w-full bg-[#050A12] border border-[#1D344D]/50 rounded-xl px-4 py-3.5 text-[#F7F5EF] placeholder:text-[#667487] text-base focus:border-[#D6B45C]/50 focus:outline-none transition-colors";
  const labelClass = "block text-sm text-[#F7F5EF] mb-2";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-[#0B1525] rounded-t-3xl border-t border-[#1D344D]/50 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1D344D]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-xl font-bold text-[#F7F5EF]">Add Locker</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#14263B] flex items-center justify-center active:bg-[#1D344D]"
          >
            <X className="w-4 h-4 text-[#A6B2C2]" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-8 space-y-5">
          {/* Locker Name */}
          <div>
            <label className={labelClass}>
              Locker Name <span className="text-[#E98B8B]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Locker 1"
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Bank Name */}
          <div>
            <label className={labelClass}>Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., HDFC Bank"
              className={inputClass}
            />
          </div>

          {/* Branch */}
          <div>
            <label className={labelClass}>
              Branch <span className="text-[#E98B8B]">*</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g., Main Branch"
              className={inputClass}
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., City, State"
              className={inputClass}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full bg-[#D6B45C] text-[#081321] font-semibold py-4 rounded-xl flex items-center justify-center gap-2 active:bg-[#E6C875] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Save Locker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
