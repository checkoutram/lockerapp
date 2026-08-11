import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function SplashScreen() {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('auth');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-full w-full bg-[#050A12] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle radial glow behind icon */}
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#D6B45C]/5 blur-3xl" />
      
      {/* vLocker Icon */}
      <div className="relative z-10 mb-6">
        <img
          src="/vlocker-icon.png"
          alt="Vlocker"
          className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(214,180,92,0.3)]"
        />
      </div>

      {/* Brand Name */}
      <h1 className="text-4xl font-bold text-[#F7F5EF] tracking-tight mb-3 relative z-10">
        Vlocker
      </h1>

      {/* Tagline */}
      <p className="text-base text-[#A6B2C2]/80 mb-12 relative z-10">
        Know what is inside your bank locker
      </p>

      {/* Gold Spinner */}
      <div className="relative z-10 mb-4">
        <div className="w-8 h-8 border-2 border-[#D6B45C]/20 border-t-[#D6B45C] rounded-full animate-spin" />
      </div>

      {/* Loading text */}
      <p className="text-sm text-[#A6B2C2]/60 relative z-10">
        Loading...
      </p>
    </div>
  );
}
