import { useEffect } from 'react';
import { Shield } from 'lucide-react';
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
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#D6B45C] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#1D344D] blur-[80px]" />
      </div>

      {/* Vault rings animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[280px] h-[280px] rounded-full border border-[#D6B45C]/10 animate-spin-slow" />
        <div className="absolute w-[240px] h-[240px] rounded-full border border-[#D6B45C]/15 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
        <div className="absolute w-[320px] h-[320px] rounded-full border border-[#D6B45C]/5" />
      </div>

      {/* Logo with App Icon */}
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#D6B45C]/20 to-[#D6B45C]/5 border border-[#D6B45C]/30 flex items-center justify-center mb-6 animate-float gold-border-glow overflow-hidden">
          <img src="/vlocker-icon.png" alt={APP_NAME} className="w-24 h-24 object-contain" />
        </div>

        <h1
          className="text-3xl font-bold tracking-tight gold-text-gradient"
         
        >
          {APP_NAME}
        </h1>

        <p className="mt-3 text-sm text-[#D6B45C]/80 tracking-wider font-medium">
          Know what's inside your locker
        </p>

        {/* Loading dots */}
        <div className="flex gap-2 mt-10">
          <div className="w-2 h-2 rounded-full bg-[#D6B45C] animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#D6B45C] animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#D6B45C] animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>

      {/* Bottom: Privacy Note */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 px-6">
        <div className="flex items-center gap-1.5 text-[10px] text-[#5ED6A5]/80 bg-[#123D32] px-3 py-1 rounded-full border border-[#36B37E]">
          <Shield className="w-3 h-3" />
          <span>Your data stays on your device - private and secure</span>
        </div>
        <span className="text-[10px] text-[#A6B2C2]/40">v2.5.3</span>
      </div>
    </div>
  );
}
