import { useState, useRef, useCallback } from 'react';
import { Lock, Fingerprint, ArrowRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore, AsyncStorage } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';

export default function SetupScreen() {
  const { navigate } = useApp();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometric, setBiometric] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRef = useRef('');
  const confirmRef = useRef('');

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handlePinInput = (value: string) => {
    setError('');
    if (step === 'create') {
      if (pinRef.current.length < 6) {
        const newPin = pinRef.current + value;
        pinRef.current = newPin;
        setPin(newPin);
      }
    } else {
      if (confirmRef.current.length < 6) {
        const newConfirm = confirmRef.current + value;
        confirmRef.current = newConfirm;
        setConfirmPin(newConfirm);
        // Auto-submit when confirm PIN reaches the same length as original PIN
        if (newConfirm.length >= 4 && newConfirm.length === pinRef.current.length) {
          setTimeout(() => handleConfirm(newConfirm), 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    if (step === 'create') {
      pinRef.current = pinRef.current.slice(0, -1);
      setPin(pinRef.current);
    } else {
      confirmRef.current = confirmRef.current.slice(0, -1);
      setConfirmPin(confirmRef.current);
    }
  };

  const handleProceed = () => {
    if (step === 'create') {
      if (pinRef.current.length < 4) {
        setError('PIN must be at least 4 digits');
        triggerShake();
        return;
      }
      setStep('confirm');
    }
    // For confirm step, auto-submit handles it
  };

  const handleConfirm = async (confirmValue: string) => {
    if (pinRef.current !== confirmValue) {
      setError('PINs do not match. Please try again.');
      confirmRef.current = '';
      setConfirmPin('');
      triggerShake();
      return;
    }
    // Hash and store PIN
    const hashedPin = await digestStringAsync('SHA-256', confirmValue);
    await SecureStore.setItemAsync('pin', hashedPin);
    await AsyncStorage.setItem('biometric', biometric ? 'true' : 'false');
    navigate('auth');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      confirmRef.current = '';
      setConfirmPin('');
      setError('');
    }
  };

  const currentPin = step === 'create' ? pin : confirmPin;
  const isReady = step === 'create' ? pin.length >= 4 : confirmPin.length >= 4;

  return (
    <div className="h-full flex flex-col vault-gradient">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4">
        {step === 'confirm' && (
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
            <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
          </button>
        )}
        <div className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-8">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-[#C9A84C]" strokeWidth={1.5} />
        </div>

        <h2
          className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {step === 'create' ? 'Create Your PIN' : 'Confirm PIN'}
        </h2>
        <p className="text-sm text-[#8A94A6] text-center mb-8">
          {step === 'create'
            ? 'Set a 4-6 digit PIN to secure your locker'
            : 'Re-enter your PIN to confirm'}
        </p>

        {/* PIN Display */}
        <div className={`flex items-center gap-3 mb-3 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={i < currentPin.length ? 'pin-dot-filled' : 'pin-dot-empty'}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1 text-xs text-[#8A94A6] hover:text-[#C9A84C] transition-colors"
          >
            {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPin ? 'Hide' : 'Show'}
          </button>
          {showPin && (
            <span className="text-sm text-[#C9A84C] font-mono tracking-widest">
              {currentPin}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-4 text-center animate-fade-in">{error}</p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handlePinInput(num)}
              className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleProceed}
            disabled={!isReady || step === 'confirm'}
            className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              isReady && step === 'create'
                ? 'bg-[#C9A84C] text-[#0A1628] active:bg-[#E0C87A]'
                : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
            }`}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Biometric Toggle - only on create step */}
        {step === 'create' && (
          <button
            onClick={() => setBiometric(!biometric)}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all w-full max-w-[280px] ${
              biometric
                ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10'
                : 'border-[#1A3A5C] bg-[#111D2E]'
            }`}
          >
            <Fingerprint className={`w-5 h-5 ${biometric ? 'text-[#C9A84C]' : 'text-[#8A94A6]'}`} />
            <span className={`text-sm flex-1 text-left ${biometric ? 'text-[#C9A84C]' : 'text-[#8A94A6]'}`}>
              Enable Fingerprint / Face ID
            </span>
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                biometric ? 'bg-[#C9A84C]' : 'bg-[#1A3A5C]'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  biometric ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
