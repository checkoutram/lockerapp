import { useState } from 'react';
import { X, Home, Settings, Trash2, LogOut, Shield, ChevronRight, Building2 } from 'lucide-react';
import { wipeAllData } from '../utils/storage';
import { useApp } from '@/context/AppContext';
import { APP_VERSION } from '@/utils/version';

interface MenuDrawerProps {
  onClose: () => void;
}

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  const { navigate } = useApp();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const handleWipe = async () => {
    await wipeAllData();
    setShowWipeConfirm(false);
    navigate('splash');
  };

  const menuItems = [
    { icon: Home, label: 'Home', onClick: () => { onClose(); navigate('lockerList'); } },
    { icon: Settings, label: 'Settings', onClick: () => { onClose(); navigate('settings'); } },
    { icon: Building2, label: 'Manage Lockers', onClick: () => { onClose(); navigate('manageLockers'); } },
    { icon: Trash2, label: 'Delete All Data', onClick: () => setShowWipeConfirm(true), danger: true },
    { icon: LogOut, label: 'Log Out', onClick: () => { onClose(); navigate('auth'); } },
  ];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-[280px] bg-[#0B1525] flex flex-col shadow-2xl border-l border-[#1D344D]/30">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1D344D]/30">
          <span className="text-base font-bold text-[#F7F5EF]">Menu</span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#101F32] flex items-center justify-center text-[#A6B2C2] active:bg-[#1D344D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
                item.danger
                  ? 'text-[#E98B8B] hover:bg-[#E98B8B]/5'
                  : 'text-[#A6B2C2] hover:bg-[#101F32]'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${item.danger ? 'text-[#E98B8B]' : 'text-[#D6B45C]'}`} />
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-[#667487]" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1D344D]/30">
          <div className="flex items-center gap-2 text-xs text-[#A6B2C2]/50">
            <Shield className="w-3.5 h-3.5 text-[#5ED6A5]" />
            <span>Your data stays on your device</span>
          </div>
          <p className="text-[10px] text-[#667487] mt-2">Version {APP_VERSION}</p>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#E98B8B]/30 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E98B8B]/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-[#E98B8B]" />
            </div>
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Delete All Data?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">
              This will permanently delete all lockers, items, and photos. This action cannot be undone.
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
