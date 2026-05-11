import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ScreenName } from '@/types';
import { SecureStore, setSessionActive } from '@/utils/storage';

interface AppContextType {
  screen: ScreenName;
  prevScreen: ScreenName | null;
  selectedItemId: string | null;
  isAuthenticated: boolean;
  hasPin: boolean;
  navigate: (screen: ScreenName, itemId?: string) => void;
  goBack: () => void;
  setAuthenticated: (val: boolean) => void;
  checkPinExists: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [prevScreen, setPrevScreen] = useState<ScreenName | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkPinExists = useCallback(async () => {
    const pin = await SecureStore.getItemAsync('pin');
    setHasPin(!!pin);
  }, []);

  // Check session on mount - require PIN every time app opens
  useEffect(() => {
    const init = async () => {
      await checkPinExists();
      // Always require auth on app start - session doesn't persist across app restarts
      setIsAuthenticated(false);
    };
    init();
  }, [checkPinExists]);

  // Keep session active while app is in use
  const refreshSession = useCallback(async () => {
    await setSessionActive(true);
  }, []);

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      refreshSession();
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
      sessionTimerRef.current = setTimeout(async () => {
        // Session expired - force logout
        setIsAuthenticated(false);
        setScreen('auth');
      }, 5 * 60 * 1000); // 5 minutes
    };

    resetTimer();
    // Reset timer on user activity
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);

    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [isAuthenticated, refreshSession]);

  const navigate = useCallback((newScreen: ScreenName, itemId?: string) => {
    setPrevScreen(screen);
    setScreen(newScreen);
    if (itemId !== undefined) {
      setSelectedItemId(itemId);
    }
  }, [screen]);

  const goBack = useCallback(() => {
    if (prevScreen) {
      setScreen(prevScreen);
      setPrevScreen(null);
    } else {
      setScreen('home');
    }
  }, [prevScreen]);

  const setAuthenticated = useCallback((val: boolean) => {
    setIsAuthenticated(val);
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    setScreen('auth');
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        prevScreen,
        selectedItemId,
        isAuthenticated,
        hasPin,
        navigate,
        goBack,
        setAuthenticated,
        checkPinExists,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
