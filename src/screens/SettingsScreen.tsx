import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, KeyRound, Fingerprint, Package, HardDrive,
  Download, AlertTriangle, ChevronRight, Check, Eye, EyeOff,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore, AsyncStorage, getItems, getStorageUsed, wipeAllData } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME } from '@/types';

export default function SettingsScreen() {
  const { goBack, navigate } = useApp();
  const [itemCount, setItemCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState('0 B');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [pinError, setPinError] = useState('');
  const [showPinValue, setShowPinValue] = useState(false);

  const loadData = useCallback(async () => {
    const items = await getItems();
    setItemCount(items.length);
    const storage = await getStorageUsed();
    setStorageUsed(storage);
    const bio = await AsyncStorage.getItem('biometric');
    setBiometricEnabled(bio === 'true');
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleBiometric = async () => {
    const newVal = !biometricEnabled;
    setBiometricEnabled(newVal);
    await AsyncStorage.setItem('biometric', newVal ? 'true' : 'false');
  };

  const handleExport = async () => {
    const items = await getItems();
    let text = `${APP_NAME.toUpperCase()} - ITEM EXPORT\n`;
    text += '============================\n\n';
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Total Items: ${items.length}\n\n`;

    items.forEach((item, index) => {
      const displayCategory = item.category === 'Other' ? (item.categoryCustom || 'Other') : item.category;
      const displaySubType = item.subType === 'Other (jewellery)' || item.subType === 'Other (document)'
        ? (item.subTypeCustom || item.subType)
        : item.subType;

      text += `--- Item ${index + 1} ---\n`;
      text += `Name: ${item.name}\n`;
      text += `Category: ${displayCategory}${displaySubType ? ' \u2192 ' + displaySubType : ''}\n`;
      if (item.weightAmount) text += `Weight: ${item.weightAmount} ${item.weightUnit}\n`;
      if (item.pieceCount) text += `Pieces: ${item.pieceCount}\n`;
      text += `Description: ${item.description || 'N/A'}\n`;
      text += `Date Added: ${new Date(item.dateAdded).toLocaleDateString()}\n`;
      text += `Photos: ${item.photos.length} photo(s) attached\n`;
      if (item.billPhotos && item.billPhotos.length > 0) text += `Bill/Certificate Photos: ${item.billPhotos.length} attached\n`;
      text += `-----------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${APP_NAME}_export_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handlePinChange = async () => {
    setPinError('');
    if (pinStep === 'current') {
      const storedHash = await SecureStore.getItemAsync('pin');
      const inputHash = await digestStringAsync('SHA-256', currentPin);
      if (inputHash === storedHash) { setPinStep('new'); setCurrentPin(''); }
      else { setPinError('Incorrect current PIN'); setCurrentPin(''); }
    } else if (pinStep === 'new') {
      if (newPin.length < 4) { setPinError('PIN must be at least 4 digits'); return; }
      setPinStep('confirm');
    } else if (pinStep === 'confirm') {
      if (newPin !== confirmNewPin) { setPinError('PINs do not match'); setConfirmNewPin(''); return; }
      const hashedPin = await digestStringAsync('SHA-256', confirmNewPin);
      await SecureStore.setItemAsync('pin', hashedPin);
      setShowChangePin(false); setPinStep('current'); setCurrentPin(''); setNewPin(''); setConfirmNewPin('');
    }
  };

  const handlePinInput = (value: string) => {
    setPinError('');
    if (pinStep === 'current' && currentPin.length < 6) setCurrentPin((p) => p + value);
    else if (pinStep === 'new' && newPin.length < 6) setNewPin((p) => p + value);
    else if (pinStep === 'confirm' && confirmNewPin.length < 6) setConfirmNewPin((p) => p + value);
  };

  const handlePinBackspace = () => {
    if (pinStep === 'current') setCurrentPin((p) => p.slice(0, -1));
    else if (pinStep === 'new') setNewPin((p) => p.slice(0, -1));
    else if (pinStep === 'confirm') setConfirmNewPin((p) => p.slice(0, -1));
  };

  const getCurrentPinValue = () => {
    if (pinStep === 'current') return currentPin;
    if (pinStep === 'new') return newPin;
    return confirmNewPin;
  };

  const handleWipe = async () => {
    await wipeAllData();
    setShowWipeConfirm(false);
    navigate('setup');
  };

  const getPinStepTitle = () => {
    if (pinStep === 'current') return 'Enter Current PIN';
    if (pinStep === 'new') return 'Enter New PIN';
    return 'Confirm New PIN';
  };

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-3 border-b border-[#1A3A5C]/50">
        <button onClick={goBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-white pr-8" style={{ fontFamily: "'Playfair Display', serif" }}>Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-6">
        {/* Security */}
        <div className="mb-6">
          <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 px-1">Security</h3>
          <button onClick={() => setShowChangePin(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center"><KeyRound className="w-5 h-5 text-[#C9A84C]" /></div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Change PIN</p>
              <p className="text-xs text-[#8A94A6]">Update your access PIN</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
          </button>
          <div className="flex items-center gap-4 p-4 rounded-2xl card-vault">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-[#C9A84C]" /></div>
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
        </div>

        {/* Storage */}
        <div className="mb-6">
          <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 px-1">Storage</h3>
          <div className="flex items-center gap-4 p-4 rounded-2xl card-vault mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 flex items-center justify-center"><Package className="w-5 h-5 text-[#3B82F6]" /></div>
            <div className="flex-1"><p className="text-sm font-medium text-white">Items Stored</p><p className="text-xs text-[#8A94A6]">Total items in locker</p></div>
            <span className="text-lg font-bold text-[#C9A84C]">{itemCount}</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl card-vault">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center"><HardDrive className="w-5 h-5 text-[#10B981]" /></div>
            <div className="flex-1"><p className="text-sm font-medium text-white">Storage Used</p><p className="text-xs text-[#8A94A6]">Total photo storage</p></div>
            <span className="text-sm font-medium text-[#10B981]">{storageUsed}</span>
          </div>
        </div>

        {/* Data */}
        <div className="mb-6">
          <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 px-1">Data</h3>
          <button onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-vault mb-3 active:scale-[0.98] transition-transform relative"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center"><Download className="w-5 h-5 text-[#8B5CF6]" /></div>
            <div className="flex-1 text-left"><p className="text-sm font-medium text-white">Export Data</p><p className="text-xs text-[#8A94A6]">Download item summary as text</p></div>
            <ChevronRight className="w-4 h-4 text-[#8A94A6]" />
            {exportSuccess && (
              <div className="absolute inset-0 bg-[#111D2E]/95 rounded-2xl flex items-center justify-center gap-2 animate-fade-in">
                <Check className="w-5 h-5 text-[#10B981]" /><span className="text-sm text-[#10B981] font-medium">Exported!</span>
              </div>
            )}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mb-6">
          <h3 className="text-xs text-red-400 uppercase tracking-wider mb-3 px-1">Danger Zone</h3>
          <button onClick={() => setShowWipeConfirm(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div className="flex-1 text-left"><p className="text-sm font-medium text-red-400">Wipe All Data</p><p className="text-xs text-red-400/60">Delete everything and reset</p></div>
            <ChevronRight className="w-4 h-4 text-red-400/60" />
          </button>
        </div>

        {/* Privacy */}
        <div className="px-1 mb-4">
          <p className="text-xs text-[#8A94A6]/50 text-center leading-relaxed">All data is stored locally on your device. Nothing is uploaded to any server.</p>
        </div>
      </div>

      {/* Change PIN Modal */}
      {showChangePin && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end z-50 animate-fade-in">
          <div className="w-full bg-[#111D2E] border-t border-[#1A3A5C] rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{getPinStepTitle()}</h3>
              <button onClick={() => { setShowChangePin(false); setPinStep('current'); setCurrentPin(''); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}
                className="text-xs text-[#8A94A6] hover:text-white transition-colors"
              >Cancel</button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={i < getCurrentPinValue().length ? 'pin-dot-filled' : 'pin-dot-empty'} />
              ))}
            </div>
            <div className="flex items-center justify-center mb-4">
              <button onClick={() => setShowPinValue(!showPinValue)} className="flex items-center gap-1 text-xs text-[#8A94A6]">
                {showPinValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPinValue ? getCurrentPinValue() : 'Show PIN'}
              </button>
            </div>
            {pinError && <p className="text-xs text-red-400 text-center mb-4">{pinError}</p>}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
              {['1','2','3','4','5','6','7','8','9'].map((num) => (
                <button key={num} onClick={() => handlePinInput(num)}
                  className="w-full aspect-square rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-lg font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
                >{num}</button>
              ))}
              <div className="w-full aspect-square" />
              <button onClick={() => handlePinInput('0')}
                className="w-full aspect-square rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-lg font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
              >0</button>
              <button onClick={handlePinBackspace}
                className="w-full aspect-square rounded-2xl bg-[#0A1628] border border-[#1A3A5C] text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            </div>
            <button onClick={handlePinChange} disabled={getCurrentPinValue().length < 4}
              className={`w-full py-4 rounded-2xl text-sm font-semibold mt-6 transition-all active:scale-[0.98] ${
                getCurrentPinValue().length >= 4 ? 'bg-[#C9A84C] text-[#0A1628]' : 'bg-[#0A1628] text-[#8A94A6] border border-[#1A3A5C]'
              }`}
            >{pinStep === 'confirm' ? 'Update PIN' : 'Continue'}</button>
          </div>
        </div>
      )}

      {/* Wipe Confirmation */}
      {showWipeConfirm && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-[#111D2E] border border-red-500/20 rounded-3xl p-6 w-full max-w-[340px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Wipe All Data</h3>
            <p className="text-sm text-[#8A94A6] mb-2">This will permanently delete all your {APP_NAME} items, photos, and reset your PIN.</p>
            <p className="text-sm text-red-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWipeConfirm(false)} className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform">Cancel</button>
              <button onClick={handleWipe} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform">Wipe All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
