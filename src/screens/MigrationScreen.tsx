import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { migrateExistingPhotos } from '@/utils/photoStorage';
import { Shield, Lock } from 'lucide-react';

export default function MigrationScreen() {
  const { navigate, showAlert } = useApp();
  const [status, setStatus] = useState<'checking' | 'migrating' | 'done' | 'error'>('checking');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const runMigration = async () => {
      try {
        setStatus('migrating');
        const result = await migrateExistingPhotos();
        setCount(result.migrated);
        setStatus('done');

        // Short delay to show completion
        setTimeout(() => {
          navigate('auth');
        }, 1500);
      } catch (err) {
        console.error('Migration failed:', err);
        setStatus('error');
        showAlert('Photo migration failed. Please restart the app.', 'error');
      }
    };

    runMigration();
  }, [navigate, showAlert]);

  return (
    <div className="h-full w-full bg-[#050A12] flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Subtle radial glow */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#D6B45C]/5 blur-3xl" />

      {/* Icon */}
      <div className="relative z-10 mb-8">
        <div className="w-20 h-20 rounded-2xl bg-[#0B1525] border border-[#1D344D]/50 flex items-center justify-center">
          <Shield className="w-10 h-10 text-[#D6B45C]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-[#F7F5EF] mb-3 relative z-10 text-center">
        Securing Your Photos
      </h1>

      {/* Description */}
      <p className="text-sm text-[#A6B2C2]/80 mb-10 relative z-10 text-center max-w-xs">
        {status === 'checking' && 'Checking your photos...'}
        {status === 'migrating' && 'Encrypting your photos with AES-256-GCM...'}
        {status === 'done' && `Secured ${count} photo${count !== 1 ? 's' : ''} successfully!`}
        {status === 'error' && 'Something went wrong. Please restart the app.'}
      </p>

      {/* Progress indicator */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {status === 'migrating' && (
          <>
            <div className="w-48 h-1.5 bg-[#1D344D]/50 rounded-full overflow-hidden">
              <div className="h-full bg-[#D6B45C] rounded-full animate-pulse w-full" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[#A6B2C2]/60">
              <Lock className="w-4 h-4" />
              <span>One-time encryption in progress...</span>
            </div>
          </>
        )}

        {status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-[#5ED6A5]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>All photos are now encrypted</span>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('auth')}
            className="px-6 py-3 rounded-xl bg-[#D6B45C] text-[#081321] font-semibold text-sm"
          >
            Continue Anyway
          </button>
        )}
      </div>
    </div>
  );
}
