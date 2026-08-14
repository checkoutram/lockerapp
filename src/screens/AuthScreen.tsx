import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore, AsyncStorage, getSecretQuestions, clearAllData } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME } from '@/types';

export default function AuthScreen() {
  const { navigate, setAuthenticated } = useApp();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(30);
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
    AsyncStorage.getItem('just_logged_out').then((val) => {
      if (val === 'true') {
        justLoggedOutRef.current = true;
        AsyncStorage.removeItem('just_logged_out');
      }
    });
    // Redirect to setup if no PIN exists
    SecureStore.getItemAsync('pin').then((storedPin) => {
      if (!storedPin) {
        navigate('setup');
      }
    });
  }, [navigate]);

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
    if (pinToCheck.length !== 6) return;
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
    if (currentPin.length === 6) {
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

  // Biometric auth removed — native plugin requires APK compilation
  // Will be re-enabled when building via GitHub Actions with full Android toolchain

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
      setError('Answer incorrect. Try again.');
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
    if (forgotStep === 'createPin' && newPinRef.current.length === 6) {
      const timer = setTimeout(() => {
        setForgotStep('confirmPin');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [newPin, forgotStep]);

  // Auto-submit when confirm PIN matches
  useEffect(() => {
    if (forgotStep === 'confirmPin' && confirmNewPinRef.current.length === 6 && confirmNewPinRef.current === newPinRef.current) {
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
    if (newPinRef.current.length !== 6) {
      setError('PIN must be exactly 6 digits');
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
    <div className={`flex items-center gap-4 mb-8 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-200 ${
            i < value.length
              ? 'bg-[#D6B45C] shadow-[0_0_8px_rgba(214,180,92,0.5)]'
              : 'bg-transparent border-2 border-[#D6B45C]/40'
          }`}
        />
      ))}
    </div>
  );

  const renderKeypad = (
    onInput: (v: string) => void,
    onBackspace: () => void
  ) => (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[300px] mb-6">
      {keypadNumbers.map((num) => (
        <button key={num} onClick={() => onInput(num)}
          className="w-[72px] h-[72px] mx-auto rounded-full bg-[#101F32] text-2xl font-medium text-[#F7F5EF] active:bg-[#1D344D] active:scale-95 transition-all flex items-center justify-center shadow-sm"
        >{num}</button>
      ))}
      {/* Fingerprint button hidden — native plugin not in APK */}
      <div className="w-[72px] h-[72px]" />
      <button onClick={() => onInput('0')}
        className="w-[72px] h-[72px] mx-auto rounded-full bg-[#101F32] text-2xl font-medium text-[#F7F5EF] active:bg-[#1D344D] active:scale-95 transition-all flex items-center justify-center shadow-sm"
      >0</button>
      <button onClick={onBackspace}
        className="w-[72px] h-[72px] mx-auto rounded-full bg-transparent border-2 border-[#D6B45C]/40 text-[#D6B45C] active:bg-[#D6B45C]/10 active:scale-95 transition-all flex items-center justify-center"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
          <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#050A12] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-8 pt-12">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#D6B45C]/10 flex items-center justify-center mb-4">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-12 h-12 object-contain" />
        </div>

        {forgotStep === 'none' ? (
          <>
            <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
              Enter Passcode
            </h2>
            <p className="text-sm text-[#A6B2C2]/70 text-center mb-8 max-w-[260px]">
              This is the code you'll use to unlock your Vlocker. Kept it safe
            </p>
          </>
        ) : forgotStep === 'verifyQuestions' ? (
          <>
            <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
              Verify Identity
            </h2>
            <p className="text-sm text-[#A6B2C2]/70 text-center mb-6 max-w-[260px]">
              Answer your security questions to reset PIN
            </p>
          </>
        ) : forgotStep === 'createPin' ? (
          <>
            <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
              Create New PIN
            </h2>
            <p className="text-sm text-[#A6B2C2]/70 text-center mb-8 max-w-[260px]">
              Set a new 6-digit PIN
            </p>
          </>
        ) : forgotStep === 'confirmPin' ? (
          <>
            <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
              Confirm New PIN
            </h2>
            <p className="text-sm text-[#A6B2C2]/70 text-center mb-8 max-w-[260px]">
              Re-enter your new PIN
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
              Reset PIN
            </h2>
            <p className="text-sm text-[#A6B2C2]/70 text-center mb-6 max-w-[260px]">
              No security questions found
            </p>
          </>
        )}

        {error && (
          <p className="text-xs text-[#E98B8B] mb-4 text-center animate-fade-in">{error}</p>
        )}

        {forgotStep === 'none' ? (
          <>
            {isLocked ? (
              <div className="flex flex-col items-center gap-4 my-6">
                <div className="w-16 h-16 rounded-full bg-[#3A2427] flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-[#E98B8B]" />
                </div>
                <p className="text-lg font-bold text-[#E98B8B]">
                  {Math.floor(lockoutTime / 60)}:{String(lockoutTime % 60).padStart(2, '0')}
                </p>
                <p className="text-sm text-[#A6B2C2] text-center">
                  Too many attempts.<br />Wait before trying again.
                </p>
              </div>
            ) : (
              <>
                {renderPinDots(pin)}

                {renderKeypad(handlePinInput, handleBackspace)}
              </>
            )}

            {!isLocked && (
              <button onClick={handleStartForgot}
                className="text-sm text-[#A6B2C2]/70 hover:text-[#D6B45C] transition-colors mt-4"
              >
                Forgot PIN?
              </button>
            )}
          </>
        ) : forgotStep === 'verifyQuestions' ? (
          <div className="w-full max-w-md space-y-4">
            {savedQuestions && [0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-sm text-[#A6B2C2] font-medium">
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
                  className="w-full p-3.5 rounded-xl bg-[#050A12] border border-[#1D344D]/50 text-sm text-[#F7F5EF] placeholder:text-[#667487] focus:border-[#D6B45C]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCancelForgot}
                className="flex-1 py-3 rounded-2xl bg-[#1D344D] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button onClick={handleVerifyAnswers}
                className="flex-1 py-3 rounded-2xl bg-[#D6B45C] text-[#081321] text-sm font-medium active:scale-95 transition-transform"
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
              className="text-sm text-[#A6B2C2] hover:text-[#D6B45C] transition-colors mt-2"
            >
              Cancel
            </button>
          </>
        ) : forgotStep === 'confirmPin' ? (
          <>
            {renderPinDots(confirmNewPin)}
            {renderKeypad(handleConfirmNewPinInput, handleConfirmNewPinBackspace)}
            <button onClick={handleCancelForgot}
              className="text-sm text-[#A6B2C2] hover:text-[#D6B45C] transition-colors mt-2"
            >
              Cancel
            </button>
          </>
        ) : forgotStep === 'legacyReset' ? (
          <div className="w-full max-w-md space-y-4">
            <div className="p-4 rounded-2xl bg-[#3A2427] border border-[#D66A6A]">
              <p className="text-sm text-[#A6B2C2] mb-2">
                You haven't set up security questions. To reset your PIN, all locker data must be wiped.
              </p>
              <p className="text-sm text-[#E98B8B]">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancelForgot}
                className="flex-1 py-3 rounded-2xl bg-[#1D344D] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button onClick={handleWipeData}
                className="flex-1 py-3 rounded-2xl bg-[#D66A6A] text-[#F7F5EF] text-sm font-medium active:scale-95 transition-transform"
              >
                Wipe & Reset
              </button>
            </div>
          </div>
        ) : null}

      </div>

      {/* Privacy Note */}
      <div className="pb-6 pt-2 flex justify-center">
        <div className="flex items-center gap-1.5 text-[10px] text-[#5ED6A5]/80 bg-[#123D32]/60 px-3 py-1.5 rounded-full border border-[#36B37E]/30">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <span>Your data stays on your device - private and secure</span>
        </div>
      </div>
    </div>
  );
}
