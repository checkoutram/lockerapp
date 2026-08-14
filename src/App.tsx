import { useEffect, useState, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppProvider, useApp } from '@/context/AppContext';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import SplashScreen from '@/screens/SplashScreen';
import SetupScreen from '@/screens/SetupScreen';
import AuthScreen from '@/screens/AuthScreen';
import LockerListScreen from '@/screens/LockerListScreen';
import LockerDetailScreen from '@/screens/LockerDetailScreen';
import AddItemScreen from '@/screens/AddItemScreen';
import ItemDetailScreen from '@/screens/ItemDetailScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ManageLockersScreen from '@/screens/ManageLockersScreen';

function ScreenRouter() {
  const { screen } = useApp();

  switch (screen) {
    case 'splash':
      return <SplashScreen />;
    case 'setup':
      return <SetupScreen />;
    case 'auth':
      return <AuthScreen />;
    case 'home':
      return <LockerListScreen />;
    case 'lockerList':
      return <LockerListScreen />;
    case 'lockerDetail':
      return <LockerDetailScreen />;
    case 'addItem':
      return <AddItemScreen />;
    case 'itemDetail':
      return <ItemDetailScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'manageLockers':
      return <ManageLockersScreen />;
    default:
      return <SplashScreen />;
  }
}

function AppStateMonitor() {
  const { isAuthenticated, setAuthenticated, navigate, screen, goBack } = useApp();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    let hiddenTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime && isAuthenticated) {
        const awayTime = Date.now() - hiddenTime;
        if (awayTime > 1800000 && screen !== 'auth' && screen !== 'setup' && screen !== 'splash') {
          setAuthenticated(false);
          navigate('auth');
        }
        hiddenTime = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, setAuthenticated, navigate, screen]);

  // Hardware back button handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = () => {
      if (showExitConfirm) {
        setShowExitConfirm(false);
        return;
      }

      switch (screen) {
        case 'lockerList':
        case 'home':
          setShowExitConfirm(true);
          break;
        case 'lockerDetail':
          navigate('lockerList');
          break;
        case 'itemDetail':
        case 'addItem':
        case 'settings':
        case 'manageLockers':
          goBack();
          break;
        default:
          // For auth, setup, splash - let system handle it
          break;
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then(l => l.remove());
    };
  }, [screen, navigate, goBack, showExitConfirm]);

  const handleExitApp = useCallback(() => {
    CapacitorApp.exitApp();
  }, []);

  return (
    <>
      {/* Exit Confirmation Overlay */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#1D344D]/50 text-center">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Exit App?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">Are you sure you want to close Vlocker?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#14263B] text-[#F7F5EF] font-medium text-sm active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleExitApp}
                className="flex-1 py-3 rounded-xl bg-[#E98B8B]/20 text-[#E98B8B] font-medium text-sm border border-[#E98B8B]/30 active:scale-95 transition-transform"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AlertsOverlay() {
  const { alerts, dismissAlert } = useApp();
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top fade-in duration-300 ${
            alert.type === 'success'
              ? 'bg-emerald-500/90 text-[#F7F5EF]'
              : alert.type === 'error'
              ? 'bg-red-500/90 text-[#F7F5EF]'
              : 'bg-[#1D344D]/90 text-[#F7F5EF] border border-[#D6B45C]/30'
          }`}
        >
          {alert.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {alert.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {alert.type === 'info' && <Info className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{alert.message}</span>
          <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AppContent() {
  return (
    <>
      <AppStateMonitor />
      <AlertsOverlay />
      <ScreenRouter />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full bg-[#050A12] flex items-center justify-center p-0 md:p-4">
        <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-[#081321] md:rounded-[40px] overflow-hidden shadow-2xl shadow-black/50 relative isolate border border-[#1D344D]/30 md:border-[#1D344D]/50">
          <AppContent />
        </div>
      </div>
    </AppProvider>
  );
}
