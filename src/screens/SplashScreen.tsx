import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SecureStore } from '@/utils/storage';
import { APP_NAME } from '@/types';

export default function SplashScreen() {
  const { navigate, isAuthenticated } = useApp();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isAuthenticated) {
        navigate('home');
        return;
      }
      const pin = await SecureStore.getItemAsync('pin');
      if (pin) {
        navigate('auth');
      } else {
        navigate('setup');
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  return (
    <div className="h-full flex flex-col items-center justify-center vault-gradient relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#C9A84C] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#1A3A5C] blur-[80px]" />
      </div>

      {/* Vault rings animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[280px] h-[280px] rounded-full border border-[#C9A84C]/10 animate-spin-slow" />
        <div className="absolute w-[240px] h-[240px] rounded-full border border-[#C9A84C]/15 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
        <div className="absolute w-[320px] h-[320px] rounded-full border border-[#C9A84C]/5" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 flex items-center justify-center mb-6 animate-float gold-border-glow">
          <Lock className="w-12 h-12 text-[#C9A84C]" strokeWidth={1.5} />
        </div>

        <h1
          className="text-3xl font-bold tracking-tight gold-text-gradient"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {APP_NAME}
        </h1>

        <p className="mt-3 text-sm text-[#8A94A6] tracking-widest uppercase">
          Your locker, documented.
        </p>

        {/* Loading dots */}
        <div className="flex gap-2 mt-10">
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>

      {/* Bottom version */}
      <div className="absolute bottom-8 text-xs text-[#8A94A6]/50">
        Secure Local Storage
      </div>
    </div>
  );
}
