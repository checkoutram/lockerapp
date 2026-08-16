import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, KeyRound, Fingerprint, HardDrive,
  Download, Upload, AlertTriangle, ChevronRight, Check, Eye, EyeOff, LogOut,
  CheckCircle2, Shield, Building2,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useApp } from '@/context/AppContext';
import {
  getSettings, saveSettings, exportFullBackupZip, importFullBackup, importFullBackupZip, clearAllData,
  SecureStore,
} from '@/utils/storage';
import { APP_NAME } from '@/types';

export default function SettingsScreen() {
  const { goBack, navigate, logout, refreshData } = useApp();
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!currentPin || currentPin.length !== 6) {
      setPinError('Enter current 6-digit PIN'); return;
    }
    if (!newPin || newPin.length !== 6) {
      setPinError('New PIN must be exactly 6 digits'); return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match'); return;
    }

    const { comparePin } = await import('@/utils/crypto');
    const valid = await comparePin(currentPin);
    if (!valid) {
      setPinError('Wrong PIN'); return;
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
    let zipBlob: Blob;
    let skippedPhotos = 0;
    try {
      const result = await exportFullBackupZip();
      zipBlob = result.blob;
      skippedPhotos = result.skippedPhotos;
    } catch (err: any) {
      addToast(`Export failed: ${err?.message || 'Could not read data'}`, 'error');
      return;
    }

    if (skippedPhotos > 0) {
      addToast(`${skippedPhotos} photo(s) could not be exported`, 'error');
    }

    const fileName = `vlocker_backup_${new Date().toISOString().split('T')[0]}.zip`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Convert blob to base64 for native Filesystem
        const arrayBuffer = await zipBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        // Write to cache dir
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Get the file URI to share
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

        // Share the actual file
        await Share.share({
          title: `${APP_NAME} Backup`,
          text: `${APP_NAME} backup — ${new Date().toLocaleDateString()}`,
          files: [uriResult.uri],
          dialogTitle: 'Share Backup File',
        });

        // Clean up cache file
        try {
          await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
        } catch {
          // ignore cleanup errors
        }

        addToast('Backup file shared');
      } else {
        // Web: trigger download
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('Backup downloaded');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('user')) {
        return;
      }
      addToast(`Export failed: ${msg || 'Could not save file'}`, 'error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Diagnostic: check file metadata
    if (file.size === 0) {
      addToast('File is 0 bytes. Re-download the backup.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      // Read via FileReader (more reliable on native webview)
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Could not read selected file'));
        reader.readAsArrayBuffer(file);
      });

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        addToast('Read 0 bytes from file. Re-download the backup.', 'error');
        return;
      }

      if (arrayBuffer.byteLength !== file.size) {
        addToast(`Size mismatch: expected ${file.size}, got ${arrayBuffer.byteLength}`, 'error');
        return;
      }

      let result;
      const isZip = file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        // Pass ArrayBuffer directly to JSZip (more reliable than Blob on webview)
        result = await importFullBackupZip(arrayBuffer);
      } else {
        const text = new TextDecoder().decode(arrayBuffer);
        result = await importFullBackup(text);
      }

      if (result.success) {
        addToast(`Imported ${result.stats?.lockers || 0} lockers, ${result.stats?.items || 0} items, ${result.stats?.photos || 0} photos`);
        await refreshData();
      } else {
        addToast(result.error || 'Import failed', 'error');
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to read backup file', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleWipe = async () => {
    await SecureStore.deleteItemAsync('pin');
    await clearAllData();
    addToast('All data wiped');
    setShowWipeConfirm(false);
    setTimeout(() => navigate('setup'), 800);
  };

  const handleLogout = async () => {
    addToast('Logged out successfully');
    await logout();
  };

  return (
    <div className="h-full flex flex-col bg-[#081321]">
      {/* Toasts */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              t.type === 'success' ? 'bg-[#36B37E] text-[#F7F5EF]' : 'bg-[#D66A6A] text-[#F7F5EF]'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header - safe-area aware for edge-to-edge */}
      <div className="flex items-center px-4 pb-3 border-b border-[#1D344D]/50" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}>
        <button onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#D6B45C]" />
        </button>
        <div className="flex-1 flex flex-col items-center pr-8">
          <h1 className="text-lg font-bold text-[#F7F5EF]">
            Settings
          </h1>
          <span className="text-[9px] text-[#D6B45C]/50 tracking-wide">Know what's inside your locker</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* Security */}
        <div className="mb-6">
          <h3 className="text-xs text-[#A6B2C2] uppercase tracking-wider mb-3 px-1">Security</h3>
          <button onClick={() => setShowChangePin(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D6B45C]/15 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#D6B45C]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Change PIN</p>
              <p className="text-xs text-[#A6B2C2]">Change your PIN</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
          <div className="flex items-center gap-4 p-4 rounded-2xl card-vault mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D6B45C]/15 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-[#D6B45C]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#F7F5EF]">Biometric Auth</p>
              <p className="text-xs text-[#A6B2C2]">Fingerprint / Face ID</p>
            </div>
            <button onClick={toggleBiometric}
              className={`w-12 h-7 rounded-full transition-colors relative ${biometricEnabled ? 'bg-[#D6B45C]' : 'bg-[#1D344D]'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${biometricEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-[#E98B8B]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Log Out</p>
              <p className="text-xs text-[#A6B2C2]">Log out and return to login</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
        </div>

        {/* Lockers */}
        <div className="mb-6">
          <h3 className="text-xs text-[#A6B2C2] uppercase tracking-wider mb-3 px-1">Lockers</h3>
          <button onClick={() => navigate('manageLockers')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D6B45C]/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#D6B45C]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Manage Lockers</p>
              <p className="text-xs text-[#A6B2C2]">Add, edit, rename lockers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
        </div>

        {/* Data */}
        <div className="mb-6">
          <h3 className="text-xs text-[#A6B2C2] uppercase tracking-wider mb-3 px-1">Data</h3>
          <button onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#123D32] flex items-center justify-center">
              <Download className="w-5 h-5 text-[#5ED6A5]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Export Data</p>
              <p className="text-xs text-[#A6B2C2]">Export all data with photos (ZIP)</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
            disabled={importing}
          >
            <div className="w-10 h-10 rounded-xl bg-[#0B2447] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[#D6B45C]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Import Data</p>
              <p className="text-xs text-[#A6B2C2]">{importing ? 'Importing...' : 'Restore from backup file'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".zip,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button onClick={() => setShowWipeConfirm(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-[#E98B8B]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#F7F5EF]">Wipe All Data</p>
              <p className="text-xs text-[#A6B2C2]">Delete all data permanently</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#A6B2C2]" />
          </button>
        </div>

        {/* Warning */}
        <div className="mb-6">
          <h3 className="text-xs text-[#E98B8B] uppercase tracking-wider mb-3 px-1">Warning</h3>
          <div className="p-4 rounded-2xl card-vault">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#E98B8B] flex-shrink-0" />
              <p className="text-sm font-medium text-[#F7F5EF]">Data is stored locally</p>
            </div>
            <p className="text-xs text-[#A6B2C2] leading-relaxed">
              All data stays on your device. If you uninstall the app, all data will be deleted. Export to backup.
            </p>
          </div>
        </div>

        {/* App Icon + Tagline */}
        <div className="flex flex-col items-center pt-4 border-t border-[#1D344D] gap-2">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#D6B45C]/20">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-full h-full object-contain" />
          </div>
          <p className="text-[10px] text-[#D6B45C]/50 tracking-wide">Know what's inside your locker</p>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#5ED6A5]/70 bg-emerald-500/5 px-3 py-2 rounded-xl border border-[#36B37E] mt-3">
          <Shield className="w-3 h-3 flex-shrink-0" />
          <span>Your data stays on your device - private and secure</span>
        </div>

        {/* Version */}
        <div className="text-center pt-2 pb-2">
          <p className="text-xs text-[#A6B2C2]">{APP_NAME} v3.0.0</p>
        </div>
      </div>

      {/* Change PIN Dialog */}
      {showChangePin && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-[#101F32] border-t border-[#1D344D] rounded-t-3xl p-6 w-full max-h-[85%] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-4">Change PIN</h3>

            {pinSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full bg-[#123D32] flex items-center justify-center">
                  <Check className="w-7 h-7 text-[#5ED6A5]" />
                </div>
                <p className="text-sm font-medium text-[#5ED6A5]">PIN changed successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pinError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#3A2427] border border-red-500/30 text-[#E98B8B] text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}
                <div className="relative">
                  <label className="text-xs text-[#A6B2C2] mb-1.5 block">Current PIN</label>
                  <input type={showCurrent ? 'text' : 'password'} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter current PIN" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#081321] border border-[#1D344D] text-[#F7F5EF] text-center text-lg tracking-[0.5em] placeholder:text-[#A6B2C2]/30 placeholder:tracking-normal focus:border-[#D6B45C]/50 transition-colors"
                  />
                  <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-[2.1rem] text-[#A6B2C2]">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs text-[#A6B2C2] mb-1.5 block">New PIN</label>
                  <input type={showNew ? 'text' : 'password'} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 digits" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#081321] border border-[#1D344D] text-[#F7F5EF] text-center text-lg tracking-[0.5em] placeholder:text-[#A6B2C2]/30 placeholder:tracking-normal focus:border-[#D6B45C]/50 transition-colors"
                  />
                  <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-[2.1rem] text-[#A6B2C2]">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs text-[#A6B2C2] mb-1.5 block">Confirm New PIN</label>
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Confirm new PIN" maxLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#081321] border border-[#1D344D] text-[#F7F5EF] text-center text-lg tracking-[0.5em] placeholder:text-[#A6B2C2]/30 placeholder:tracking-normal focus:border-[#D6B45C]/50 transition-colors"
                  />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-[2.1rem] text-[#A6B2C2]">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={handleChangePin}
                  className="w-full py-4 rounded-2xl bg-[#D6B45C] text-[#081321] text-sm font-semibold active:scale-[0.98] transition-all"
                >Update PIN</button>
                <button onClick={() => { setShowChangePin(false); setPinError(''); }}
                  className="w-full py-3 rounded-2xl bg-[#1D344D] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform"
                >Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wipe Confirmation Dialog */}
      {showWipeConfirm && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-[#101F32] border-t border-[#1D344D] rounded-t-3xl p-6 w-full">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Delete all data?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">
              This deletes all items, photos, and your PIN. You cannot undo this.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl bg-[#1D344D] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform"
              >Cancel</button>
              <button onClick={handleWipe}
                className="flex-1 py-3.5 rounded-2xl bg-[#D66A6A] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" />Wipe All
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Loading Overlay */}
      {importing && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#D6B45C] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#F7F5EF] font-medium">Restoring backup...</span>
          </div>
        </div>
      )}
    </div>
  );
}
