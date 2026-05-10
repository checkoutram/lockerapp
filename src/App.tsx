import { useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import SplashScreen from '@/screens/SplashScreen';
import SetupScreen from '@/screens/SetupScreen';
import AuthScreen from '@/screens/AuthScreen';
import HomeScreen from '@/screens/HomeScreen';
import AddItemScreen from '@/screens/AddItemScreen';
import ItemDetailScreen from '@/screens/ItemDetailScreen';
import SettingsScreen from '@/screens/SettingsScreen';

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
      return <HomeScreen />;
    case 'addItem':
      return <AddItemScreen />;
    case 'itemDetail':
      return <ItemDetailScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <SplashScreen />;
  }
}

// App state monitoring (simulates AppState API for auto-lock)
function AppStateMonitor() {
  const { isAuthenticated, setAuthenticated, navigate, screen } = useApp();

  useEffect(() => {
    let hiddenTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime && isAuthenticated) {
        const awayTime = Date.now() - hiddenTime;
        // Lock if away for more than 30 minutes (1800000ms)
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

  return null;
}

function AppContent() {
  return (
    <>
      <AppStateMonitor />
      <ScreenRouter />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full bg-[#050A12] flex items-center justify-center p-0 md:p-4">
        {/* Mobile frame container */}
        <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-[#0A1628] md:rounded-[40px] overflow-hidden shadow-2xl shadow-black/50 relative isolate border border-[#1A3A5C]/30 md:border-[#1A3A5C]/50">
          <AppContent />
        </div>
      </div>
    </AppProvider>
  );
}
