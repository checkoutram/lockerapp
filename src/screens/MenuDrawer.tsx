import { useState, useRef } from 'react';
import { X, Settings, Download, Upload, Trash2, LogOut, Shield, ChevronRight, CheckCircle } from 'lucide-react';
import { exportFullBackup, importFullBackup, wipeAllData } from '../utils/storage';
import { useApp } from '@/context/AppContext';

interface MenuDrawerProps {
  onClose: () => void;
}

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  const { navigate } = useApp();
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showImportResult, setShowImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: { lockers: number; items: number; photos: number };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await exportFullBackup();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `vlocker-backup-${dateStr}.vlocker`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importFullBackup(text);

      if (result.success) {
        setShowImportResult({
          success: true,
          message: 'Backup restored successfully!',
          stats: result.stats,
        });
      } else {
        setShowImportResult({
          success: false,
          message: result.error || 'Import failed.',
        });
      }
    } catch {
      setShowImportResult({
        success: false,
        message: 'Could not read the selected file.',
      });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWipe = async () => {
    await wipeAllData();
    setShowWipeConfirm(false);
    navigate('splash');
  };

  const menuItems = [
    { icon: Settings, label: 'Settings', onClick: () => { onClose(); navigate('settings'); } },
    { icon: Download, label: 'Export Backup', onClick: handleExport },
    { icon: Upload, label: 'Import Backup', onClick: handleImportClick },
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

      {/* Hidden file input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".vlocker,.json"
        className="hidden"
        onChange={handleFileSelect}
      />

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

      {/* Import Result Modal */}
      {showImportResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#1D344D]/50 text-center">
            {showImportResult.success ? (
              <>
                <div className="w-14 h-14 rounded-full bg-[#5ED6A5]/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-[#5ED6A5]" />
                </div>
                <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">{showImportResult.message}</h3>
                {showImportResult.stats && (
                  <div className="space-y-1.5 mb-6">
                    <p className="text-sm text-[#A6B2C2]">
                      <span className="text-[#D6B45C] font-semibold">{showImportResult.stats.lockers}</span> lockers
                    </p>
                    <p className="text-sm text-[#A6B2C2]">
                      <span className="text-[#D6B45C] font-semibold">{showImportResult.stats.items}</span> items
                    </p>
                    <p className="text-sm text-[#A6B2C2]">
                      <span className="text-[#D6B45C] font-semibold">{showImportResult.stats.photos}</span> photos
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowImportResult(null);
                    onClose();
                    navigate('lockerList');
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#D6B45C] text-[#081321] font-semibold text-sm"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-[#E98B8B]/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-7 h-7 text-[#E98B8B]" />
                </div>
                <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Import Failed</h3>
                <p className="text-sm text-[#A6B2C2] mb-6">{showImportResult.message}</p>
                <button
                  onClick={() => setShowImportResult(null)}
                  className="w-full py-3.5 rounded-xl bg-[#14263B] text-[#F7F5EF] font-semibold text-sm"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
