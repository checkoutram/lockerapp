import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME } from '@/types';

export default function SetupScreen() {
  const { navigate, setAuthenticated } = useApp();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [createPin, setCreatePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const createRef = useRef('');
  const confirmRef = useRef('');

  const handlePinInput = useCallback((value: string) => {
    setError('');
    if (step === 'create') {
      if (createRef.current.length < 6) {
        const newPin = createRef.current + value;
        createRef.current = newPin;
        setCreatePin(newPin);
      }
    } else {
      if (confirmRef.current.length < 6) {
        const newPin = confirmRef.current + value;
        confirmRef.current = newPin;
        setConfirmPin(newPin);
      }
    }
  }, [step]);

  const handleBackspace = useCallback(() => {
    setError('');
    if (step === 'create') {
      createRef.current = createRef.current.slice(0, -1);
      setCreatePin(createRef.current);
    } else {
      confirmRef.current = confirmRef.current.slice(0, -1);
      setConfirmPin(confirmRef.current);
    }
  }, [step]);

  const handleNext = useCallback(async () => {
    if (step === 'create') {
      if (createRef.current.length < 4) {
        setError('PIN must be at least 4 digits');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      setStep('confirm');
      setCreatePin('');
      setConfirmPin('');
      confirmRef.current = '';
      return;
    }

    if (confirmRef.current !== createRef.current) {
      setError('PINs do not match. Try again.');
      confirmRef.current = '';
      setConfirmPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const hash = await digestStringAsync('SHA-256', createRef.current);
    await SecureStore.setItemAsync('pin', hash);

    setFadeOut(true);
    setTimeout(() => {
      setAuthenticated(true);
      navigate('home');
    }, 600);
  }, [step, navigate, setAuthenticated]);

  useEffect(() => {
    if (step === 'confirm' && confirmRef.current.length >= 4 && confirmRef.current.length === createRef.current.length) {
      handleNext();
    }
  }, [confirmPin, step, handleNext]);

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="h-full flex flex-col items-center justify-center vault-gradient relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#C9A84C] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-[#1A3A5C] blur-[80px]" />
      </div>

      <div className={`relative z-10 flex flex-col items-center px-6 transition-all duration-500 ${fadeOut ? 'opacity-0 scale-95' : 'opacity-100'}`}>
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-5 gold-border-glow overflow-hidden">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-16 h-16 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          {step === 'create' ? 'Secure Your Locker' : 'Confirm PIN'}
        </h2>
        <p className="text-sm text-[#C9A84C]/70 mb-1 font-medium tracking-wide">
          Know What Your Locker Holds.
        </p>
        <p className="text-sm text-[#8A94A6] mb-8 text-center">
          {step === 'create' ? 'Create a 4-6 digit PIN to protect your items' : 'Re-enter your PIN to confirm'}
        </p>

        {/* PIN dots */}
        <div className={`flex items-center gap-3 mb-6 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={i < (step === 'create' ? createPin.length : confirmPin.length) ? 'pin-dot-filled' : 'pin-dot-empty'} />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center animate-fade-in">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-8">
          {keypadNumbers.map((num) => (
            <button key={num} onClick={() => handlePinInput(num)}
              className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
            >{num}</button>
          ))}
          <button onClick={handleNext}
            className="w-full aspect-square rounded-2xl bg-[#C9A84C] border border-[#C9A84C] text-[#0A1628] active:bg-[#B8983F] active:scale-95 transition-all flex items-center justify-center"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <button onClick={() => handlePinInput('0')}
            className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
          >0</button>
          <button onClick={handleBackspace}
            className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mb-4">
          <Shield className="w-3 h-3" />
          <span>Your data stays on your device - completely private &amp; secure</span>
        </div>
      </div>
    </div>
  );
}
