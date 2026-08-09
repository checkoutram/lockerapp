import { useState, useEffect, useRef, useCallback } from 'react';
import { Fingerprint, AlertTriangle } from 'lucide-react';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { useApp } from '@/context/AppContext';
import { SecureStore, AsyncStorage, getSettings, getSecretQuestions, clearAllData } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME } from '@/types';

export default function AuthScreen() {
  const { navigate, setAuthenticated } = useApp();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(30);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRef = useRef('');
  const submittingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const justLoggedOutRef = useRef(false);

  // Forgot PIN flow state
  const [forgotStep, setForgotStep] = useState<'none' | 'verifyQuestions' | 'createPin' | 'confirmPin' | 'legacyReset'>('none');
  const [savedQuestions, setSavedQuestions] = useState<{ q1: string; q2: string; q3: string } | null>(null);
  const [verifyAnswers, setVerifyAnswers] = useState(['', '', '']);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const newPinRef = useRef('');
  const confirmNewPinRef = useRef('');

  const AUTO_SUBMIT_DELAY = 600;

  useEffect(() => {
    getSettings().then((settings) => {
      setBiometricEnabled(!!settings.biometric);
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

    if (!Capacitor.isNativePlatform()) {
      setError('Biometric login requires the mobile app. Use your PIN.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) {
        setError('No biometric hardware found on this device. Use your PIN.');
        return;
      }

      submittingRef.current = true;
      setError('');

      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to access your locker',
        title: 'vlocker Biometric Login',
        subtitle: 'Verify your identity',
        description: 'Use your fingerprint or face to unlock',
      });

      setAuthenticated(true);
      navigate('home');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('user')) {
        setError('Biometric authentication cancelled.');
      } else {
        setError('Biometric authentication failed. Use your PIN.');
      }
    } finally {
      submittingRef.current = false;
    }
  }, [setAuthenticated, navigate]);

  // Auto-trigger biometric after 1.5s delay, but NOT after logout
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
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

  // ---- Forgot PIN: Secret Questions Flow ----

  const handleStartForgot = useCallback(async () => {
    setError('');
    const sq = await getSecretQuestions();
    if (sq) {
      setSavedQuestions({ q1: sq.question1, q2: sq.question2, q3: sq.question3 });
      setForgotStep('verifyQuestions');
    } else {
      // Legacy: no secret questions set, show data wipe warning
      setForgotStep('legacyReset');
    }
  }, []);

  const handleVerifyAnswers = useCallback(async () => {
    setError('');
    if (!savedQuestions) return;

    const sq = await getSecretQuestions();
    if (!sq) {
      setError('Security questions not found. Please reinstall the app.');
      return;
    }

    // Hash the entered answers and compare
    const hash1 = await digestStringAsync('SHA-256', verifyAnswers[0].trim().toLowerCase());
    const hash2 = await digestStringAsync('SHA-256', verifyAnswers[1].trim().toLowerCase());
    const hash3 = await digestStringAsync('SHA-256', verifyAnswers[2].trim().toLowerCase());

    if (hash1 === sq.answer1 && hash2 === sq.answer2 && hash3 === sq.answer3) {
      setForgotStep('createPin');
      setVerifyAnswers(['', '', '']);
    } else {
      setError('One or more answers are incorrect. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [verifyAnswers, savedQuestions]);

  const handleNewPinInput = useCallback((value: string) => {
    setError('');
    if (newPinRef.current.length < 6) {
      const newPinVal = newPinRef.current + value;
      newPinRef.current = newPinVal;
      setNewPin(newPinVal);
    }
  }, []);

  const handleNewPinBackspace = useCallback(() => {
    setError('');
    newPinRef.current = newPinRef.current.slice(0, -1);
    setNewPin(newPinRef.current);
  }, []);

  const handleConfirmNewPinInput = useCallback((value: string) => {
    setError('');
    if (confirmNewPinRef.current.length < 6) {
      const newPinVal = confirmNewPinRef.current + value;
      confirmNewPinRef.current = newPinVal;
      setConfirmNewPin(newPinVal);
    }
  }, []);

  const handleConfirmNewPinBackspace = useCallback(() => {
    setError('');
    confirmNewPinRef.current = confirmNewPinRef.current.slice(0, -1);
    setConfirmNewPin(confirmNewPinRef.current);
  }, []);

  // Auto-advance to confirm PIN step
  useEffect(() => {
    if (forgotStep === 'createPin' && newPinRef.current.length >= 4) {
      const timer = setTimeout(() => {
        setForgotStep('confirmPin');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [newPin, forgotStep]);

  // Auto-submit when confirm PIN matches
  useEffect(() => {
    if (forgotStep === 'confirmPin' && confirmNewPinRef.current.length >= 4 && confirmNewPinRef.current === newPinRef.current) {
      handleSaveNewPin();
    }
  }, [confirmNewPin, forgotStep]);

  const handleSaveNewPin = useCallback(async () => {
    if (newPinRef.current !== confirmNewPinRef.current) {
      setError('PINs do not match. Try again.');
      confirmNewPinRef.current = '';
      setConfirmNewPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (newPinRef.current.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    const hash = await digestStringAsync('SHA-256', newPinRef.current);
    await SecureStore.setItemAsync('pin', hash);
    await AsyncStorage.removeItem('lockout_end');

    // Reset state
    setForgotStep('none');
    newPinRef.current = '';
    setNewPin('');
    confirmNewPinRef.current = '';
    setConfirmNewPin('');
    setVerifyAnswers(['', '', '']);

    setAuthenticated(true);
    navigate('home');
  }, [navigate, setAuthenticated]);

  const handleWipeData = useCallback(async () => {
    await clearAllData();
    await SecureStore.deleteItemAsync('pin');
    await AsyncStorage.removeItem('has_setup');
    setForgotStep('none');
    navigate('setup');
  }, [navigate]);

  const handleCancelForgot = useCallback(() => {
    setForgotStep('none');
    setError('');
    setVerifyAnswers(['', '', '']);
    setNewPin('');
    setConfirmNewPin('');
    newPinRef.current = '';
    confirmNewPinRef.current = '';
  }, []);

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const renderPinDots = (value: string) => (
    <div className={`flex items-center gap-3 mb-6 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={i < value.length ? 'pin-dot-filled' : 'pin-dot-empty'} />
      ))}
    </div>
  );

  const renderKeypad = (
    onInput: (v: string) => void,
    onBackspace: () => void,
    showFingerprint: boolean = false
  ) => (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
      {keypadNumbers.map((num) => (
        <button key={num} onClick={() => onInput(num)}
          className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
        >{num}</button>
      ))}
      {showFingerprint && biometricEnabled && Capacitor.isNativePlatform() ? (
        <button onClick={handleBiometric}
          className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
        >
          <Fingerprint className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-full aspect-square" />
      )}
      <button onClick={() => onInput('0')}
        className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-xl font-semibold text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
      >0</button>
      <button onClick={onBackspace}
        className="w-full aspect-square rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white active:bg-[#1A3A5C] active:scale-95 transition-all flex items-center justify-center"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
          <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
        </svg>
      </button>
    </div>
  );

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
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-4 gold-border-glow overflow-hidden">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-16 h-16 object-contain" />
        </div>

        <p className="text-xs text-[#C9A84C]/60 mb-1 tracking-wide font-medium">
          Know What Your Locker Holds.
        </p>

        {forgotStep === 'none' ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Enter PIN
            </h2>
            <p className="text-sm text-[#8A94A6] text-center mb-8">
              Unlock your secure locker
            </p>
          </>
        ) : forgotStep === 'verifyQuestions' ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verify Identity
            </h2>
            <p className="text-sm text-[#8A94A6] text-center mb-6">
              Answer your security questions to reset PIN
            </p>
          </>
        ) : forgotStep === 'createPin' ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Create New PIN
            </h2>
            <p className="text-sm text-[#8A94A6] text-center mb-8">
              Set a new 4-6 digit PIN
            </p>
          </>
        ) : forgotStep === 'confirmPin' ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Confirm New PIN
            </h2>
            <p className="text-sm text-[#8A94A6] text-center mb-8">
              Re-enter your new PIN
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reset PIN
            </h2>
            <p className="text-sm text-[#8A94A6] text-center mb-6">
              No security questions found
            </p>
          </>
        )}

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center animate-fade-in">{error}</p>
        )}

        {forgotStep === 'none' ? (
          <>
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
              <>
                <div className={`flex items-center gap-3 mb-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={i < pin.length ? 'pin-dot-filled' : 'pin-dot-empty'} />
                  ))}
                </div>

                {renderKeypad(handlePinInput, handleBackspace, true)}
              </>
            )}

            {!isLocked && (
              <button onClick={handleStartForgot}
                className="text-sm text-[#8A94A6] hover:text-[#C9A84C] transition-colors mt-2"
              >
                Forgot PIN?
              </button>
            )}
          </>
        ) : forgotStep === 'verifyQuestions' ? (
          <div className="w-full max-w-md space-y-4">
            {savedQuestions && [0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-sm text-[#8A94A6] font-medium">
                  {idx + 1}. {idx === 0 ? savedQuestions.q1 : idx === 1 ? savedQuestions.q2 : savedQuestions.q3}
                </p>
                <input
                  type="password"
                  autoComplete="off"
                  autoCorrect="off"
                  value={verifyAnswers[idx]}
                  onChange={(e) => {
                    const newAnswers = [...verifyAnswers];
                    newAnswers[idx] = e.target.value;
                    setVerifyAnswers(newAnswers);
                    setError('');
                  }}
                  placeholder="Your answer"
                  className="w-full p-3 rounded-xl bg-[#111D2E] border border-[#1A3A5C] text-sm text-white placeholder:text-[#8A94A6]/50 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCancelForgot}
                className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button onClick={handleVerifyAnswers}
                className="flex-1 py-3 rounded-2xl bg-[#C9A84C] text-[#0A1628] text-sm font-medium active:scale-95 transition-transform"
              >
                Verify
              </button>
            </div>
          </div>
        ) : forgotStep === 'createPin' ? (
          <>
            {renderPinDots(newPin)}
            {renderKeypad(handleNewPinInput, handleNewPinBackspace)}
            <button onClick={handleCancelForgot}
              className="text-sm text-[#8A94A6] hover:text-[#C9A84C] transition-colors mt-2"
            >
              Cancel
            </button>
          </>
        ) : forgotStep === 'confirmPin' ? (
          <>
            {renderPinDots(confirmNewPin)}
            {renderKeypad(handleConfirmNewPinInput, handleConfirmNewPinBackspace)}
            <button onClick={handleCancelForgot}
              className="text-sm text-[#8A94A6] hover:text-[#C9A84C] transition-colors mt-2"
            >
              Cancel
            </button>
          </>
        ) : forgotStep === 'legacyReset' ? (
          <div className="w-full max-w-md space-y-4">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-[#8A94A6] mb-2">
                You haven't set up security questions. To reset your PIN, all locker data must be wiped.
              </p>
              <p className="text-sm text-red-400">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancelForgot}
                className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button onClick={handleWipeData}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform"
              >
                Wipe & Reset
              </button>
            </div>
          </div>
        ) : null}

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mt-6">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <span>Your data stays on your device - completely private &amp; secure</span>
        </div>
      </div>
    </div>
  );
}
