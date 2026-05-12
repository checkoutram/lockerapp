import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, KeyRound, Fingerprint, HardDrive,
  Download, AlertTriangle, ChevronRight, Check, Eye, EyeOff, LogOut,
  CheckCircle2, Shield,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useApp } from '@/context/AppContext';
import {
  getSettings, saveSettings, exportData, deleteAllItems,
  SecureStore, AsyncStorage,
} from '@/utils/storage';
import { APP_NAME } from '@/types';

export default function SettingsScreen() {
  const { goBack, navigate, logout } = useApp();
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    const load = async () => {
      const settings = await getSettings();
      setBiometricEnabled(!!settings.biometric);
    };
    load();
  }, []);

  const toggleBiometric = async () => {
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    await saveSettings({ biometric: next });
    addToast(next ? 'Biometric authentication enabled' : 'Biometric authentication disabled');
  };

  const handleChangePin = async () => {
    setPinError('');
    setPinSuccess(false);

    if (!currentPin || currentPin.length < 4) {
      setPinError('Enter current PIN'); return;
    }
    if (!newPin || newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits'); return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match'); return;
    }

    const { comparePin } = await import('@/utils/crypto');
    const valid = await comparePin(currentPin);
    if (!valid) {
      setPinError('Current PIN is incorrect'); return;
    }

    const { hashPin } = await import('@/utils/crypto');
    const hash = await hashPin(newPin);
    await SecureStore.setItemAsync('pin', hash);
    setPinSuccess(true);
    addToast('PIN changed successfully');
    setTimeout(() => {
      setShowChangePin(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinSuccess(false);
    }, 1500);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const fileName = `vlocker_export_${new Date().toISOString().split('T')[0]}.json`;

      // Write to Downloads directory using native Filesystem
      await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });

      // Share the file
      await Share.share({
        title: `${APP_NAME} Export`,
        text: `${APP_NAME} data export - ${new Date().toLocaleDateString()}`,
        files: [], // Filesystem write handles the save
      });

      addToast(`Data exported to Downloads/${fileName}`);
    } catch (err) {
      // Fallback: try to share as text
      try {
        const data = await exportData();
        await Share.share({
          title: `${APP_NAME} Export`,
          text: data,
          dialogTitle: 'Export Locker Data',
        });
        addToast('Data shared successfully');
      } catch {
        addToast('Export failed', 'error');
      }
    }
  };

  const handleWipe = async () => {
    await deleteAllItems();
    await SecureStore.deleteItemAsync('pin');
    await AsyncStorage.removeItem('biometric');
    addToast('All data wiped');
    setShowWipeConfirm(false);
    setTimeout(() => navigate('setup'), 800);
  };

  const handleLogout = async () => {
    addToast('Logged out successfully');
    await logout();
  };

  return (
    <div className="h-full flex flex-col bg-[#0A1628]">
      {/* Toasts */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-3 border-b border-[#1A3A5C]/50">
        <button onClick={goBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
        </button>
        <div className="flex-1 flex flex-col items-center pr-8">
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Settings
          </h1>
          <span className="text-[9px] text-[#C9A84C]/50 tracking-wide">Know What Your Locker Holds.</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-8">
        {/* Security */}
        <div className="mb-6">
          <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 px-1">Security</h3>
          <button onClick={() => setShowChangePin(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Change PIN</p>
              <p className="text-xs text-[#8A94A6]">Update your 4-6 digit PIN</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
          </button>
          <div className="flex items-center gap-4 p-4 rounded-2xl card-vault mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Biometric Auth</p>
              <p className="text-xs text-[#8A94A6]">Fingerprint / Face ID</p>
            </div>
            <button onClick={toggleBiometric}
              className={`w-12 h-7 rounded-full transition-colors relative ${biometricEnabled ? 'bg-[#C9A84C]' : 'bg-[#1A3A5C]'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${biometricEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Log Out</p>
              <p className="text-xs text-[#8A94A6]">End session and return to login</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
          </button>
        </div>

        {/* Data */}
        <div className="mb-6">
          <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 px-1">Data</h3>
          <button onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Export Data</p>
              <p className="text-xs text-[#8A94A6]">Save items as JSON</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
          </button>
          <button onClick={() => setShowWipeConfirm(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Wipe All Data</p>
              <p className="text-xs text-[#8A94A6]">Delete everything permanently</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
          </button>
        </div>

        {/* Warning */}
        <div className="mb-6">
          <h3 className="text-xs text-red-400 uppercase tracking-wider mb-3 px-1">Warning</h3>
          <div className="p-4 rounded-2xl card-vault">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm font-medium text-white">Data is stored locally</p>
            </div>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              All data is stored on your device. Uninstalling the app will delete everything. Use Export to backup.
            </p>
          </div>
        </div>

        {/* App Icon + Tagline */}
        <div className="flex flex-col items-center pt-4 border-t border-[#1A3A5C] gap-2">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#C9A84C]/20">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-full h-full object-contain" />
          </div>
          <p className="text-[10px] text-[#C9A84C]/50 tracking-wide">Know What Your Locker Holds.</p>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70 bg-emerald-500/5 px-3 py-2 rounded-xl border border-emerald-500/10 mt-3">
          <Shield className="w-3 h-3 flex-shrink-0" />
          <span>All data resides on your mobile - completely safe &amp; private</span>
        </div>

        {/* Version */}
        <div className="text-center pt-2 pb-2">
          <p className="text-xs text-[#8A94A6]">{APP_NAME} v2.2.2</p>
        </div>
      </div>

      {/* Change PIN Dialog */}
      {showChangePin && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-[#111D2E] border-t border-[#1A3A5C] rounded-t-3xl p-6 w-full max-h-[85%] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Change PIN</h3>

            {pinSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-emerald-400">PIN changed successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pinError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}
                <div className="relative">
                  <label className="text-xs text-[#8A94A6] mb-1.5 block">Current PIN</label>
                  <input type={showCurrent ? 'text' : 'password'} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter current PIN" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-white text-center text-lg tracking-[0.5em] placeholder:text-[#8A94A6]/30 placeholder:tracking-normal focus:border-[#C9A84C]/50 transition-colors"
                  />
                  <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-[2.1rem] text-[#8A94A6]">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs text-[#8A94A6] mb-1.5 block">New PIN</label>
                  <input type={showNew ? 'text' : 'password'} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="4-6 digits" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-white text-center text-lg tracking-[0.5em] placeholder:text-[#8A94A6]/30 placeholder:tracking-normal focus:border-[#C9A84C]/50 transition-colors"
                  />
                  <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-[2.1rem] text-[#8A94A6]">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs text-[#8A94A6] mb-1.5 block">Confirm New PIN</label>
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Confirm new PIN" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-white text-center text-lg tracking-[0.5em] placeholder:text-[#8A94A6]/30 placeholder:tracking-normal focus:border-[#C9A84C]/50 transition-colors"
                  />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-[2.1rem] text-[#8A94A6]">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={handleChangePin}
                  className="w-full py-4 rounded-2xl bg-[#C9A84C] text-[#0A1628] text-sm font-semibold active:scale-[0.98] transition-all"
                >Update PIN</button>
                <button onClick={() => { setShowChangePin(false); setPinError(''); }}
                  className="w-full py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
                >Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wipe Confirmation Dialog */}
      {showWipeConfirm && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-[#111D2E] border-t border-[#1A3A5C] rounded-t-3xl p-6 w-full">
            <h3 className="text-lg font-bold text-white mb-2">Wipe All Data?</h3>
            <p className="text-sm text-[#8A94A6] mb-6">
              This will permanently delete all items, photos, and your PIN. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
              >Cancel</button>
              <button onClick={handleWipe}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" />Wipe All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
