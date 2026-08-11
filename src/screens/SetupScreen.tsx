import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, ChevronDown, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore, saveSecretQuestions } from '@/utils/storage';
import { digestStringAsync } from '@/utils/crypto';
import { APP_NAME, SECRET_QUESTIONS } from '@/types';

type SetupStep = 'create' | 'confirm' | 'secretQuestions';

export default function SetupScreen() {
  const { navigate, setAuthenticated } = useApp();
  const [step, setStep] = useState<SetupStep>('create');
  const [createPin, setCreatePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Secret questions state
  const [selectedQuestions, setSelectedQuestions] = useState<[number, number, number]>([0, 1, 2]);
  const [answers, setAnswers] = useState(['', '', '']);
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [pinToSave, setPinToSave] = useState('');

  const createRef = useRef('');
  const confirmRef = useRef('');
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);

  const handlePinInput = useCallback((value: string) => {
    setError('');
    if (step === 'create') {
      if (createRef.current.length < 6) {
        const newPin = createRef.current + value;
        createRef.current = newPin;
        setCreatePin(newPin);
      }
    } else if (step === 'confirm') {
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
    } else if (step === 'confirm') {
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
      setConfirmPin('');
      confirmRef.current = '';
      return;
    }

    if (step === 'confirm') {
      if (confirmRef.current !== createRef.current) {
        setError('PINs do not match. Try again.');
        confirmRef.current = '';
        setConfirmPin('');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      setPinToSave(createRef.current);
      setStep('secretQuestions');
      return;
    }
  }, [step]);

  // Auto-advance confirm PIN
  useEffect(() => {
    if (step === 'confirm' && confirmRef.current.length >= 4 && confirmRef.current.length === createRef.current.length) {
      handleNext();
    }
  }, [confirmPin, step, handleNext]);

  const handleSaveSecretQuestions = useCallback(async () => {
    // Validate all 3 questions selected and all 3 answers filled
    for (let i = 0; i < 3; i++) {
      if (!answers[i].trim()) {
        setError(`Please answer secret question ${i + 1}`);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
    }

    // Check for duplicate questions
    const qSet = new Set(selectedQuestions);
    if (qSet.size !== 3) {
      setError('Please select 3 different questions');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Hash answers and save
    const hash1 = await digestStringAsync('SHA-256', answers[0].trim().toLowerCase());
    const hash2 = await digestStringAsync('SHA-256', answers[1].trim().toLowerCase());
    const hash3 = await digestStringAsync('SHA-256', answers[2].trim().toLowerCase());

    await saveSecretQuestions({
      question1: SECRET_QUESTIONS[selectedQuestions[0]],
      answer1: hash1,
      question2: SECRET_QUESTIONS[selectedQuestions[1]],
      answer2: hash2,
      question3: SECRET_QUESTIONS[selectedQuestions[2]],
      answer3: hash3,
    });

    // Save PIN
    const pinHash = await digestStringAsync('SHA-256', pinToSave);
    await SecureStore.setItemAsync('pin', pinHash);

    setFadeOut(true);
    setTimeout(() => {
      setAuthenticated(true);
      navigate('home');
    }, 600);
  }, [answers, selectedQuestions, pinToSave, navigate, setAuthenticated]);

  const handleAnswerChange = (index: number, value: string) => {
    setError('');
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleQuestionSelect = (qIndex: number, questionIdx: number) => {
    setError('');
    const newSelected = [...selectedQuestions] as [number, number, number];
    newSelected[qIndex] = questionIdx;
    setSelectedQuestions(newSelected);
    setShowDropdown(null);
  };

  // Close dropdown when clicking/tapping outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (showDropdown !== null) {
        const ref = dropdownRefs.current[showDropdown];
        if (ref && !ref.contains(e.target as Node)) {
          setShowDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown]);

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const renderPinDots = () => (
    <div className={`flex items-center gap-4 mb-8 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-200 ${
            i < (step === 'create' ? createPin.length : confirmPin.length)
              ? 'bg-[#D6B45C] shadow-[0_0_8px_rgba(214,180,92,0.5)]'
              : 'bg-transparent border-2 border-[#D6B45C]/40'
          }`}
        />
      ))}
    </div>
  );

  const renderKeypad = () => (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[300px] mb-6">
      {keypadNumbers.map((num) => (
        <button key={num} onClick={() => handlePinInput(num)}
          className="w-[72px] h-[72px] mx-auto rounded-full bg-[#101F32] text-2xl font-medium text-[#F7F5EF] active:bg-[#1D344D] active:scale-95 transition-all flex items-center justify-center shadow-sm"
        >{num}</button>
      ))}
      <div className="w-[72px] h-[72px]" />
      <button onClick={() => handlePinInput('0')}
        className="w-[72px] h-[72px] mx-auto rounded-full bg-[#101F32] text-2xl font-medium text-[#F7F5EF] active:bg-[#1D344D] active:scale-95 transition-all flex items-center justify-center shadow-sm"
      >0</button>
      <button onClick={handleBackspace}
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
    <div className={`h-full w-full bg-[#050A12] flex flex-col relative transition-all duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex-1 flex flex-col items-center px-6 pt-12 w-full max-w-md mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#D6B45C]/10 flex items-center justify-center mb-4">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-12 h-12 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-[#F7F5EF] mb-2">
          {step === 'create' ? 'Set Passcode' : step === 'confirm' ? 'Confirm Passcode' : 'Recovery Questions'}
        </h2>
        <p className="text-sm text-[#A6B2C2]/70 mb-1 text-center max-w-[260px]">
          {step === 'create'
            ? "This is the code you'll use to unlock your Vlocker. Kept it safe"
            : step === 'confirm'
            ? 'Re-enter your passcode to confirm'
            : 'Set 3 questions to recover your passcode'}
        </p>

        {step === 'secretQuestions' ? (
          <div className="w-full space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#D6B45C]/40" />
              <div className="w-2 h-2 rounded-full bg-[#D6B45C]/40" />
              <div className="w-2 h-2 rounded-full bg-[#D6B45C]" />
            </div>

            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-xs text-[#A6B2C2] font-medium">Question {idx + 1}</label>
                <div className="relative" ref={(el) => { dropdownRefs.current[idx] = el; }}>
                  <button
                    onClick={() => setShowDropdown(showDropdown === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#050A12] border border-[#1D344D]/50 text-sm text-[#F7F5EF] text-left active:border-[#D6B45C]/50 transition-colors"
                  >
                    <span className="pr-2 leading-snug">{SECRET_QUESTIONS[selectedQuestions[idx]]}</span>
                    <ChevronDown className={`w-4 h-4 text-[#A6B2C2] flex-shrink-0 transition-transform ${showDropdown === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {showDropdown === idx && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#0B1525] border border-[#1D344D]/50 shadow-lg">
                      {SECRET_QUESTIONS.map((q, qIdx) => {
                        const isSelected = selectedQuestions[idx] === qIdx;
                        const isUsed = selectedQuestions.includes(qIdx) && selectedQuestions[idx] !== qIdx;
                        return (
                          <button
                            key={qIdx}
                            onClick={() => !isUsed && handleQuestionSelect(idx, qIdx)}
                            disabled={isUsed}
                            className={`w-full flex items-start justify-between p-3 text-left text-sm transition-colors ${
                              isSelected ? 'bg-[#D6B45C]/20 text-[#D6B45C]' : isUsed ? 'text-[#A6B2C2]/40 cursor-not-allowed' : 'text-[#F7F5EF] hover:bg-[#1D344D]'
                            }`}
                          >
                            <span className="pr-2 leading-snug">{q}</span>
                            {isSelected && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  autoCorrect="off"
                  value={answers[idx]}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  placeholder={`Answer for question ${idx + 1}`}
                  className="w-full p-3.5 rounded-xl bg-[#050A12] border border-[#1D344D]/50 text-sm text-[#F7F5EF] placeholder:text-[#667487] focus:border-[#D6B45C]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-[#E98B8B] text-center animate-fade-in">{error}</p>
            )}

            <button
              onClick={handleSaveSecretQuestions}
              className="w-full py-4 rounded-2xl bg-[#D6B45C] text-[#081321] font-semibold text-sm active:bg-[#B8983F] active:scale-95 transition-all mt-2"
            >
              Save & Secure My Locker
            </button>
          </div>
        ) : (
          <>
            {renderPinDots()}

            {error && (
              <p className="text-xs text-[#E98B8B] mb-4 text-center animate-fade-in">{error}</p>
            )}

            {renderKeypad()}
          </>
        )}

      </div>

      {/* Privacy Note */}
      <div className="pb-6 pt-2 flex justify-center">
        <div className="flex items-center gap-1.5 text-[10px] text-[#5ED6A5]/80 bg-[#123D32]/60 px-3 py-1.5 rounded-full border border-[#36B37E]/30">
          <Shield className="w-3 h-3" />
          <span>Your data stays on your device - private and secure</span>
        </div>
      </div>
    </div>
  );
}
