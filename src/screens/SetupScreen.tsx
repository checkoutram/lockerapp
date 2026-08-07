import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Shield, ChevronDown, Check } from 'lucide-react';
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDropdown !== null) {
        const ref = dropdownRefs.current[showDropdown];
        if (ref && !ref.contains(e.target as Node)) {
          setShowDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const renderPinDots = () => (
    <div className={`flex items-center gap-3 mb-6 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={i < (step === 'create' ? createPin.length : confirmPin.length) ? 'pin-dot-filled' : 'pin-dot-empty'} />
      ))}
    </div>
  );

  const renderKeypad = () => (
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
  );

  return (
    <div className="h-full flex flex-col items-center justify-center vault-gradient relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#C9A84C] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-[#1A3A5C] blur-[80px]" />
      </div>

      <div className={`relative z-10 flex flex-col items-center px-6 transition-all duration-500 ${fadeOut ? 'opacity-0 scale-95' : 'opacity-100'} w-full max-w-md`}>
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-5 gold-border-glow overflow-hidden">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-16 h-16 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          {step === 'create' ? 'Secure Your Locker' : step === 'confirm' ? 'Confirm PIN' : 'Recovery Questions'}
        </h2>
        <p className="text-sm text-[#C9A84C]/70 mb-1 font-medium tracking-wide">
          Know What Your Locker Holds.
        </p>
        <p className="text-sm text-[#8A94A6] mb-8 text-center">
          {step === 'create' ? 'Create a 4-6 digit PIN to protect your items' : step === 'confirm' ? 'Re-enter your PIN to confirm' : 'Set 3 questions for PIN recovery'}
        </p>

        {step === 'secretQuestions' ? (
          <div className="w-full space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#C9A84C]/40" />
              <div className="w-2 h-2 rounded-full bg-[#C9A84C]/40" />
              <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
            </div>

            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <label className="text-xs text-[#8A94A6] font-medium">Question {idx + 1}</label>
                <div className="relative" ref={(el) => { dropdownRefs.current[idx] = el; }}>
                  <button
                    onClick={() => setShowDropdown(showDropdown === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#111D2E] border border-[#1A3A5C] text-sm text-white text-left active:border-[#C9A84C]/50 transition-colors"
                  >
                    <span className="truncate pr-2">{SECRET_QUESTIONS[selectedQuestions[idx]]}</span>
                    <ChevronDown className={`w-4 h-4 text-[#8A94A6] flex-shrink-0 transition-transform ${showDropdown === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {showDropdown === idx && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#111D2E] border border-[#1A3A5C] shadow-lg">
                      {SECRET_QUESTIONS.map((q, qIdx) => {
                        const isSelected = selectedQuestions[idx] === qIdx;
                        const isUsed = selectedQuestions.includes(qIdx) && selectedQuestions[idx] !== qIdx;
                        return (
                          <button
                            key={qIdx}
                            onClick={() => !isUsed && handleQuestionSelect(idx, qIdx)}
                            disabled={isUsed}
                            className={`w-full flex items-center justify-between p-3 text-left text-sm transition-colors ${
                              isSelected ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : isUsed ? 'text-[#8A94A6]/40 cursor-not-allowed' : 'text-white hover:bg-[#1A3A5C]'
                            }`}
                          >
                            <span className="truncate pr-2">{q}</span>
                            {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={answers[idx]}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  placeholder={`Answer for question ${idx + 1}`}
                  className="w-full p-3 rounded-xl bg-[#111D2E] border border-[#1A3A5C] text-sm text-white placeholder:text-[#8A94A6]/50 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-400 text-center animate-fade-in">{error}</p>
            )}

            <button
              onClick={handleSaveSecretQuestions}
              className="w-full py-3.5 rounded-2xl bg-[#C9A84C] text-[#0A1628] font-semibold text-sm active:bg-[#B8983F] active:scale-95 transition-all mt-2"
            >
              Save & Secure My Locker
            </button>
          </div>
        ) : (
          <>
            {renderPinDots()}

            {error && (
              <p className="text-xs text-red-400 mb-4 text-center animate-fade-in">{error}</p>
            )}

            {renderKeypad()}
          </>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mb-4">
          <Shield className="w-3 h-3" />
          <span>Your data stays on your device - completely private &amp; secure</span>
        </div>
      </div>
    </div>
  );
}
