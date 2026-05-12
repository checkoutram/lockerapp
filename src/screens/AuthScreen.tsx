import { useState, useEffect, useRef, useCallback } from 'react';
import { Fingerprint, AlertTriangle, RotateCcw, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore, AsyncStorage } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME } from '@/types';

export default function AuthScreen() {
  const { navigate, setAuthenticated } = useApp();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(30);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRef = useRef('');
  const submittingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const justLoggedOutRef = useRef(false);

  const AUTO_SUBMIT_DELAY = 600;

  useEffect(() => {
    AsyncStorage.getItem('biometric').then((val) => {
      setBiometricEnabled(val === 'true');
    });
    AsyncStorage.getItem('just_logged_out').then((val) => {
      if (val === 'true') {
        justLoggedOutRef.current = true;
        AsyncStorage.removeItem('just_logged_out');
      }
    });
  }, []);

  useEffect(() => {
    const checkLockout = async () => {
      const lockoutEnd = await AsyncStorage.getItem('lockout_end');
      if (lockoutEnd) {
        const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000);
        if (remaining > 0) {
          setIsLocked(true);
          setLockoutTime(remaining);
        } else {
          await AsyncStorage.removeItem('lockout_end');
          setAttempts(0);
        }
      }
    };
    checkLockout();
  }, []);

  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      lockoutTimerRef.current = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            AsyncStorage.removeItem('lockout_end');
            if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [isLocked, lockoutTime]);

  const doSubmit = useCallback(async (pinToCheck: string) => {
    if (submittingRef.current) return;
    if (pinToCheck.length < 4) return;
    submittingRef.current = true;

    const storedHash = await SecureStore.getItemAsync('pin');
    const inputHash = await digestStringAsync('SHA-256', pinToCheck);

    if (inputHash === storedHash) {
      setAuthenticated(true);
      await AsyncStorage.removeItem('lockout_end');
      navigate('home');
    } else {
      pinRef.current = '';
      setPin('');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
      setShake(true);
      setTimeout(() => setShake(false), 500);

      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockoutTime(30);
        const lockoutEnd = Date.now() + 30000;
        await AsyncStorage.setItem('lockout_end', lockoutEnd.toString());
      }
    }
    submittingRef.current = false;
  }, [attempts, setAuthenticated, navigate]);

  const scheduleAutoSubmit = useCallback((currentPin: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (currentPin.length >= 4) {
      debounceTimerRef.current = setTimeout(() => {
        doSubmit(currentPin);
      }, AUTO_SUBMIT_DELAY);
    }
  }, [doSubmit]);

  const handlePinInput = useCallback((value: string) => {
    if (isLocked || submittingRef.current) return;
    setError('');

    if (pinRef.current.length < 6) {
      const newPin = pinRef.current + value;
      pinRef.current = newPin;
      setPin(newPin);
      scheduleAutoSubmit(newPin);
    }
  }, [isLocked, scheduleAutoSubmit]);

  const handleBackspace = useCallback(() => {
    if (isLocked || submittingRef.current) return;
    setError('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
    scheduleAutoSubmit(pinRef.current);
  }, [isLocked, scheduleAutoSubmit]);

  const handleBiometric = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => {
      setAuthenticated(true);
      navigate('home');
      submittingRef.current = false;
    }, 800);
  }, [setAuthenticated, navigate]);

  const handleWipeData = useCallback(async () => {
    await SecureStore.deleteItemAsync('pin');
    await AsyncStorage.removeItem('biometric');
    await AsyncStorage.removeItem('items');
    await AsyncStorage.removeItem('lockout_end');
    setShowForgotDialog(false);
    navigate('setup');
  }, [navigate]);

  // Auto-trigger biometric after 1.5s delay, but NOT after logout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (biometricEnabled && !justLoggedOutRef.current && !isLocked && !submittingRef.current) {
        handleBiometric();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [biometricEnabled, isLocked, handleBiometric]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="h-full flex flex-col vault-gradient">
      <div className="flex items-center justify-center pt-8 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <img src="/vlocker-icon.png" alt={APP_NAME} className="w-full h-full object-contain" />
          </div>
          <span className="text-sm text-[#C9A84C] font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            {APP_NAME}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-4 gold-border-glow overflow-hidden">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-16 h-16 object-contain" />
        </div>

        <p className="text-xs text-[#C9A84C]/60 mb-1 tracking-wide font-medium">
          Know What Your Locker Holds.
        </p>

        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Enter PIN
        </h2>
        <p className="text-sm text-[#8A94A6] text-center mb-8">
          Unlock your secure locker
        </p>

        <div className={`flex items-center gap-3 mb-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={i < pin.length ? 'pin-dot-filled' : 'pin-dot-empty'} />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center animate-fade-in">{error}</p>
        )}

        {isLocked ? (
          <div className="flex flex-col items-center gap-4 my-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-lg font-bold text-red-400">
              {Math.floor(lockoutTime / 60)}:{String(lockoutTime % 60).padStart(2, '0')}
            </p>
            <p className="text-sm text-[#8A94A6] text-center">
              Too many failed attempts.<br />Please wait before trying again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
            {keypadNumbers.map((num) => (
              <button key={num} onClick={() => handlePinInput(num)}
                className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
              >{num}</button>
            ))}
            {biometricEnabled ? (
              <button onClick={handleBiometric}
                className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-full aspect-square" />
            )}
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
        )}

        {!isLocked && (
          <button onClick={() => setShowForgotDialog(true)}
            className="text-sm text-[#8A94A6] hover:text-[#C9A84C] transition-colors mt-2"
          >
            Forgot PIN?
          </button>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mt-6">
          <Shield className="w-3 h-3" />
          <span>Your data stays on your device - completely private &amp; secure</span>
        </div>
      </div>

      {showForgotDialog && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-[#111D2E] border border-[#1A3A5C] rounded-3xl p-6 w-full max-w-[340px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Reset PIN</h3>
            </div>
            <p className="text-sm text-[#8A94A6] mb-2">
              This will permanently delete all your locker data including items and photos.
            </p>
            <p className="text-sm text-red-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowForgotDialog(false)}
                className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
              >Cancel</button>
              <button onClick={handleWipeData}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
