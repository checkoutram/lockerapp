import { useState } from 'react';
import { X, Settings, Download, Trash2, LogOut, Shield, ChevronRight } from 'lucide-react';
import { exportData, wipeAllData } from '../utils/storage';
import { useApp } from '@/context/AppContext';

interface MenuDrawerProps {
  onClose: () => void;
}

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  const { navigate } = useApp();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vlocker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const handleWipe = async () => {
    await wipeAllData();
    setShowWipeConfirm(false);
    navigate('splash');
  };

  const menuItems = [
    { icon: Settings, label: 'Settings', onClick: () => { onClose(); navigate('settings'); } },
    { icon: Download, label: 'Export Data', onClick: handleExport },
    { icon: Trash2, label: 'Delete All Data', onClick: () => setShowWipeConfirm(true), danger: true },
    { icon: LogOut, label: 'Log Out', onClick: () => { onClose(); navigate('auth'); } },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="w-[280px] bg-[#081321] h-full flex flex-col border-l border-[#1D344D]/30 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-[#1D344D]/30">
          <div className="flex items-center gap-3">
            <img src="/vlocker-icon.png" alt="" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold text-[#F7F5EF]">Vlocker</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-white/5">
            <X className="w-5 h-5 text-[#A6B2C2]" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left active:bg-white/5 transition-colors ${
                item.danger ? 'text-[#E98B8B]' : 'text-[#F7F5EF]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.danger ? 'text-[#E98B8B]' : 'text-[#D6B45C]'}`} />
              <span className="flex-1 text-base">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-[#A6B2C2]/40" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1D344D]/30">
          <div className="flex items-center gap-2 text-xs text-[#A6B2C2]/50">
            <Shield className="w-3.5 h-3.5 text-[#5ED6A5]" />
            <span>Your data stays on your device</span>
          </div>
          <p className="text-[10px] text-[#667487] mt-2">Version 3.0.0</p>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#1D344D]/50">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Delete all data?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">
              This deletes all items, photos, and your PIN. You cannot undo this.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#14263B] text-[#F7F5EF] font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                className="flex-1 py-3 rounded-xl bg-[#E98B8B]/20 text-[#E98B8B] font-medium text-sm border border-[#E98B8B]/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
